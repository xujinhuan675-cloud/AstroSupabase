import { db } from '../../db/client';
import { articles } from '../../db/schema';
import { sql, and, eq } from 'drizzle-orm';
import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Server-side Full Text Search API
 * 
 * GET /api/search?q=query
 */
export const GET: APIRoute = async ({ url }) => {
    const query = url.searchParams.get('q');

    // 测试：如果查询是 "test123"，返回特殊响应
    if (query === 'test123') {
        return new Response(JSON.stringify({ test: 'deployment-working', version: '4.0' }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Search-Version': '4.0'
            }
        });
    }

    if (!query || query.trim().length < 2) {
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Search-Version': '4.0'
            }
        });
    }

    try {
        const searchTerm = query.trim();

        // Use Postgres full text search
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
                'Cache-Control': 'no-cache',
                'X-Search-Version': '4.0'
            }
        });

    } catch (error) {
        return new Response(JSON.stringify({ 
            error: 'Search failed', 
            message: error instanceof Error ? error.message : String(error) 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
