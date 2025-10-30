import type { APIRoute } from 'astro';
import { getForwardLinks } from '../../../../lib/links-service';

export const GET: APIRoute = async ({ params }) => {
  const articleId = parseInt(params.id || '0');

  if (!articleId || isNaN(articleId)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid article ID',
      forwardLinks: [] 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const forwardLinks = await getForwardLinks(articleId);
    
    return new Response(JSON.stringify({ 
      forwardLinks,
      count: forwardLinks.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching forward links:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      forwardLinks: [] 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

