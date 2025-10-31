/**
 * 构建时预渲染脚本
 * 使用多线程并行处理所有文章的 Markdown
 * 类似 Quartz 4.0 的构建时优化策略
 */

import { Worker } from 'worker_threads';
import { db } from '../src/db/client.js';
import { articles } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { cpus } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
}

interface WorkerResult {
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

// 并发处理文章
async function processArticlesInParallel(
  articles: Article[],
  concurrency: number
): Promise<Map<number, WorkerResult>> {
  const results = new Map<number, WorkerResult>();
  const workerPath = path.join(__dirname, 'markdown-worker.js');
  
  console.log(`\n🔧 Creating ${concurrency} worker threads...`);
  
  // 创建 Worker 池
  const workers: Worker[] = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(new Worker(workerPath));
  }
  
  // 等待所有 Worker 就绪
  await Promise.all(
    workers.map(worker => 
      new Promise(resolve => {
        worker.once('message', (msg) => {
          if (msg.ready) resolve(true);
        });
      })
    )
  );
  
  console.log(`✓ Workers ready\n`);
  
  // 分配任务
  let completedCount = 0;
  const totalCount = articles.length;
  
  return new Promise((resolve, reject) => {
    let nextArticleIndex = 0;
    let activeWorkers = workers.length;
    
    const assignNextArticle = (worker: Worker) => {
      if (nextArticleIndex >= articles.length) {
        worker.terminate();
        activeWorkers--;
        
        if (activeWorkers === 0) {
          resolve(results);
        }
        return;
      }
      
      const article = articles[nextArticleIndex++];
      
      worker.postMessage({
        articleId: article.id,
        title: article.title,
        content: article.content,
        slug: article.slug,
      });
    };
    
    // 为每个 Worker 设置消息处理
    workers.forEach(worker => {
      worker.on('message', (result: WorkerResult) => {
        if ('ready' in result) return; // 忽略就绪消息
        
        completedCount++;
        results.set(result.articleId, result);
        
        // 进度显示
        const percent = ((completedCount / totalCount) * 100).toFixed(1);
        process.stdout.write(`\r  Processing: ${completedCount}/${totalCount} (${percent}%)`);
        
        // 分配下一个任务
        assignNextArticle(worker);
      });
      
      worker.on('error', (error) => {
        console.error(`\n✗ Worker error:`, error);
        reject(error);
      });
      
      // 开始第一批任务
      assignNextArticle(worker);
    });
  });
}

// 批量更新数据库
async function batchUpdateDatabase(results: Map<number, WorkerResult>) {
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
    
    // 2. 计算并发数（基于 CPU 核心数和文章数量）
    const cpuCount = cpus().length;
    const CHUNK_SIZE = 128; // 类似 Quartz 的策略
    const maxConcurrency = Math.min(
      Math.max(Math.floor(allArticles.length / CHUNK_SIZE), 1),
      Math.min(cpuCount, 4) // 最多 4 个线程
    );
    
    console.log(`⚡ Processing with ${maxConcurrency} thread(s) (CPU cores: ${cpuCount})\n`);
    
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

