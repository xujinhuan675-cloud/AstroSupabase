import { db } from '../../db/client';
import { articles } from '../../db/schema';
import { sql, and, eq } from 'drizzle-orm';
import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Debug endpoint
 * GET /api/debug-search?q=query
 */
export const GET: APIRoute = async ({ url }) => {
    const query = url.searchParams.get('q') || '城市';
    const searchTerm = query.trim();

    try {
        // 1. 检查数据库连接
        const dbCheck = await db.execute(sql`SELECT 1 as test`);
        
        // 2. 统计文章数量
        const totalArticles = await db
            .select({ count: sql<number>`count(*)` })
            .from(articles);
        
        // 3. 统计已发布文章
        const publishedArticles = await db
            .select({ count: sql<number>`count(*)` })
            .from(articles)
            .where(
                and(
                    eq(articles.isDeleted, false),
                    eq(articles.status, 'published')
                )
            );
        
        // 4. 检查 search_vector
        const vectorCheck = await db
            .select({
                id: articles.id,
                title: articles.title,
                hasVector: sql<boolean>`${articles.searchVector} IS NOT NULL`,
            })
            .from(articles)
            .where(
                and(
                    eq(articles.isDeleted, false),
                    eq(articles.status, 'published')
                )
            )
            .limit(3);
        
        // 5. 执行搜索
        const searchResults = await db
            .select({
                id: articles.id,
                title: articles.title,
                slug: articles.slug,
            })
            .from(articles)
            .where(
                and(
                    eq(articles.isDeleted, false),
                    eq(articles.status, 'published'),
                    sql`${articles.searchVector} @@ plainto_tsquery('simple', ${searchTerm})`
                )
            )
            .limit(5);
        
        // 6. 直接 SQL 测试
        const rawSqlResults = await db.execute(sql`
            SELECT id, title
            FROM articles
            WHERE is_deleted = false
              AND status = 'published'
              AND search_vector @@ plainto_tsquery('simple', ${searchTerm})
            LIMIT 5
        `);

        const debug = {
            query: searchTerm,
            timestamp: new Date().toISOString(),
            database: {
                connected: dbCheck.length > 0,
                totalArticles: totalArticles[0]?.count || 0,
                publishedArticles: publishedArticles[0]?.count || 0,
            },
            vectorCheck: vectorCheck,
            searchResults: {
                count: searchResults.length,
                items: searchResults,
            },
            rawSqlResults: {
                count: rawSqlResults.length,
                items: rawSqlResults,
            },
            environment: {
                hasDatabaseUrl: !!process.env.DATABASE_URL,
                databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30) + '...',
                nodeEnv: process.env.NODE_ENV,
            }
        };

        return new Response(JSON.stringify(debug, null, 2), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            error: 'Debug failed', 
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, null, 2), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
