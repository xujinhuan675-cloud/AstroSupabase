import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import matter from 'gray-matter';
import { db } from '../src/db/client-scripts';
import { articles, articleLinks, articleTags } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { processMarkdown, generateSlug } from '../src/lib/markdown-processor';

/**
 * 更新文章的链接关系和标签（脚本版本）
 */
async function updateArticleLinksAndTags(articleId: number, content: string) {
  try {
    // 解析 Markdown 获取所有链接和标签
    const processed = await processMarkdown(content, {}, async (permalink: string) => {
      const result = await db
        .select()
        .from(articles)
        .where(eq(articles.slug, permalink))
        .limit(1);
      return result.length > 0;
    });

    // 删除旧的链接关系
    await db.delete(articleLinks).where(eq(articleLinks.sourceId, articleId));

    // 创建新的链接关系
    for (const link of processed.wikiLinks) {
      if (link.data.exists) {
        const targetArticle = await db
          .select()
          .from(articles)
          .where(eq(articles.slug, link.data.permalink))
          .limit(1);

        if (targetArticle.length > 0) {
          try {
            await db.insert(articleLinks).values({
              sourceId: articleId,
              targetId: targetArticle[0].id,
              linkType: 'internal',
            });
          } catch (error) {
            // 忽略重复插入错误
          }
        }
      }
    }

    // 更新标签
    await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
    
    for (const tag of processed.tags) {
      try {
        await db.insert(articleTags).values({
          articleId,
          tag,
        });
      } catch (error) {
        // 忽略重复插入错误
      }
    }
  } catch (error) {
    console.error('处理链接关系时出错:', error);
  }
}

/**
 * 从本地 Markdown 文件导入文章到数据库
 * 
 * 使用方法：
 * 1. 将 .md 文件放到 content/articles/ 目录
 * 2. 运行 npm run import
 */
async function importMarkdownFiles() {
  const contentDir = join(process.cwd(), 'content', 'articles');
  
  try {
    console.log('📂 开始扫描 Markdown 文件...');
    console.log(`📍 目录: ${contentDir}\n`);
    
    const files = await readdir(contentDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    if (mdFiles.length === 0) {
      console.log('⚠️  未找到任何 .md 文件');
      console.log(`💡 请将 Markdown 文件放到: ${contentDir}`);
      return;
    }
    
    console.log(`✅ 找到 ${mdFiles.length} 个 Markdown 文件\n`);
    
    let imported = 0;
    let skipped = 0;
    let failed = 0;
    
    for (const file of mdFiles) {
      try {
        console.log(`📄 处理: ${file}`);
        
        const filePath = join(contentDir, file);
        const content = await readFile(filePath, 'utf-8');
        const { data, content: markdownContent } = matter(content);
        
        // 验证必要字段
        if (!data.title) {
          console.log(`  ⚠️  跳过: 缺少 title 字段\n`);
          skipped++;
          continue;
        }
        
        // 生成 slug
        const slug = data.slug || generateSlug(data.title);
        
        // 检查文章是否已存在
        const existing = await db
          .select()
          .from(articles)
          .where(eq(articles.slug, slug))
          .limit(1);
        
        if (existing.length > 0) {
          console.log(`  ⏭️  跳过: 文章已存在 (slug: ${slug})\n`);
          skipped++;
          continue;
        }
        
        // 插入文章
        const [inserted] = await db
          .insert(articles)
          .values({
            title: data.title,
            slug,
            excerpt: data.excerpt || '',
            content: markdownContent,
            authorId: data.author || 'system',
            featuredImage: data.featuredImage,
            status: data.status || 'draft',
            publishedAt: data.status === 'published' ? new Date() : null,
          })
          .returning();
        
        console.log(`  ✅ 导入成功 (ID: ${inserted.id})`);
        
        // 更新链接关系和标签
        console.log(`  🔗 处理链接关系和标签...`);
        await updateArticleLinksAndTags(inserted.id, markdownContent);
        console.log(`  ✅ 链接关系已更新\n`);
        
        imported++;
      } catch (error) {
        console.error(`  ❌ 失败: ${error instanceof Error ? error.message : error}\n`);
        failed++;
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 导入统计:');
    console.log(`   ✅ 成功: ${imported} 篇`);
    console.log(`   ⏭️  跳过: ${skipped} 篇`);
    console.log(`   ❌ 失败: ${failed} 篇`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (imported > 0) {
      console.log('🎉 导入完成！访问 http://localhost:4321 查看文章');
    }
  } catch (error) {
    console.error('❌ 导入过程出错:', error);
    process.exit(1);
  }
}

// 执行导入
importMarkdownFiles().catch(console.error);

