import type { APIRoute } from 'astro';
import { convertToQuartzFormatOptimized } from '../../lib/graph-data-adapter';

/**
 * Quartz 格式的内容索引 API
 * 返回格式与 Quartz 的 contentIndex.json 保持一致
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
export const GET: APIRoute = async () => {
  try {
    const contentIndex = await convertToQuartzFormatOptimized();
    
    return new Response(JSON.stringify(contentIndex), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 缓存 5 分钟
      },
    });
  } catch (error) {
    console.error('Error fetching content index:', error);
    
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
