
import { db } from '../../db/client';
import { sql } from 'drizzle-orm';
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        // 1. Get connection info (masked)
        // We can't easily get the connection string back from the client, 
        // but we can query the database for its current status/name

        // 2. Check Article Count
        const countResult = await db.execute(sql`SELECT COUNT(*) FROM articles`);

        // 3. Check Search Vector Status
        const vectorResult = await db.execute(sql`SELECT COUNT(*) FROM articles WHERE search_vector IS NOT NULL`);

        // 4. Sample Article
        const sample = await db.execute(sql`SELECT id, title, slug FROM articles LIMIT 1`);

        // 5. Test Search
        const searchTest = await db.execute(sql`
        SELECT id, title FROM articles 
        WHERE search_vector @@ plainto_tsquery('simple', '经济') 
        LIMIT 5
    `);

        return new Response(JSON.stringify({
            status: 'ok',
            totalArticles: countResult[0].count,
            articlesWithIndex: vectorResult[0].count,
            sampleArticle: sample,
            searchTestResult: searchTest
        }, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        return new Response(JSON.stringify({
            status: 'error',
            message: error.message,
            stack: error.stack
        }, null, 2), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
