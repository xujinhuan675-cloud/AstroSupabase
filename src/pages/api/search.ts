import { db } from '../../db/client';
import { articles } from '../../db/schema';
import { sql, and, eq } from 'drizzle-orm';
import type { APIRoute } from 'astro';
import { createModuleLogger } from '../../lib/logger';

export const prerender = false;

const logger = createModuleLogger('API.Search');

/**
 * Server-side Full Text Search API
 * 
 * GET /api/search?q=query
 */
export const GET: APIRoute = async ({ url }) => {
    const query = url.searchParams.get('q');

    if (!query || query.trim().length < 2) {
        return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const searchTerm = query.trim();
        logger.info(`Searching for: ${searchTerm}`);

        // Use Postgres full text search
        // We use 'plainto_tsquery' which handles spaces as AND, and is generally safe for user input
        // The migration used 'simple' configuration
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

        logger.info(`Search results count: ${results.length}`);

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=60' // Cache search results for 1 minute
            }
        });

    } catch (error) {
        logger.error('Search failed:', error);
        return new Response(JSON.stringify({ error: 'Search failed', message: error instanceof Error ? error.message : String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
