/**
 * Markdown 处理器 - 使用 Quartz 转换器
 * 整合了 Obsidian Flavored Markdown 和链接处理功能
 */

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import {
  createOFMPlugins,
  preprocessMarkdown,
  type OFMOptions,
} from './quartz/transformers/ofm';
import {
  createLinksPlugin,
  extractLinks,
  type LinksOptions,
} from './quartz/transformers/links';
import type { FullSlug, SimpleSlug } from './quartz/util/path';
import { slugifyFilePath, simplifySlug } from './quartz/util/path';

export interface WikiLink {
  value: string;
  data: {
    permalink: string;
    exists: boolean;
  };
}

export interface ProcessedContent {
  html: string;
  frontmatter: Record<string, any>;
  wikiLinks: WikiLink[];
  tags: string[];
  readingTime: string;
  excerpt: string;
  links: SimpleSlug[]; // 所有出站链接
}

export interface ProcessorOptions {
  /** Obsidian Flavored Markdown 选项 */
  ofm?: Partial<OFMOptions>;
  /** 链接处理选项 */
  links?: Partial<LinksOptions>;
  /** 所有文章的 slugs（用于链接验证） */
  allSlugs?: FullSlug[];
  /** 当前文章的 slug */
  currentSlug?: FullSlug;
}

/**
 * 处理 Markdown 内容
 * @param content - 原始 Markdown 内容
 * @param options - 处理选项
 * @param resolvePath - 解析链接是否存在的函数（已废弃，使用 allSlugs 代替）
 */
export async function processMarkdown(
  content: string,
  options: ProcessorOptions = {},
  resolvePath?: (permalink: string) => Promise<boolean>
): Promise<ProcessedContent> {
  // 解析 frontmatter
  const { data: frontmatter, content: markdownContent } = matter(content);

  // 默认选项
  const ofmOptions: Partial<OFMOptions> = {
    wikilinks: true,
    callouts: true,
    mermaid: true,
    parseTags: true,
    highlight: true,
    comments: true,
    parseArrows: true,
    enableYouTubeEmbed: true,
    enableVideoEmbed: true,
    disableBrokenWikilinks: false,
    ...options.ofm,
  };

  const linksOptions: Partial<LinksOptions> = {
    markdownLinkResolution: 'shortest',
    prettyLinks: true,
    openLinksInNewTab: false,
    externalLinkIcon: true,
    lazyLoad: true,
    ...options.links,
  };

  const allSlugs = options.allSlugs || [];
  const currentSlug = options.currentSlug || ('' as FullSlug);

  // 确保内容存在
  if (!markdownContent) {
    return {
      html: '',
      frontmatter,
      wikiLinks: [],
      tags: [],
      readingTime: '0 min read',
      excerpt: '',
      links: [],
    };
  }

  // 预处理 Markdown（移除注释、规范化 wikilinks 等）
  let processedContent = preprocessMarkdown(markdownContent, ofmOptions);

  // 创建 Quartz 插件
  const { markdownPlugins, htmlPlugins } = createOFMPlugins(
    ofmOptions,
    allSlugs,
    currentSlug
  );

  const linksPlugin = createLinksPlugin(linksOptions, allSlugs, currentSlug);

  // 创建 unified 处理器
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm);

  // 添加 OFM Markdown 插件
  for (const plugin of markdownPlugins) {
    processor.use(plugin);
  }

  // 添加链接处理插件和转换到 HTML
  processor
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(linksPlugin);

  // 添加 OFM HTML 插件
  for (const plugin of htmlPlugins) {
    processor.use(plugin);
  }

  // 添加 HTML 字符串化
  processor.use(rehypeStringify, { allowDangerousHtml: true });

  // 处理内容
  const result = await processor.process(processedContent);
  const html = String(result);

  // 提取标签
  const tags: string[] = [];

  // 从 frontmatter 提取标签
  if (frontmatter.tags) {
    if (Array.isArray(frontmatter.tags)) {
      tags.push(...frontmatter.tags);
    } else if (typeof frontmatter.tags === 'string') {
      tags.push(...frontmatter.tags.split(',').map((t) => t.trim()));
    }
  }

  // 从 result.data.frontmatter 获取解析过程中提取的标签（来自 #tag）
  if (result.data.frontmatter && (result.data.frontmatter as any).tags) {
    const parsedTags = (result.data.frontmatter as any).tags;
    if (Array.isArray(parsedTags)) {
      for (const tag of parsedTags) {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      }
    }
  }

  // 提取 Wiki 链接
  const wikiLinks: WikiLink[] = [];
  const rawLinks = extractLinks(markdownContent);

  for (const link of rawLinks) {
    const slug = link.toLowerCase().replace(/\s+/g, '-');
    const exists = allSlugs.length > 0 ? allSlugs.includes(slug as FullSlug) : true;

    // 兼容旧的 resolvePath API
    const finalExists = resolvePath ? await resolvePath(slug) : exists;

    wikiLinks.push({
      value: link,
      data: {
        permalink: slug,
        exists: finalExists,
      },
    });
  }

  // 获取出站链接
  const outgoingLinks = (result.data.links as SimpleSlug[]) || [];

  // 计算阅读时间
  const stats = readingTime(markdownContent);

  // 生成摘要
  let excerpt = frontmatter.excerpt || '';
  if (!excerpt) {
    const plainText = markdownContent
      .replace(/^---[\s\S]*?---/, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
      .replace(/[*_`]/g, '')
      .replace(/==([^=]+)==/g, '$1')
      .trim();

    excerpt = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
  }

  return {
    html,
    frontmatter: {
      ...frontmatter,
      tags, // 合并所有标签
    },
    wikiLinks,
    tags,
    readingTime: stats.text,
    excerpt,
    links: outgoingLinks,
  };
}

/**
 * 从 Markdown 内容中提取所有链接（用于预处理）
 * @param content - Markdown 内容
 * @returns 链接列表
 */
export function extractWikiLinks(content: string): string[] {
  return extractLinks(content);
}

/**
 * 生成文章 slug
 * @param title - 文章标题
 * @returns slug
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * 将文件名转换为 slug
 * @param filename - 文件名（含扩展名）
 * @returns slug
 */
export function filenameToSlug(filename: string): string {
  try {
    return slugifyFilePath(filename as any);
  } catch {
    // 降级到简单实现
    return filename
      .replace(/\.md$/, '')
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
