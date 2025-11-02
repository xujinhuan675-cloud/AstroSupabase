import { getAllTags } from '../../../lib/links-service';
import { createApiHandler } from '../../../lib/api-handler';
import { createModuleLogger } from '../../../lib/logger';

const logger = createModuleLogger('API.Tags');

/**
 * @description Handles GET requests to fetch all tags
 * @route /api/tags
 * @method GET
 */
export const GET = createApiHandler(async () => {
  logger.info('Fetching all tags');
  const tags = await getAllTags();
  
  logger.debug(`Successfully fetched ${tags.length} tags`);
  return {
    tags,
    total: tags.length,
  };
}, {
  onError: (error, context) => {
    logger.error('Error fetching tags:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error',
      tags: [],
      total: 0
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  },
});

