import postgres from 'postgres';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
    const q = url.searchParams.get('q');
    
    if (!q || q.trim().length < 2) {
        return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // 每次请求创建新连接
    const connectionString = process.env.DATABASE_URL || '';
    const sql = postgres(connectionString, { 
        prepare: false,
        max: 1
    });

    try {
        const results = await sql`
            SELECT id, title, slug, excerpt
            FROM articles
            WHERE is_deleted = false
              AND status = 'published'
              AND search_vector @@ plainto_tsquery('simple', ${q.trim()})
            LIMIT 10
        `;

        await sql.end();

        return new Response(JSON.stringify(results), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        await sql.end();
        
        return new Response(JSON.stringify({ 
            error: 'Search failed',
            message: error instanceof Error ? error.message : String(error)
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
