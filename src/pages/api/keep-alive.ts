/**
 * 数据库保活端点
 * 
 * 用于防止 Supabase 免费版数据库因 7 天不活跃而被暂停
 * 通过 Vercel Cron Job 每 6 天自动调用一次
 * 
 * @route GET /api/keep-alive
 */
import type { APIRoute } from 'astro';
import { db } from '../../db/client';
import { articles } from '../../db/schema';
import { sql } from 'drizzle-orm';

export const prerender = false;

export const GET: APIRoute = async () => {
  const startTime = Date.now();
  
  try {
    // 执行轻量级查询：获取文章数量
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(articles);
    
    const articleCount = result[0]?.count ?? 0;
    const duration = Date.now() - startTime;
    
    console.log(`[KEEP-ALIVE] Database ping successful. Articles: ${articleCount}, Duration: ${duration}ms`);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Database is alive',
      timestamp: new Date().toISOString(),
      stats: {
        articleCount,
        queryDuration: `${duration}ms`,
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`[KEEP-ALIVE] Database ping failed after ${duration}ms:`, errorMessage);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Database ping failed',
      error: errorMessage,
      timestamp: new Date().toISOString(),
      stats: {
        queryDuration: `${duration}ms`,
      },
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
};
