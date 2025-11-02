/**
 * Markdown 处理器 - 使用 Quartz 转换器
 * 整合了 Obsidian Flavored Markdown 和链接处理功能
 * 支持内容哈希缓存以提升性能
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
import { cache } from './cache';
import { cacheConfig } from '../config';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('MarkdownProcessor');

/**
 * 生成内容的哈希值（用于缓存键）
 */
function createContentHash(content: string, options: ProcessorOptions): string {
  // 使用简单的字符串拼接作为哈希输入
  // 注意：在生产环境可以考虑使用 crypto.createHash
  const cacheKey = JSON.stringify({
    content,
    options: {
      allSlugs: options.allSlugs?.length || 0,
      currentSlug: options.currentSlug || '',
      ofm: options.ofm ? Object.keys(options.ofm).sort().join(',') : '',
      links: options.links ? Object.keys(options.links).sort().join(',') : '',
    },
  });
  
  // 简单的哈希函数（对于缓存键足够）
  let hash = 0;
  for (let i = 0; i < cacheKey.length; i++) {
    const char = cacheKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为 32 位整数
  }
  
  return `markdown:${Math.abs(hash).toString(36)}`;
}

export interface WikiLink {
  value: string;
  data: {
    permalink: string;
    exists: boolean;
  };
}

export interface ProcessedContent {
  html: string;
  /** Frontmatter 数据，可以是任意类型的值 */
  frontmatter: Record<string, unknown>;
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
 * 
 * 将原始 Markdown 内容转换为 HTML，并提取 wiki 链接和标签。
 * 使用缓存机制提升重复处理相同内容的性能。
 * 
 * @param content - 原始 Markdown 内容
 * @param options - 处理选项，包括 OFM 和 Links 插件配置
 * @param resolvePath - 解析链接是否存在的函数（已废弃，使用 allSlugs 代替）
 * @returns 处理后的内容，包括 HTML、wiki 链接列表和标签列表
 * @throws {Error} 当处理失败时抛出错误
 * @example
 * ```typescript
 * const result = await processMarkdown('# 标题\n\n这是 [[其他文章]] 的内容。', {
 *   allSlugs: ['other-article'],
 *   currentSlug: 'current-article',
 * });
 * console.log(result.html); // 转换后的 HTML
 * console.log(result.wikiLinks); // wiki 链接列表
 * console.log(result.tags); // 标签列表
 * ```
 */
export async function processMarkdown(
  content: string,
  options: ProcessorOptions = {},
  resolvePath?: (permalink: string) => Promise<boolean>
): Promise<ProcessedContent> {
  // 检查缓存（基于内容哈希和选项）
  const cacheKey = createContentHash(content, options);
  const cached = cache.get<ProcessedContent>(cacheKey);
  
  if (cached) {
    logger.debug('Markdown cache hit');
    return cached;
  }
  
  logger.debug('Markdown cache miss, processing...');
  
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
    processor.use(plugin as any); // Type compatibility workaround
  }

  // 添加链接处理插件和转换到 HTML
  processor
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(linksPlugin as any);

  // 添加 OFM HTML 插件
  for (const plugin of htmlPlugins) {
    processor.use(plugin as any); // Type compatibility workaround
  }

  // 添加 HTML 字符串化
  processor.use(rehypeStringify, { allowDangerousHtml: true });

  // 处理内容
  const processed = await processor.process(processedContent);
  const html = String(processed);

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

  // 从 processed.data.frontmatter 获取解析过程中提取的标签（来自 #tag）
  const processedData = processed.data as { frontmatter?: { tags?: unknown } };
  const frontmatterTags = processedData.frontmatter?.tags;
  if (frontmatterTags && Array.isArray(frontmatterTags)) {
    for (const tag of frontmatterTags) {
      if (typeof tag === 'string' && !tags.includes(tag)) {
        tags.push(tag);
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
  const outgoingLinks = (processed.data.links as SimpleSlug[]) || [];

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

  const result: ProcessedContent = {
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
  
  // 写入缓存
  cache.set(cacheKey, result, cacheConfig.markdownTTL);
  logger.debug('Markdown processed and cached');
  
  return result;
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
 * 
 * 将文章标题转换为 URL 友好的 slug 格式：
 * - 转换为小写
 * - 保留中文字符、字母、数字和连字符
 * - 将空格转换为连字符
 * - 合并多个连续的连字符
 * 
 * @param title - 文章标题
 * @returns 生成的 slug
 * @example
 * ```typescript
 * generateSlug('Hello World! 你好'); // 'hello-world-你好'
 * generateSlug('  Test   Article  '); // 'test-article'
 * ```
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
 * 
 * 从文件名（包含扩展名）中提取并生成 slug。
 * 优先使用 Quartz 的 slugify 函数，失败时降级到简单实现。
 * 
 * @param filename - 文件名（含扩展名，例如 "my-article.md"）
 * @returns 生成的 slug（例如 "my-article"）
 * @example
 * ```typescript
 * filenameToSlug('my-article.md'); // 'my-article'
 * filenameToSlug('测试文章.md'); // '测试文章'
 * ```
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
