/**
 * 构建时预渲染脚本
 * 使用并行处理所有文章的 Markdown
 * 类似 Quartz 4.0 的构建时优化策略
 */

import { db } from '../src/db/client.js';
import { articles } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { processMarkdown } from '../src/lib/markdown-processor.js';
import { cpus } from 'os';

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
}

interface ProcessResult {
  articleId: number;
  html: string;
  readingTime: string;
  success: boolean;
  error?: string;
}

// 性能计时器
class PerfTimer {
  private startTime: [number, number];
  
  constructor() {
    this.startTime = process.hrtime();
  }
  
  elapsed(): string {
    const [seconds, nanoseconds] = process.hrtime(this.startTime);
    const ms = seconds * 1000 + nanoseconds / 1000000;
    
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    } else {
      return `${(ms / 1000).toFixed(2)}s`;
    }
  }
}

// 处理单个文章
async function processSingleArticle(article: Article): Promise<ProcessResult> {
  const startTime = Date.now();
  
  try {
    // 处理 Markdown（关闭不必要的功能以提速）
    const processed = await processMarkdown(
      article.content,
      {
        ofm: {
          wikilinks: true,
          callouts: true,
          mermaid: false,          // 关闭图表（慢）
          parseTags: true,
          highlight: true,
          comments: false,
          parseArrows: false,
          enableYouTubeEmbed: false,
          enableVideoEmbed: false,
        }
      },
      async (permalink: string) => {
        // 简化：不验证链接（在导入时已验证）
        return true;
      }
    );

    const processingTime = Date.now() - startTime;
    
    return {
      articleId: article.id,
      html: processed.html,
      readingTime: processed.readingTime,
      success: true,
    };
  } catch (error) {
    return {
      articleId: article.id,
      html: '',
      readingTime: '0 min read',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 并发处理文章（使用 Promise.all）
async function processArticlesInParallel(
  articles: Article[],
  concurrency: number
): Promise<Map<number, ProcessResult>> {
  const results = new Map<number, ProcessResult>();
  
  console.log(`\n⚡ Processing with concurrency: ${concurrency}\n`);
  
  let completedCount = 0;
  const totalCount = articles.length;
  
  // 分批处理（每批 concurrency 个）
  for (let i = 0; i < articles.length; i += concurrency) {
    const batch = articles.slice(i, i + concurrency);
    
    // 并行处理当前批次
    const batchResults = await Promise.all(
      batch.map(article => processSingleArticle(article))
    );
    
    // 保存结果
    for (const result of batchResults) {
      results.set(result.articleId, result);
      completedCount++;
      
      // 进度显示
      const percent = ((completedCount / totalCount) * 100).toFixed(1);
      process.stdout.write(`\r  Processing: ${completedCount}/${totalCount} (${percent}%)`);
      
      if (!result.success) {
        console.error(`\n  ✗ Failed to process article ${result.articleId}: ${result.error}`);
      }
    }
  }
  
  console.log(''); // 换行
  return results;
}

// 批量更新数据库
async function batchUpdateDatabase(results: Map<number, ProcessResult>) {
  console.log(`\n\n💾 Updating database...`);
  const updateTimer = new PerfTimer();
  
  let successCount = 0;
  let failCount = 0;
  
  // 批量更新（每批 50 个）
  const BATCH_SIZE = 50;
  const entries = Array.from(results.entries());
  
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    
    await Promise.all(
      batch.map(async ([articleId, result]) => {
        if (result.success) {
          try {
            await db
              .update(articles)
              .set({
                htmlContent: result.html,
                readingTime: result.readingTime,
              })
              .where(eq(articles.id, articleId));
            successCount++;
          } catch (error) {
            console.error(`\n  ✗ Failed to update article ${articleId}:`, error);
            failCount++;
          }
        } else {
          failCount++;
        }
      })
    );
    
    // 进度显示
    const progress = Math.min(i + BATCH_SIZE, entries.length);
    process.stdout.write(`\r  Updating: ${progress}/${entries.length}`);
  }
  
  console.log(`\n✓ Database updated in ${updateTimer.elapsed()}`);
  console.log(`  Success: ${successCount}, Failed: ${failCount}`);
}

// 主函数
async function main() {
  console.log('🚀 Starting build-time pre-rendering...\n');
  const totalTimer = new PerfTimer();
  
  try {
    // 1. 查询所有需要处理的文章
    console.log('📚 Fetching articles from database...');
    const fetchTimer = new PerfTimer();
    
    const allArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
      })
      .from(articles)
      .where(eq(articles.status, 'published'));
    
    console.log(`✓ Fetched ${allArticles.length} articles in ${fetchTimer.elapsed()}\n`);
    
    if (allArticles.length === 0) {
      console.log('ℹ️  No articles to process');
      return;
    }
    
    // 2. 计算并发数（基于文章数量）
    const cpuCount = cpus().length;
    // 每批处理 10-20 个文章（避免内存占用过高）
    const maxConcurrency = Math.min(
      Math.max(Math.floor(allArticles.length / 10), 1),
      20 // 最多同时处理 20 个
    );
    
    console.log(`⚡ CPU cores: ${cpuCount}, Concurrency: ${maxConcurrency}\n`);
    
    // 3. 多线程并行处理
    const processTimer = new PerfTimer();
    const results = await processArticlesInParallel(allArticles, maxConcurrency);
    console.log(`\n✓ Processed ${allArticles.length} articles in ${processTimer.elapsed()}`);
    
    // 4. 批量更新数据库
    await batchUpdateDatabase(results);
    
    // 5. 完成
    console.log(`\n✅ Pre-rendering complete in ${totalTimer.elapsed()}`);
    console.log(`   Average: ${(parseFloat(processTimer.elapsed()) / allArticles.length).toFixed(0)}ms per article\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Pre-rendering failed:', error);
    process.exit(1);
  }
}

// 运行
main();

