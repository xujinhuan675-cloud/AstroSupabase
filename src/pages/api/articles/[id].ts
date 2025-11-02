import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";
import { eq } from "drizzle-orm";
import { articles } from "../../../db/schema";
import { db } from "../../../db/client";
import { z } from "zod";
import { createModuleLogger } from "../../../lib/logger";
import { ApiErrors, handleApiError } from "../../../lib/api-error";

const logger = createModuleLogger('API.Articles');

// Zod schema for article updates (PATCH)
const ArticleUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().min(1).optional(),
  authorId: z.string().optional(),
  featuredImage: z.string().optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

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
    const updateFields = ArticleUpdateSchema.parse(body);

    if (Object.keys(updateFields).length === 0) {
      return ApiErrors.badRequest('No updatable fields provided').toResponse();
    }

    const updated = await db
      .update(articles)
      .set({
        title: updateFields.title,
        slug: updateFields.slug,
        excerpt: updateFields.excerpt,
        content: updateFields.content,
        authorId: updateFields.authorId,
        featuredImage: updateFields.featuredImage,
        status: updateFields.status,
      })
      .where(eq(articles.id, id))
      .returning();

    if (!updated.length) {
      logger.warn(`[PATCH] No article found with ID ${id}`);
      return ApiErrors.notFound('Article').toResponse();
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

export const prerender = false;