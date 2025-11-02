/**
 * API 处理工具函数
 * 提供统一的 API 路由处理逻辑，减少重复代码
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { ApiErrors, handleApiError, ApiError } from './api-error';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('APIHandler');

/**
 * API 上下文类型
 * 
 * 包含处理 API 请求所需的所有上下文信息
 */
export interface ApiContext {
  /** 路径参数（从 URL 中提取） */
  params?: Record<string, string | undefined>;
  /** 原始请求对象 */
  request: Request;
  /** 解析后的 URL 对象 */
  url: URL;
}

/**
 * API 处理器函数类型
 * 
 * @template T - 返回数据的类型
 */
export type ApiHandler<T = unknown> = (context: ApiContext) => Promise<T>;

/**
 * 创建 JSON 响应
 * 
 * @param data - 要序列化为 JSON 的数据
 * @param status - HTTP 状态码（默认 200）
 * @param headers - 额外的响应头
 * @returns JSON 格式的 HTTP 响应
 * @example
 * ```typescript
 * return jsonResponse({ message: 'Success' }, 200, { 'X-Custom': 'value' });
 * ```
 */
export function jsonResponse(
  data: unknown,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * 创建成功响应
 * 
 * 返回符合统一 API 响应格式的成功响应：`{ success: true, data: T }`
 * 
 * @param data - 响应数据
 * @param status - HTTP 状态码（默认 200）
 * @returns 统一格式的成功响应
 * @example
 * ```typescript
 * return successResponse({ id: 1, title: 'Article' });
 * // 返回: { success: true, data: { id: 1, title: 'Article' } }
 * ```
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): Response {
  return jsonResponse({ success: true, data }, status);
}

/**
 * 解析路径参数 ID（数字类型）
 * 
 * 从 URL 路径参数中提取并验证 ID，确保其为正整数
 * 
 * @param id - 路径参数值（可能是 undefined）
 * @param paramName - 参数名称（用于错误消息，默认 'id'）
 * @returns 解析后的正整数 ID
 * @throws {ApiError} 当参数缺失、不是数字或不是正数时抛出错误
 * @example
 * ```typescript
 * const articleId = parseIdParam(params.id); // 如果 params.id === "123"，返回 123
 * const tagId = parseIdParam(params.tagId, 'tagId');
 * ```
 */
export function parseIdParam(
  id: string | undefined,
  paramName: string = 'id'
): number {
  if (!id) {
    throw ApiErrors.badRequest(`Missing ${paramName} parameter`);
  }
  
  const parsed = z.coerce.number().int().positive().parse(id);
  return parsed;
}

/**
 * 验证请求体（使用 Zod schema）
 * 
 * 使用 Zod schema 验证并解析请求体，如果验证失败则抛出 ApiError
 * 
 * @template T - 验证后的数据类型
 * @param body - 待验证的请求体（未知类型）
 * @param schema - Zod 验证 schema
 * @returns 验证通过后的数据（类型为 T）
 * @throws {ApiError} 当验证失败时抛出验证错误
 * @example
 * ```typescript
 * const schema = z.object({ title: z.string(), content: z.string() });
 * const validated = validateBody(requestBody, schema);
 * // validated 的类型为 { title: string; content: string }
 * ```
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): T {
  try {
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiErrors.validationError(
        error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      );
    }
    throw error;
  }
}

/**
 * 创建统一的 API 处理器
 * 
 * 自动处理错误、验证和响应格式化。提供统一的 API 路由处理逻辑，
 * 减少重复代码并确保一致的错误处理和响应格式。
 * 
 * @template T - 处理器返回的数据类型
 * @param handler - API 处理函数，接收 ApiContext 并返回数据
 * @param options - 配置选项
 * @param options.requireAuth - 是否需要用户认证（默认 false）
 * @param options.bodySchema - 请求体验证的 Zod schema（可选）
 * @param options.onError - 自定义错误处理函数（可选）
 * @returns Astro API 路由处理函数
 * @example
 * ```typescript
 * export const GET = createApiHandler(async ({ params }) => {
 *   const id = parseIdParam(params.id);
 *   const article = await getArticleById(id);
 *   if (!article) throw ApiErrors.notFound('Article');
 *   return article;
 * });
 * 
 * export const POST = createApiHandler(
 *   async ({ body }) => {
 *     // body 已经通过 schema 验证
 *     return await createArticle(body);
 *   },
 *   {
 *     requireAuth: true,
 *     bodySchema: z.object({ title: z.string(), content: z.string() }),
 *   }
 * );
 * ```
 */
export function createApiHandler<T = unknown>(
  handler: ApiHandler<T>,
  options: {
    /** 是否需要认证 */
    requireAuth?: boolean;
    /** 请求体验证 schema */
    bodySchema?: z.ZodSchema<unknown>;
    /** 自定义错误处理 */
    onError?: (error: unknown, context: ApiContext) => Response;
  } = {}
): APIRoute {
  return async (context): Promise<Response> => {
    const { request, params } = context;
    const url = new URL(request.url);
    
    const apiContext: ApiContext = {
      params,
      request,
      url,
    };
    
    try {
      // 检查认证（如果需要）
      if (options.requireAuth) {
        const { supabase } = await import('./supabase');
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          logger.warn('Unauthorized API request', { url: url.pathname });
          return ApiErrors.unauthorized().toResponse();
        }
        
        // 将用户信息添加到上下文（可选）
        (apiContext as any).user = user;
      }
      
      // 验证请求体（如果提供了 schema）
      if (options.bodySchema && request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          const body = await request.json();
          const validated = validateBody(body, options.bodySchema);
          (apiContext as any).body = validated;
        } catch (error) {
          if (error instanceof ApiError) {
            return error.toResponse();
          }
          throw error;
        }
      }
      
      // 执行处理器
      const result = await handler(apiContext);
      
      // 返回成功响应
      return successResponse(result);
      
    } catch (error) {
      // 使用自定义错误处理（如果提供）
      if (options.onError) {
        return options.onError(error, apiContext);
      }
      
      // 默认错误处理
      return handleApiError(error);
    }
  };
}

/**
 * 创建需要认证的 API 处理器
 * 
 * 这是 `createApiHandler` 的便捷包装函数，自动设置 `requireAuth: true`
 * 
 * @template T - 处理器返回的数据类型
 * @param handler - API 处理函数
 * @param options - 配置选项（与 createApiHandler 相同，但 requireAuth 固定为 true）
 * @returns Astro API 路由处理函数
 * @example
 * ```typescript
 * export const DELETE = createAuthenticatedApiHandler(async ({ params }) => {
 *   const id = parseIdParam(params.id);
 *   await deleteArticle(id);
 *   return { message: 'Article deleted' };
 * });
 * ```
 */
export function createAuthenticatedApiHandler<T = unknown>(
  handler: ApiHandler<T>,
  options: {
    bodySchema?: z.ZodSchema<unknown>;
    onError?: (error: unknown, context: ApiContext) => Response;
  } = {}
): APIRoute {
  return createApiHandler(handler, {
    ...options,
    requireAuth: true,
  });
}

