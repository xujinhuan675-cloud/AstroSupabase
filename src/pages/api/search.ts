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
        
        // 使用原始 SQL 通过 Drizzle 的 db.execute
        const results = await db.execute(sql`
            SELECT id, title, slug, excerpt
            FROM articles
            WHERE is_deleted = false
              AND status = 'published'
              AND search_vector @@ plainto_tsquery('simple', ${searchTerm})
            LIMIT 10
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
