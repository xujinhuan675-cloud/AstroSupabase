/**
 * 从 Git 仓库的 content/ 目录导入 Markdown 文件到 Supabase
 * 用于 GitHub Actions 自动化部署
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { db } from '../src/db/client';
import { articles, articleTags, articleLinks } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSlug } from '../src/lib/markdown-processor';

interface ImportConfig {
  sourceDir: string;
  defaultAuthorId: string;
  defaultStatus: 'draft' | 'published';
  duplicateStrategy: 'skip' | 'update';
  importLinks: boolean;
  importTags: boolean;
}

interface ParsedArticle {
  filename: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  tags: string[];
  wikiLinks: string[];
  frontmatter: any;
}

const config: ImportConfig = {
  sourceDir: path.join(process.cwd(), 'content'),
  defaultAuthorId: process.env.DEFAULT_AUTHOR_ID || 'system',
  defaultStatus: 'published',
  duplicateStrategy: 'update',
  importLinks: true,
  importTags: true,
};

/**
 * 递归获取所有 Markdown 文件
 */
function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  目录不存在: ${dir}`);
    return files;
  }
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 提取 Wiki 链接 [[...]]
 */
function extractWikiLinks(content: string): string[] {
  const regex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const links: string[] = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].trim());
  }
  
  return links;
}

/**
 * 解析单个 Markdown 文件
 */
function parseMarkdownFile(filePath: string): ParsedArticle | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: markdownContent } = matter(content);
    
    // 获取标题
    const title = frontmatter.title || path.basename(filePath, '.md');
    
    // 生成 slug
    const slug = frontmatter.slug || generateSlug(title);
    
    // 提取标签
    let tags: string[] = [];
    if (frontmatter.tags) {
      if (Array.isArray(frontmatter.tags)) {
        tags = frontmatter.tags;
      } else if (typeof frontmatter.tags === 'string') {
        tags = frontmatter.tags.split(',').map(t => t.trim());
      }
    }
    
    // 从内容中提取 #标签
    const hashTagRegex = /#([a-zA-Z0-9_\u4e00-\u9fa5]+)/g;
    let match;
    while ((match = hashTagRegex.exec(markdownContent)) !== null) {
      const tag = match[1];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    // 提取 Wiki 链接
    const wikiLinks = extractWikiLinks(markdownContent);
    
    // 生成摘要
    const excerpt = frontmatter.excerpt || frontmatter.description || 
      markdownContent
        .replace(/^---[\s\S]*?---/, '')
        .replace(/#{1,6}\s/g, '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g, '$1')
        .replace(/[*_`]/g, '')
        .trim()
        .substring(0, 150);
    
    return {
      filename: path.basename(filePath),
      title,
      slug,
      content: markdownContent,
      excerpt,
      tags,
      wikiLinks,
      frontmatter,
    };
  } catch (error) {
    console.error(`❌ 解析文件失败: ${filePath}`, error);
    return null;
  }
}

/**
 * 导入单篇文章
 */
async function importArticle(parsed: ParsedArticle): Promise<number | null> {
  try {
    const now = new Date();
    const publishedAt = parsed.frontmatter.date 
      ? new Date(parsed.frontmatter.date) 
      : now;
    
    const frontmatterAuthor =
      typeof parsed.frontmatter.author === 'string'
        ? parsed.frontmatter.author.trim()
        : undefined;

    const articleData = {
      title: parsed.title,
      slug: parsed.slug,
      content: parsed.content,
      excerpt: parsed.excerpt,
      authorId: frontmatterAuthor && frontmatterAuthor.length > 0
        ? frontmatterAuthor
        : config.defaultAuthorId,
      status: config.defaultStatus,
      isDeleted: false,
      publishedAt,
      updatedAt: now,
    };
    
    // 检查是否已存在
    const existing = await db
      .select()
      .from(articles)
      .where(eq(articles.slug, parsed.slug))
      .limit(1);
    
    let articleId: number;
    
    if (existing.length > 0) {
      if (config.duplicateStrategy === 'update') {
        // 更新现有文章
        const updated = await db
          .update(articles)
          .set(articleData)
          .where(eq(articles.id, existing[0].id))
          .returning();
        
        articleId = updated[0].id;
        console.log(`  ✅ 更新: ${parsed.title} (ID: ${articleId})`);
      } else {
        console.log(`  ⏭️  跳过: ${parsed.title} (已存在)`);
        return existing[0].id;
      }
    } else {
      // 插入新文章
      const inserted = await db
        .insert(articles)
        .values({ ...articleData, createdAt: now })
        .returning();
      
      articleId = inserted[0].id;
      console.log(`  ✅ 新建: ${parsed.title} (ID: ${articleId})`);
    }
    
    // 导入标签
    if (config.importTags && parsed.tags.length > 0) {
      // 删除旧标签
      await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
      
      // 插入新标签
      for (const tag of parsed.tags) {
        await db.insert(articleTags).values({
          articleId,
          tag,
        });
      }
      console.log(`    📎 标签: ${parsed.tags.join(', ')}`);
    }
    
    return articleId;
  } catch (error) {
    console.error(`❌ 导入文章失败: ${parsed.title}`, error);
    return null;
  }
}

