import type { APIRoute } from 'astro';
import { getGraphData } from '../../lib/links-service';

export const GET: APIRoute = async () => {
  try {
    const graphData = await getGraphData();
    
    return new Response(JSON.stringify(graphData), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300' // 缓存 5 分钟
      },
    });
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      nodes: [],
      links: []
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

