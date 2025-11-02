import type { APIRoute } from 'astro';
import { convertToQuartzFormatOptimized } from '../../lib/graph-data-adapter';
import { cache } from '../../lib/cache';
import { cacheConfig } from '../../config';
import { createModuleLogger } from '../../lib/logger';

const logger = createModuleLogger('API.ContentIndex');
const CACHE_KEY = 'content-index';

/**
 * Quartz 格式的内容索引 API
 * 返回格式与 Quartz 的 contentIndex.json 保持一致
 * 使用内存缓存优化性能
 * 
 * GET /api/content-index.json
 * 
 * Response: {
 *   "article-slug-1": {
 *     slug: "article-slug-1",
 *     filePath: "articles/article-slug-1",
 *     title: "Article Title",
 *     links: ["article-slug-2", "article-slug-3"],
 *     tags: ["tag1", "tag2"],
 *     content: ""
 *   },
 *   ...
 * }
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    // 检查缓存（仅在非开发环境）
    const cacheBust = url.searchParams.get('refresh');
    let contentIndex = cacheBust ? null : cache.get(CACHE_KEY);
    
    if (!contentIndex) {
      logger.debug('Cache miss, fetching content index from database');
      contentIndex = await convertToQuartzFormatOptimized();
      
      // 写入缓存
      cache.set(CACHE_KEY, contentIndex, cacheConfig.contentIndexTTL);
      logger.debug('Content index cached');
    } else {
      logger.debug('Cache hit, returning cached content index');
    }
    
    return new Response(JSON.stringify(contentIndex), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // HTTP 缓存 5 分钟
      },
    });
  } catch (error) {
    logger.error('Error fetching content index:', error);
    
    // 尝试返回缓存中的数据（即使过期）
    const staleCache = cache.get(CACHE_KEY);
    if (staleCache) {
      logger.warn('Returning stale cache due to error');
      return new Response(JSON.stringify(staleCache), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60', // 缩短缓存时间
          'X-Cache-Status': 'stale',
        },
      });
    }
    
    // 返回空对象而不是错误，避免前端崩溃
    return new Response(JSON.stringify({}), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }
};
