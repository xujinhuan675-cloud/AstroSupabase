import { db } from '../../db/client';
import { articles, articleTags } from '../../db/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { createApiHandler, createAuthenticatedApiHandler, validateBody } from '../../lib/api-handler';
import { createModuleLogger } from '../../lib/logger';
import { getAllCategories, isValidCategory, type Category } from '../../lib/categories';
import { z } from 'zod';
import { updateArticleLinks } from '../../lib/links-service';
import { articleStatusValues, resolveArticleTimestamps } from '../../lib/article-markdown';

const logger = createModuleLogger('API.Articles');

const nullableDateSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([z.coerce.date(), z.null()]).optional()
);

// Zod schemas for validation
const ArticleCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/i).max(100).optional(),
  excerpt: z.string().max(500).optional(),
  content: z.string().min(1),
  authorId: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  featuredImage: z.preprocess(
    (value) => value === '' ? null : value,
    z.string().url().optional().nullable()
  ),
  status: z.enum(articleStatusValues).default('draft'),
  category: z.enum(getAllCategories() as [Category, ...Category[]]).optional().nullable(),
  createdAt: nullableDateSchema,
  updatedAt: nullableDateSchema,
  publishedAt: nullableDateSchema,
});

export const prerender = false;

function normalizeFeaturedImage(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * @description Handles GET requests to fetch all non-deleted articles with tags, ordered by published date descending.
 * @route /api/articles?category=math
 * @method GET
 * @param {string} [category] - Optional category filter query parameter
 * @returns {Response} JSON response containing an array of articles with tags or an error message.
 */
export const GET = createApiHandler(async (context) => {
  const categoryParam = context.url.searchParams.get('category');
  const category = categoryParam && isValidCategory(categoryParam)
    ? (categoryParam as Category)
    : undefined;
  
  logger.info('Fetching articles...', { category });
  
  const conditions = [eq(articles.isDeleted, false)];
  if (category) {
    conditions.push(eq(articles.category, category));
  }
  
  const articlesData = await db
    .select()
    .from(articles)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(articles.publishedAt));
  
  // 批量获取所有标签（优化 N+1 查询）
  const articleIds = articlesData.map(a => a.id);
  let tagsMap = new Map<number, string[]>();
  
  if (articleIds.length > 0) {
    const allTags = await db
      .select({ articleId: articleTags.articleId, tag: articleTags.tag })
      .from(articleTags)
      .where(inArray(articleTags.articleId, articleIds));
    
    for (const tag of allTags) {
      const existing = tagsMap.get(tag.articleId) || [];
      existing.push(tag.tag);
      tagsMap.set(tag.articleId, existing);
    }
  }
  
  // 为每篇文章添加标签
  const articlesWithTags = articlesData.map(article => ({
    ...article,
    tags: tagsMap.get(article.id) || [],
  }));
  
  logger.info(`Successfully fetched ${articlesWithTags.length} articles`);
  return articlesWithTags;
});

/**
 * @description Handles POST requests to create a new article. Requires authentication.
 * @route /api/articles
 * @method POST
 * @param {Request} request - The request object containing article data in JSON body.
 * @returns {Response} JSON response containing the created article or an error message.
 */
export const POST = createAuthenticatedApiHandler(
  async (context) => {
    const user = (context as any).user;
    const articleData = validateBody(
      (context as any).body,
      ArticleCreateSchema
    ) as z.infer<typeof ArticleCreateSchema>;
    
    logger.info('Creating article', { title: articleData.title, userId: user.id });
    
    // Generate slug if not provided
    let slug = articleData.slug;
    if (!slug && articleData.title) {
      slug = articleData.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-');
    }
    
    const timestamps = resolveArticleTimestamps({
      status: articleData.status,
      createdAt: articleData.createdAt,
      updatedAt: articleData.updatedAt,
      publishedAt: articleData.publishedAt,
    });
    const insertPayload: typeof articles.$inferInsert = {
      title: articleData.title,
      slug: slug || articleData.title.toLowerCase().replace(/\s+/g, '-'),
      excerpt: articleData.excerpt,
      content: articleData.content,
      authorId: articleData.authorId?.trim() || user.id,
      featuredImage: normalizeFeaturedImage(articleData.featuredImage),
      status: articleData.status,
      category: articleData.category,
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
      publishedAt: timestamps.publishedAt,
      isDeleted: false,
    };
    
    const inserted = await db
      .insert(articles)
      .values(insertPayload)
      .returning();
    
    const newArticle = inserted[0];
    
    // 更新链接和标签关系
    if (newArticle && articleData.content) {
      try {
        await updateArticleLinks(newArticle.id, articleData.content, {
          tags: articleData.tags,
        });
      } catch (error) {
        logger.warn('Failed to update article links', { articleId: newArticle.id, error });
      }
    }
    
    logger.info('Article created successfully', { articleId: newArticle.id });
    return newArticle;
  },
  {
    bodySchema: ArticleCreateSchema,
  }
);
