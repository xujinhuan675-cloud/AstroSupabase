/**
 * 缓存预热脚本
 * 为所有已发布的文章生成 HTML 缓存
 * 避免用户首次访问时等待 Markdown 处理
 */

import { config } from 'dotenv';
config();

import { db } from '../src/db/client';
import { articles } from '../src/db/schema';
import { processMarkdown } from '../src/lib/markdown-processor';
import { eq } from 'drizzle-orm';

async function warmCache() {
  console.log('🔥 Starting cache warming...\n');

  // 获取所有已发布的文章
  const allArticles = await db
    .select()
    .from(articles)
    .where(eq(articles.status, 'published'));

  console.log(`📚 Found ${allArticles.length} published articles\n`);

  // 预先查询所有 slugs（用于链接验证）
  const allSlugs = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.status, 'published'))
    .then(results => new Set(results.map(r => r.slug)));

  console.log(`🔗 Loaded ${allSlugs.size} article slugs for link validation\n`);

  let cached = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of allArticles) {
    try {
      if (!article.htmlContent) {
        console.log(`⏳ Processing: ${article.title}`);
        const startTime = Date.now();

        const processed = await processMarkdown(
          article.content,
          {},
          async (permalink: string) => allSlugs.has(permalink)
        );

        await db.update(articles)
          .set({
            htmlContent: processed.html,
            readingTime: processed.readingTime,
          })
          .where(eq(articles.id, article.id));

        const duration = Date.now() - startTime;
        console.log(`   ✓ Cached in ${duration}ms\n`);
        cached++;
      } else {
        console.log(`⊙ Skipped (already cached): ${article.title}\n`);
        skipped++;
      }
    } catch (error) {
      console.error(`   ✗ Failed: ${article.title}`);
      console.error(`   Error: ${error}\n`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Cache Warming Summary:');
  console.log('='.repeat(50));
  console.log(`✓ Cached: ${cached} articles`);
  console.log(`⊙ Skipped: ${skipped} articles (already cached)`);
  console.log(`✗ Failed: ${failed} articles`);
  console.log(`📚 Total: ${allArticles.length} articles`);
  console.log('='.repeat(50));
  console.log('\n✅ Cache warming complete!');

  process.exit(failed > 0 ? 1 : 0);
}

// 运行脚本
warmCache().catch((error) => {
  console.error('\n❌ Cache warming failed:');
  console.error(error);
  process.exit(1);
});

