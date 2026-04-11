import { sequence } from 'astro:middleware';
import { supabase } from './lib/supabase';

const protectedRoutes = ['/dashboard'];
const authRoutes = ['/auth/login', '/auth/signup'];

/**
 * 写操作 API 路由（需要认证）
 */
const writeApiRoutes = [
  '/api/articles',        // POST/PATCH/DELETE 文章
  '/api/tasks',          // POST/PATCH/DELETE 任务
];

/**
 * 检查是否为写操作
 */
function isWriteOperation(method: string): boolean {
  return ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
}

/**
 * 检查路径是否为写操作 API
 */
function isWriteApiRoute(pathname: string): boolean {
  return writeApiRoutes.some(route => pathname.startsWith(route));
}

export const onRequest = sequence(async ({ locals, url, redirect, request }, next) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  // Add the user to the locals
  locals.user = session?.user || null;
  
  // Check if the current path is protected
  const isProtectedRoute = protectedRoutes.some(route => url.pathname.startsWith(route));
  const isAuthRoute = authRoutes.includes(url.pathname);
  const isApiRoute = url.pathname.startsWith('/api/');
  const method = request.method;
  const isWrite = isWriteOperation(method);
  
  // API 路由处理：写操作需要认证，读操作根据路由决定
  if (isApiRoute) {
    // 写操作必须认证
    if (isWrite && isWriteApiRoute(url.pathname) && !session) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // 允许公共 API 的读操作
    // 写操作和需要认证的读操作已在 createApiHandler 中处理
  }
  
  // Redirect to login if trying to access protected route without session
  if (isProtectedRoute && !session) {
    return redirect('/auth/login');
  }
  
  // Redirect to dashboard if trying to access auth route with active session
  if (isAuthRoute && session) {
    return redirect('/dashboard');
  }
  
  return next();
});
