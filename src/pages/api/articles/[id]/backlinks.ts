import type { APIRoute } from 'astro';
import { getBacklinks } from '../../../../lib/links-service';

export const GET: APIRoute = async ({ params }) => {
  const articleId = parseInt(params.id || '0');

  if (!articleId || isNaN(articleId)) {
    return new Response(JSON.stringify({ 
      error: 'Invalid article ID',
      backlinks: [] 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const backlinks = await getBacklinks(articleId);
    
    return new Response(JSON.stringify({ 
      backlinks,
      count: backlinks.length 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching backlinks:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      backlinks: [] 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

