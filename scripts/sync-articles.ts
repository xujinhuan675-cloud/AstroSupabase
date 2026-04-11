/**
 * 同步脚本：清空数据库并重新导入所有文章
 * 确保数据库与 content/ 目录完全一致
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { config as dotenvConfig } from 'dotenv';
import { generateSlug } from '../src/lib/markdown-processor';

dotenvConfig();

const { db } = await import('../src/db/client');
const { articles, articleTags, articleLinks } = await import('../src/db/schema');

interface ImportConfig {
  sourceDir: string;
  defaultAuthorId: string;
  defaultStatus: 'draft' | 'published';
  cleanDatabase: boolean; // 新增：是否清空数据库
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
  cleanDatabase: true, // 启用清空数据库功能
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
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllMarkdownFiles(fullPath));
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * 解析 Markdown 文件
 */
function parseMarkdownFile(filePath: string): ParsedArticle | null {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    
    // 提取标题
    const title = frontmatter.title || path.basename(filePath, '.md');
    
    // 生成 slug
    const slug = frontmatter.slug || generateSlug(title);
    
    // 提取摘要
    let excerpt = '';
    if (Object.prototype.hasOwnProperty.call(frontmatter, 'excerpt')) {
      excerpt = typeof frontmatter.excerpt === 'string' ? frontmatter.excerpt : String(frontmatter.excerpt ?? '');
    } else {
      excerpt = content.substring(0, 150).trim() + '...';
    }
    
    // 提取标签
    const tags: string[] = [];
    if (frontmatter.tags) {
      tags.push(...(Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags]));
    }
    
    // 提取内容中的 #标签
    const contentTags = content.match(/#[\u4e00-\u9fa5a-zA-Z0-9_]+/g) || [];
    contentTags.forEach(tag => {
      const cleanTag = tag.substring(1);
      if (!tags.includes(cleanTag)) {
        tags.push(cleanTag);
      }
    });
    
    // 提取 wikilinks
    const wikiLinks: string[] = [];
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      wikiLinks.push(match[1].trim());
    }
    
    return {
      filename: path.basename(filePath),
      title,
      slug,
      content,
      excerpt,
      tags,
      wikiLinks,
      frontmatter,
    };
  } catch (error) {
    console.error(`  ❌ 解析失败: ${error}`);
    return null;
  }
}

/**
 * 清空数据库中的所有文章数据
 */
async function cleanDatabase() {
  console.log('\n🗑️  清空数据库...\n');
  
  try {
    // 删除所有文章链接
    await db.delete(articleLinks);
    console.log('  ✅ 已删除所有文章链接');
    
    // 删除所有文章标签
    await db.delete(articleTags);
    console.log('  ✅ 已删除所有文章标签');
    
    // 删除所有文章
    await db.delete(articles);
    console.log('  ✅ 已删除所有文章');
    
    console.log('\n✅ 数据库清空完成\n');
  } catch (error) {
    console.error('❌ 清空数据库失败:', error);
    throw error;
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
    
    const articleData = {
      title: parsed.title,
      slug: parsed.slug,
      content: parsed.content,
      excerpt: parsed.excerpt,
      authorId: config.defaultAuthorId,
      status: config.defaultStatus,
      isDeleted: false,
      publishedAt,
      updatedAt: now,
      createdAt: now,
    };
    
    // 插入新文章
    const inserted = await db
      .insert(articles)
      .values(articleData)
      .returning();
    
    const articleId = inserted[0].id;
    console.log(`  ✅ 导入: ${parsed.title} (ID: ${articleId})`);
    
    // 导入标签
    if (config.importTags && parsed.tags.length > 0) {
      for (const tag of parsed.tags) {
        await db.insert(articleTags).values({
          articleId,
          tag,
        });
      }
      console.log(`    🏷️  标签: ${parsed.tags.join(', ')}`);
    }
    
    return articleId;
  } catch (error) {
    console.error(`  ❌ 导入失败: ${parsed.title}`, error);
    return null;
  }
}

/**
 * 处理文章间的链接关系
 */
async function processLinks(
  articleMap: Map<string, number>,
  linkMap: Map<number, string[]>
) {
  console.log('\n🔗 处理文章链接...\n');
  
  for (const [articleId, wikiLinks] of linkMap) {
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
 * 主同步函数
 */
async function main() {
  console.log('🚀 开始同步文章...\n');
  console.log(`📁 源目录: ${config.sourceDir}`);
  console.log(`👤 默认作者: ${config.defaultAuthorId}`);
  console.log(`📊 默认状态: ${config.defaultStatus}`);
  console.log(`🗑️  清空数据库: ${config.cleanDatabase ? '是' : '否'}\n`);
  
  // 清空数据库
  if (config.cleanDatabase) {
    await cleanDatabase();
  }
  
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
  const articleMap = new Map<string, number>();
  const linkMap = new Map<number, string[]>();
  
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
  console.log('📊 同步完成报告');
  console.log('='.repeat(50));
  console.log(`✅ 成功: ${successCount} 篇`);
  console.log(`❌ 失败: ${failCount} 篇`);
  console.log(`🔗 链接关系: ${linkMap.size} 篇文章包含链接`);
  console.log('='.repeat(50) + '\n');
  
  if (successCount > 0) {
    console.log('🎉 同步成功！数据库已与 content/ 目录完全一致。');
    console.log('🔗 后台地址: /dashboard/article\n');
  }
}

// 运行同步
main()
  .then(() => {
    console.log('✅ 同步脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 同步脚本执行失败:', error);
    process.exit(1);
  });

