import postgres from 'postgres';
import type { APIRoute } from 'astro';

export const prerender = false;

const connectionString = process.env.DATABASE_URL || '';
const client = postgres(connectionString, { prepare: false });

export const GET: APIRoute = async ({ url }) => {
    const q = url.searchParams.get('q');
    
    if (!q || q.trim().length < 2) {
        return new Response(JSON.stringify([]), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const results = await client`
            SELECT id, title, slug, excerpt
            FROM articles
            WHERE is_deleted = false
              AND status = 'published'
              AND search_vector @@ plainto_tsquery('simple', ${q.trim()})
            LIMIT 10
        `;

        return new Response(JSON.stringify(results), {
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Search failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
