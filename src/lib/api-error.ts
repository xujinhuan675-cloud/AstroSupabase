/**
 * API 错误处理工具
 * 提供统一的错误响应格式
 */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * 转换为 HTTP Response
   */
  toResponse(): Response {
    return new Response(
      JSON.stringify({
        success: false,
        error: this.message,
        code: this.code,
      }),
      {
        status: this.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * 常用的 API 错误
 */
export const ApiErrors = {
  notFound: (resource: string = 'Resource') => 
    new ApiError(404, `${resource} not found`, 'NOT_FOUND'),
  
  unauthorized: () => 
    new ApiError(401, 'Unauthorized', 'UNAUTHORIZED'),
  
  forbidden: () => 
    new ApiError(403, 'Forbidden', 'FORBIDDEN'),
  
  badRequest: (message: string = 'Bad request') => 
    new ApiError(400, message, 'BAD_REQUEST'),
  
  internalError: (message: string = 'Internal server error') => 
    new ApiError(500, message, 'INTERNAL_ERROR'),
  
  validationError: (message: string = 'Validation failed') => 
    new ApiError(400, message, 'VALIDATION_ERROR'),
};

/**
 * 处理 API 路由错误的辅助函数
 */
export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return error.toResponse();
  }

  // 未知错误
  console.error('Unhandled API error:', error);
  return ApiErrors.internalError(
    error instanceof Error ? error.message : 'Unknown error'
  ).toResponse();
}

