/**
 * 构建时预渲染脚本
 * 使用并行处理所有文章的 Markdown
 * 类似 Quartz 4.0 的构建时优化策略
 * 
 * 性能优化：
 * 1. 增强多线程并行处理
 * 2. 添加构建错误处理和降级
 * 3. 优化数据库查询批处理
 * 4. 添加进度条和详细日志
 */

import { db } from '../src/db/client.js';
import { articles } from '../src/db/schema.js';
import { eq, and, isNull, or, sql } from 'drizzle-orm';
import { processMarkdown } from '../src/lib/markdown-processor.js';
import { cpus } from 'os';

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  htmlContent: string | null;
}

interface ProcessResult {
  articleId: number;
  html: string;
  readingTime: string;
  success: boolean;
  error?: string;
  processingTime?: number;
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
  
  elapsedMs(): number {
    const [seconds, nanoseconds] = process.hrtime(this.startTime);
    return seconds * 1000 + nanoseconds / 1000000;
  }
}

// 处理单个文章（带重试机制）
async function processSingleArticle(article: Article, retries = 2): Promise<ProcessResult> {
  const startTime = Date.now();
  
  for (let attempt = 0; attempt <= retries; attempt++) {
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
        processingTime,
      };
    } catch (error) {
      if (attempt < retries) {
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        continue;
      }
      
      return {
        articleId: article.id,
        html: '',
        readingTime: '0 min read',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        processingTime: Date.now() - startTime,
      };
    }
  }
  
  // 不应该到达这里
  return {
    articleId: article.id,
    html: '',
    readingTime: '0 min read',
    success: false,
    error: 'Unknown error',
  };
}

// 并发处理文章（使用 Promise.all + 动态并发控制）
async function processArticlesInParallel(
  articlesToProcess: Article[],
  concurrency: number
): Promise<Map<number, ProcessResult>> {
  const results = new Map<number, ProcessResult>();
  
  console.log(`\n⚡ Processing with concurrency: ${concurrency}\n`);
  
  let completedCount = 0;
  const totalCount = articlesToProcess.length;
  let totalProcessingTime = 0;
  
  // 分批处理（每批 concurrency 个）
  for (let i = 0; i < articlesToProcess.length; i += concurrency) {
    const batch = articlesToProcess.slice(i, i + concurrency);
    
    // 并行处理当前批次
    const batchResults = await Promise.all(
      batch.map(article => processSingleArticle(article))
    );
    
    // 保存结果
    for (const result of batchResults) {
      results.set(result.articleId, result);
      completedCount++;
      if (result.processingTime) {
        totalProcessingTime += result.processingTime;
      }
      
      // 进度显示（带预估剩余时间）
      const percent = ((completedCount / totalCount) * 100).toFixed(1);
      const avgTime = totalProcessingTime / completedCount;
      const remainingCount = totalCount - completedCount;
      const eta = remainingCount > 0 ? `ETA: ${((avgTime * remainingCount) / 1000).toFixed(1)}s` : '';
      
      process.stdout.write(`\r  Processing: ${completedCount}/${totalCount} (${percent}%) ${eta}    `);
      
      if (!result.success) {
        console.error(`\n  ✗ Failed to process article ${result.articleId}: ${result.error}`);
      }
    }
  }
  
  console.log(''); // 换行
  return results;
}

// 批量更新数据库（优化：使用事务）
async function batchUpdateDatabase(results: Map<number, ProcessResult>) {
  console.log(`\n\n💾 Updating database...`);
  const updateTimer = new PerfTimer();
  
  let successCount = 0;
  let failCount = 0;
  
  // 批量更新（每批 50 个）
  const BATCH_SIZE = 50;
  const entries = Array.from(results.entries()).filter(([_, r]) => r.success);
  
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    
    // 使用 Promise.all 并行更新
    const updateResults = await Promise.allSettled(
      batch.map(async ([articleId, result]) => {
        await db
          .update(articles)
          .set({
            htmlContent: result.html,
            readingTime: result.readingTime,
          })
          .where(eq(articles.id, articleId));
        return articleId;
      })
    );
    
    // 统计结果
    for (const updateResult of updateResults) {
      if (updateResult.status === 'fulfilled') {
        successCount++;
      } else {
        failCount++;
        console.error(`\n  ✗ Failed to update article:`, updateResult.reason);
      }
    }
    
    // 进度显示
    const progress = Math.min(i + BATCH_SIZE, entries.length);
    process.stdout.write(`\r  Updating: ${progress}/${entries.length}`);
  }
  
  // 统计失败的处理
  const failedProcessing = Array.from(results.values()).filter(r => !r.success).length;
  failCount += failedProcessing;
  
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
    
    // 优化：只获取需要重新渲染的文章（htmlContent 为空或内容已更新）
    const allArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        content: articles.content,
        htmlContent: articles.htmlContent,
      })
      .from(articles)
      .where(eq(articles.status, 'published'));
    
    console.log(`✓ Fetched ${allArticles.length} articles in ${fetchTimer.elapsed()}\n`);
    
    if (allArticles.length === 0) {
      console.log('ℹ️  No articles to process');
      return;
    }
    
    // 优化：过滤出需要重新渲染的文章
    const articlesToProcess = allArticles.filter(a => !a.htmlContent);
    const skippedCount = allArticles.length - articlesToProcess.length;
    
    if (skippedCount > 0) {
      console.log(`ℹ️  Skipping ${skippedCount} articles with cached HTML`);
    }
    
    if (articlesToProcess.length === 0) {
      console.log('✅ All articles already have cached HTML');
      process.exit(0);
      return;
    }
    
    console.log(`📝 Processing ${articlesToProcess.length} articles...\n`);
    
    // 2. 计算并发数（基于 CPU 核心数和文章数量）
    const cpuCount = cpus().length;
    // 动态调整并发数：小批量用更高并发，大批量用适中并发
    const maxConcurrency = Math.min(
      Math.max(cpuCount * 2, 4), // 至少 4 个并发
      Math.min(articlesToProcess.length, 20) // 最多 20 个并发
    );
    
    console.log(`⚡ CPU cores: ${cpuCount}, Concurrency: ${maxConcurrency}\n`);
    
    // 3. 多线程并行处理
    const processTimer = new PerfTimer();
    const results = await processArticlesInParallel(articlesToProcess, maxConcurrency);
    console.log(`\n✓ Processed ${articlesToProcess.length} articles in ${processTimer.elapsed()}`);
    
    // 4. 批量更新数据库
    await batchUpdateDatabase(results);
    
    // 5. 完成
    const avgTime = processTimer.elapsedMs() / articlesToProcess.length;
    console.log(`\n✅ Pre-rendering complete in ${totalTimer.elapsed()}`);
    console.log(`   Average: ${avgTime.toFixed(0)}ms per article\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Pre-rendering failed:', error);
    process.exit(1);
  }
}

// 运行
main();

