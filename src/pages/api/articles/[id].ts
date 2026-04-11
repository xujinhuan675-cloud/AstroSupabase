import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { eq } from "drizzle-orm";
import { articles } from "../../../db/schema";
import { db } from "../../../db/client";
import { z } from "zod";
import { createModuleLogger } from "../../../lib/logger";
import { ApiErrors, handleApiError } from "../../../lib/api-error";
import { updateArticleLinks } from "../../../lib/links-service";
import { getAllCategories, type Category } from "../../../lib/categories";
import { articleStatusValues } from "../../../lib/article-markdown";

export const prerender = false;

const logger = createModuleLogger('API.Articles');

const nullableDateSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.union([z.coerce.date(), z.null()]).optional()
);

// Zod schema for article updates (PATCH)
const ArticleUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1).optional(),
  authorId: z.string().optional(),
  tags: z.array(z.string().min(1)).optional(),
  featuredImage: z.preprocess(
    (value) => value === '' ? null : value,
    z.string().url().optional().nullable()
  ),
  status: z.enum(articleStatusValues).optional(),
  category: z.enum(getAllCategories() as [Category, ...Category[]]).optional().nullable(),
  publishedAt: nullableDateSchema,
  updatedAt: nullableDateSchema,
});

function normalizeOptionalFeaturedImage(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === 'string' ? value : null;
}

/**
 * @description Handles GET requests to fetch a single article by ID.
 * @route /api/articles/[id]
 * @method GET
 */
export const GET: APIRoute = async ({ params }) => {
  try {
    logger.info("Incoming article fetch request");
    const id = z.coerce.number().int().positive().parse(params.id);

    logger.debug(`Fetching article ID ${id}`);
    const data = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!data.length) {
      logger.warn(`No article found with ID ${id}`);
      return ApiErrors.notFound('Article').toResponse();
    }

    logger.debug(`Article ID ${id} fetched successfully`);
    return new Response(JSON.stringify({
      success: true,
      data: data[0],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiErrors.validationError(error.errors.map(e => e.message).join(', ')).toResponse();
    }
    return handleApiError(error);
  }
};

/**
 * @description Handles PATCH requests to update an article. Requires authentication.
 * @route /api/articles/[id]
 * @method PATCH
 */
export const PATCH: APIRoute = async ({ request, params }) => {
  try {
    logger.info("Incoming article update request");
    const user = await supabase.auth.getUser();
    if (!user.data.user) {
      logger.warn('Unauthorized attempt to update article');
      return ApiErrors.unauthorized().toResponse();
    }

    const id = z.coerce.number().int().positive().parse(params.id);

    const body = await request.json();
    const updateFields = ArticleUpdateSchema.parse(body) as z.infer<typeof ArticleUpdateSchema>;

    if (Object.keys(updateFields).length === 0) {
      return ApiErrors.badRequest('No updatable fields provided').toResponse();
    }

    const existing = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id))
      .limit(1);

    if (!existing.length) {
      logger.warn(`[PATCH] No article found with ID ${id}`);
      return ApiErrors.notFound('Article').toResponse();
    }

    const currentArticle = existing[0];
    const now = new Date();
    const normalizedFeaturedImage = normalizeOptionalFeaturedImage(updateFields.featuredImage);
    const contentChanged =
      typeof updateFields.content === 'string' &&
      updateFields.content !== currentArticle.content;
    const shouldSyncRelations = contentChanged || updateFields.tags !== undefined;

    const nextStatus = updateFields.status ?? currentArticle.status;
    const nextPublishedAt =
      updateFields.publishedAt !== undefined
        ? updateFields.publishedAt
        : nextStatus === 'published' && !currentArticle.publishedAt
          ? now
          : currentArticle.publishedAt;
    const nextUpdatedAt = updateFields.updatedAt ?? now;

    const updated = await db
      .update(articles)
      .set({
        title: updateFields.title,
        slug: updateFields.slug,
        excerpt: updateFields.excerpt,
        content: updateFields.content,
        authorId: updateFields.authorId?.trim() || currentArticle.authorId,
        featuredImage: normalizedFeaturedImage,
        status: updateFields.status,
        category: updateFields.category,
        publishedAt: nextPublishedAt,
        updatedAt: nextUpdatedAt,
        htmlContent: contentChanged ? null : currentArticle.htmlContent,
        readingTime: contentChanged ? null : currentArticle.readingTime,
      })
      .where(eq(articles.id, id))
      .returning();

    if (shouldSyncRelations && updated[0]?.content) {
      try {
        await updateArticleLinks(id, updated[0].content, {
          tags: updateFields.tags,
        });
      } catch (error) {
        logger.warn('Failed to refresh article links after update', { articleId: id, error });
      }
    }

    logger.info(`[PATCH] Article ID ${id} updated by user ${user.data.user.id}`);
    return new Response(JSON.stringify({
      success: true,
      data: updated[0],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiErrors.validationError(error.errors.map(e => e.message).join(', ')).toResponse();
    }
    return handleApiError(error);
  }
};

/**
 * @description Handles DELETE requests to mark an article as deleted.
 * @route /api/articles/[id]
 * @method DELETE
 */
export const DELETE: APIRoute = async ({ params }) => {
  try {
    logger.info('[DELETE] Incoming article delete request');
    const id = z.coerce.number().int().positive().parse(params.id);

    logger.debug(`[DELETE] Marking article ID ${id} as deleted`);
    const now = new Date();
    const result = await db
      .update(articles)
      .set({ isDeleted: true, deletedAt: now })
      .where(eq(articles.id, id))
      .returning();

    if (!result.length) {
      logger.warn(`[DELETE] No article found with ID ${id} to delete`);
      return ApiErrors.notFound('Article').toResponse();
    }

    logger.info(`[DELETE] Article ID ${id} marked as deleted`);
    return new Response(JSON.stringify({
      success: true,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiErrors.validationError(error.errors.map(e => e.message).join(', ')).toResponse();
    }
    return handleApiError(error);
  }
};
