import { db } from '../../db/client';
import { sql } from 'drizzle-orm';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    const q = url.searchParams.get('q');
    
    if (!q || q.trim().length < 2) {
        return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const searchTerm = q.trim();
        const like = `%${searchTerm}%`;
        
        // 使用原始 SQL 通过 Drizzle 的 db.execute
        const results = await db.execute(sql`
            SELECT id, title, slug, excerpt
            FROM articles
            WHERE is_deleted = false
              AND status = 'published'
              AND (
                title ILIKE ${like}
                OR coalesce(excerpt, '') ILIKE ${like}
              )
            ORDER BY
              CASE WHEN title ILIKE ${like} THEN 0 ELSE 1 END,
              NULLIF(position(lower(${searchTerm}) in lower(title)), 0) NULLS LAST,
              NULLIF(position(lower(${searchTerm}) in lower(coalesce(excerpt, ''))), 0) NULLS LAST,
              length(title) ASC,
              published_at DESC NULLS LAST,
              id DESC
            LIMIT 8
        `);

        return new Response(JSON.stringify(results), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
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
