import { db } from '../db/client';
import { articles, articleTags, type Article } from '../db/schema';
import { desc, eq, and } from 'drizzle-orm';
import type { Category } from './categories';

/**
 * Fetches a list of articles ordered by published date (descending).
 * Only returns published and non-deleted articles.
 * @param {number} [limit] - Optional maximum number of articles to fetch.
 * @param {Category} [category] - Optional category filter.
 * @returns {Promise<Article[]>} Resolves with an array of articles.
 */
export async function getArticles(limit?: number, category?: Category | null): Promise<Article[]> {
  const conditions = [
    eq(articles.status, 'published'),
    eq(articles.isDeleted, false),
  ];

  if (category) {
    conditions.push(eq(articles.category, category));
  }

  let query = db
    .select()
    .from(articles)
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt));

  if (limit) {
    return await query.limit(limit);
  }

  return await query;
}

export async function getLatestUpdatedArticles(limit: number): Promise<Article[]> {
  return await db
    .select()
    .from(articles)
    .where(and(
      eq(articles.status, 'published'),
      eq(articles.isDeleted, false)
    ))
    .orderBy(desc(articles.updatedAt))
    .limit(limit);
}

export async function getArticlesByTag(tag: string): Promise<Article[]> {
  const rows = await db
    .select()
    .from(articles)
    .innerJoin(articleTags, eq(articles.id, articleTags.articleId))
    .where(and(
      eq(articleTags.tag, tag),
      eq(articles.status, 'published'),
      eq(articles.isDeleted, false)
    ))
    .orderBy(desc(articles.publishedAt), desc(articles.id));

  return rows.map((row) => row.articles);
}

/**
 * Fetches a single article by its ID.
 * @param {number} id - The ID of the article to fetch.
 * @returns {Promise<Article | null>} Resolves with the article object or null if not found.
 */
export async function getArticleById(id: number): Promise<Article | null> {
  const result = await db
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1);

  return result[0] || null;
}
