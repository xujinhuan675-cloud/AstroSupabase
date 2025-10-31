/**
 * Markdown Worker - 多线程处理单个文章的 Markdown
 * 用于构建时预处理，提升处理速度
 */

import { parentPort } from 'worker_threads';
import { processMarkdown } from '../src/lib/markdown-processor.js';

interface WorkerMessage {
  articleId: number;
  title: string;
  content: string;
  slug: string;
}

interface WorkerResult {
  articleId: number;
  html: string;
  readingTime: string;
  success: boolean;
  error?: string;
}

// 监听主线程消息
parentPort?.on('message', async (message: WorkerMessage) => {
  const startTime = Date.now();
  
  try {
    // 处理 Markdown（关闭不必要的功能以提速）
    const processed = await processMarkdown(
      message.content,
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
    
    const result: WorkerResult = {
      articleId: message.articleId,
      html: processed.html,
      readingTime: processed.readingTime,
      success: true,
    };

    // 发送结果回主线程
    parentPort?.postMessage(result);
    
    // 日志
    console.log(`  ✓ [Worker] Article ${message.articleId} (${message.slug}) processed in ${processingTime}ms`);
    
  } catch (error) {
    const result: WorkerResult = {
      articleId: message.articleId,
      html: '',
      readingTime: '0 min read',
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };

    parentPort?.postMessage(result);
    console.error(`  ✗ [Worker] Failed to process article ${message.articleId}: ${result.error}`);
  }
});

// 通知主线程 Worker 已就绪
parentPort?.postMessage({ ready: true });

