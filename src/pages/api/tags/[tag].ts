import { getArticlesByTag } from '../../../lib/links-service';
import { createApiHandler, parseIdParam } from '../../../lib/api-handler';
import { ApiErrors } from '../../../lib/api-error';
import { createModuleLogger } from '../../../lib/logger';

export const prerender = false;

const logger = createModuleLogger('API.Tags');

/**
 * @description Handles GET requests to fetch articles by tag
 * @route /api/tags/[tag]
 * @method GET
 */
export const GET = createApiHandler(async (context) => {
  const tag = context.params?.tag;

  if (!tag) {
    throw ApiErrors.badRequest('Tag parameter is required');
  }

  logger.info('Fetching articles by tag', { tag });
  const decodedTag = decodeURIComponent(tag);
  const articles = await getArticlesByTag(decodedTag);
  
  logger.debug(`Successfully fetched ${articles.length} articles for tag: ${decodedTag}`);
  return {
    tag: decodedTag,
    articles,
    count: articles.length,
  };
}, {
  onError: (error, context) => {
    logger.error('Error fetching articles by tag:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      articles: [],
      count: 0
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  },
});

