import type { APIRoute } from 'astro';
import { getArticlesByTag } from '../../../lib/links-service';

export const GET: APIRoute = async ({ params }) => {
  const tag = params.tag;

  if (!tag) {
    return new Response(JSON.stringify({ 
      error: 'Tag parameter is required',
      articles: [] 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const articles = await getArticlesByTag(decodeURIComponent(tag));
    
    return new Response(JSON.stringify({ 
      tag,
      articles,
      count: articles.length 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 缓存 5 分钟
      },
    });
  } catch (error) {
    console.error('Error fetching articles by tag:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      articles: [],
      count: 0
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

