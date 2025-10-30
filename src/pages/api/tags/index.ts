import type { APIRoute } from 'astro';
import { getAllTags } from '../../../lib/links-service';

export const GET: APIRoute = async () => {
  try {
    const tags = await getAllTags();
    
    return new Response(JSON.stringify({ 
      tags,
      total: tags.length 
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600' // 缓存 10 分钟
      },
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      tags: [],
      total: 0
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

