import type { Article } from '../db/schema';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('API');

/**
 * 统一的 API 响应类型
 * 与后端 API 路由返回的格式保持一致
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 类型守卫：检查是否为成功响应
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return 'success' in response && response.success === true;
}

/**
 * 类型守卫：检查是否为错误响应
 */
export function isErrorResponse<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return 'success' in response && response.success === false;
}

/**
 * 获取所有文章列表
 * @returns 文章数组的 API 响应
 */
export async function fetchArticles(): Promise<ApiResponse<Article[]>> {
  try {
    logger.info('[GET] Fetching articles from /api/articles');
    const response = await fetch('/api/articles');
    logger.debug(`Response status: ${response.status}`);
    if (!response.ok) {
      logger.error(`Failed to fetch articles, status: ${response.status}`);
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Failed to fetch articles',
        code: errorData.code,
      };
    }
    const result = await response.json();
    logger.debug('Articles fetched successfully');
    
    // API 返回 { success: true, data: Article[] } 格式
    if (result.success && result.data) {
      return { success: true, data: result.data };
    }
    
    // 兼容旧格式（直接返回数组）
    if (Array.isArray(result)) {
      return { success: true, data: result };
    }
    
    return {
      success: false,
      error: 'Invalid response format',
      code: 'INVALID_FORMAT',
    };
  } catch (error) {
    logger.error('Error fetching articles:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch articles',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * 保存新文章
 * @param article - 要保存的文章数据（部分字段）
 * @returns 保存后的文章数据
 */
export async function saveArticle(article: Partial<Article>): Promise<ApiResponse<Article>> {
  try {
    logger.info('[POST] Saving article to /api/articles', article);
    const response = await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(article),
      credentials: 'same-origin',
    });

    logger.debug(`Response status: ${response.status}`);
    const result = await response.json();
    
    if (!response.ok) {
      logger.error(`Failed to save article, status: ${response.status}`);
      return {
        success: false,
        error: result.error || 'Failed to save article',
        code: result.code || 'SAVE_ERROR',
      };
    }

    logger.debug('Article saved successfully');
    
    // API 返回 { success: true, data: {...} } 格式
    if (result.success && result.data) {
      return { success: true, data: result.data };
    }
    
    return {
      success: false,
      error: 'Invalid response format',
      code: 'INVALID_FORMAT',
    };
  } catch (error) {
    logger.error('Error saving article:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save article',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * 删除文章（标记为已删除）
 * @param id - 文章 ID
 * @returns 删除操作的结果
 */
export async function deleteArticle(id: number): Promise<ApiResponse<{ success: boolean }>> {
  try {
    logger.info(`[DELETE] Deleting article with ID ${id} from /api/articles`);
    const response = await fetch(`/api/articles/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });

    logger.debug(`Response status: ${response.status}`);
    const result = await response.json();
    
    if (!response.ok) {
      logger.error(`Failed to delete article, status: ${response.status}`);
      return {
        success: false,
        error: result.error || 'Failed to delete article',
        code: result.code || 'DELETE_ERROR',
      };
    }

    logger.debug('Article deleted successfully');
    
    if (result.success) {
      return { success: true, data: { success: true } };
    }
    
    return {
      success: false,
      error: 'Invalid response format',
      code: 'INVALID_FORMAT',
    };
  } catch (error) {
    logger.error('Error deleting article:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete article',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * 更新文章
 * @param article - 要更新的文章数据（必须包含 id）
 * @returns 更新后的文章数据
 */
export async function updateArticle(article: Partial<Article>): Promise<ApiResponse<Article>> {
  try {
    logger.info(`[PATCH] Updating article ID ${article.id}`);
    const response = await fetch(`/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(article),
      credentials: 'same-origin',
    });

    logger.debug(`Response status: ${response.status}`);
    const result = await response.json();
    
    if (!response.ok) {
      logger.error(`Failed to update article, status: ${response.status}`);
      return {
        success: false,
        error: result.error || 'Failed to update article',
        code: result.code || 'UPDATE_ERROR',
      };
    }

    logger.debug('Article updated successfully');
    
    // API 返回 { success: true, data: {...} } 格式
    if (result.success && result.data) {
      return { success: true, data: result.data };
    }
    
    return {
      success: false,
      error: 'Invalid response format',
      code: 'INVALID_FORMAT',
    };
  } catch (error) {
    logger.error('Error updating article:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update article',
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * 获取单篇文章
 * @param id - 文章 ID
 * @returns 文章数据的 API 响应
 */
export async function fetchArticle(id: number): Promise<ApiResponse<Article>> {
  try {
    // 服务端需要完整的 URL，客户端可以使用相对路径
    const isServer = typeof window === 'undefined';
    const baseUrl = isServer 
      ? (import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321')
      : '';
    const url = `${baseUrl}/api/articles/${id}`;
    
    logger.info(`[GET] Fetching article with ID ${id} from ${url}`);
    const response = await fetch(url, {
      credentials: 'same-origin',
    });

    logger.debug(`Response status: ${response.status}`);
    const result = await response.json();
    
    if (!response.ok) {
      logger.error(`Failed to fetch article, status: ${response.status}`);
      return {
        success: false,
        error: result.error || 'Failed to fetch article',
        code: result.code || 'FETCH_ERROR',
      };
    }

    logger.debug('Article fetched successfully');
    
    // API 返回 { success: true, data: {...} } 格式
    if (result.success && result.data) {
      return { success: true, data: result.data };
    }
    
    return {
      success: false,
      error: 'Invalid response format',
      code: 'INVALID_FORMAT',
    };
  } catch (error) {
    logger.error('Error fetching article:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch article',
      code: 'NETWORK_ERROR',
    };
  }
}