/**
 * 处理文章间的链接关系
 */
async function processLinks(
  articleMap: Map<string, number>,
  linkMap: Map<number, string[]>
): Promise<void> {
  if (!config.importLinks) return;
  
  console.log('\n🔗 处理文章链接关系...');
  
  for (const [articleId, wikiLinks] of linkMap.entries()) {
    // 删除旧链接
    await db.delete(articleLinks).where(eq(articleLinks.sourceId, articleId));
    
    for (const linkTitle of wikiLinks) {
      const linkSlug = generateSlug(linkTitle);
      const targetId = articleMap.get(linkSlug);
      
      if (targetId) {
        await db.insert(articleLinks).values({
          sourceId: articleId,
          targetId,
          linkType: 'internal',
        });
        console.log(`  ✅ 链接: ${articleId} -> ${targetId} (${linkTitle})`);
      } else {
        console.log(`  ⚠️  链接目标不存在: ${linkTitle}`);
      }
    }
  }
}

/**
 * 主导入函数
 */
async function main() {
  console.log('🚀 开始导入 Markdown 文件...\n');
  console.log(`📁 源目录: ${config.sourceDir}`);
  console.log(`👤 默认作者: ${config.defaultAuthorId}`);
  console.log(`📊 默认状态: ${config.defaultStatus}`);
  console.log(`🔄 重复策略: ${config.duplicateStrategy}\n`);
  
  // 获取所有 MD 文件
  const files = getAllMarkdownFiles(config.sourceDir);
  console.log(`📄 找到 ${files.length} 个 Markdown 文件\n`);
  
  if (files.length === 0) {
    console.log('⚠️  没有找到任何文件，退出。');
    return;
  }
  
  // 解析所有文件
  const parsedArticles: ParsedArticle[] = [];
  for (const file of files) {
    console.log(`📖 解析: ${path.relative(config.sourceDir, file)}`);
    const parsed = parseMarkdownFile(file);
    if (parsed) {
      parsedArticles.push(parsed);
    }
  }
  
  console.log(`\n✅ 成功解析 ${parsedArticles.length} 个文件\n`);
  
  // 导入文章
  console.log('💾 导入到数据库...\n');
  const articleMap = new Map<string, number>(); // slug -> id
  const linkMap = new Map<number, string[]>(); // id -> wikiLinks
  
  let successCount = 0;
  let failCount = 0;
  
  for (const parsed of parsedArticles) {
    const articleId = await importArticle(parsed);
    
    if (articleId) {
      successCount++;
      articleMap.set(parsed.slug, articleId);
      if (parsed.wikiLinks.length > 0) {
        linkMap.set(articleId, parsed.wikiLinks);
      }
    } else {
      failCount++;
    }
  }
  
  // 处理链接关系
  if (linkMap.size > 0) {
    await processLinks(articleMap, linkMap);
  }
  
  // 生成报告
  console.log('\n' + '='.repeat(50));
  console.log('📊 导入完成报告');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${successCount} 篇`);
  console.log(`❌ 失败: ${failCount} 篇`);
  console.log(`🔗 链接关系: ${linkMap.size} 篇文章包含链接`);
  console.log('='.repeat(50) + '\n');
  
  if (successCount > 0) {
    console.log('🎉 导入成功！文章已可在后台管理系统中查看和编辑。');
    console.log('🔗 后台地址: /dashboard/article\n');
  }
}

// 运行导入
main()
  .then(() => {
    console.log('✅ 导入脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 导入脚本执行失败:', error);
    process.exit(1);
  });

