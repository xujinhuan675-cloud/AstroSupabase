import { getBacklinks } from '../../../../lib/links-service';
import { createApiHandler, parseIdParam } from '../../../../lib/api-handler';
import { createModuleLogger } from '../../../../lib/logger';

const logger = createModuleLogger('API.Backlinks');

/**
 * @description Handles GET requests to fetch backlinks for an article
 * @route /api/articles/[id]/backlinks
 * @method GET
 */
export const GET = createApiHandler(async (context) => {
  const articleId = parseIdParam(context.params?.id, 'article id');
  
  logger.info('Fetching backlinks', { articleId });
  const backlinks = await getBacklinks(articleId);
  
  logger.debug(`Successfully fetched ${backlinks.length} backlinks`);
  return {
    backlinks,
    count: backlinks.length,
  };
});

