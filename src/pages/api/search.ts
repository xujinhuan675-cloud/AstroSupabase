import { db } from '../../db/client';
import { articles } from '../../db/schema';
import { sql, and, eq } from 'drizzle-orm';
import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Server-side Full Text Search API
 * GET /api/search?q=query
 */
export const GET: APIRoute = async ({ url }) => {
    const query = url.searchParams.get('q');

    if (!query || query.trim().length < 2) {
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'X-Search-Version': '5.0'
            }
        });
    }

    try {
        const searchTerm = query.trim();

        // 先测试数据库连接
        const testQuery = await db.execute(sql`SELECT COUNT(*) as count FROM articles WHERE is_deleted = false AND status = 'published'`);
        const totalPublished = testQuery[0]?.count || 0;

        // 执行搜索
        const results = await db
            .select({
                id: articles.id,
                title: articles.title,
                slug: articles.slug,
                excerpt: articles.excerpt,
            })
            .from(articles)
            .where(
                and(
                    eq(articles.isDeleted, false),
                    eq(articles.status, 'published'),
                    sql`${articles.searchVector} @@ plainto_tsquery('simple', ${searchTerm})`
                )
            )
            .limit(10);

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0',
                'X-Search-Version': '5.0',
                'X-Total-Published': String(totalPublished),
                'X-Results-Count': String(results.length)
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            error: 'Search failed', 
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
