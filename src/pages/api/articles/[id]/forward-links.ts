import { getForwardLinks } from '../../../../lib/links-service';
import { createApiHandler, parseIdParam } from '../../../../lib/api-handler';
import { createModuleLogger } from '../../../../lib/logger';

const logger = createModuleLogger('API.ForwardLinks');

/**
 * @description Handles GET requests to fetch forward links for an article
 * @route /api/articles/[id]/forward-links
 * @method GET
 */
export const GET = createApiHandler(async (context) => {
  const articleId = parseIdParam(context.params?.id, 'article id');
  
  logger.info('Fetching forward links', { articleId });
  const forwardLinks = await getForwardLinks(articleId);
  
  logger.debug(`Successfully fetched ${forwardLinks.length} forward links`);
  return {
    forwardLinks,
    count: forwardLinks.length,
  };
});

