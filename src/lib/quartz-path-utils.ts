/**
 * Quartz 路径工具函数（简化版）
 * 适配 AstroSupabase 的路径系统
 */

export type SimpleSlug = string;
export type FullSlug = string;
export type RelativeURL = string;

/**
 * 简化 slug（去除前缀等）
 * 在 AstroSupabase 中，slug 已经是简化形式
 */
export function simplifySlug(slug: FullSlug | SimpleSlug): SimpleSlug {
  // 移除开头的斜杠和 "articles/" 前缀
  return slug.replace(/^\/?(articles\/)?/, '').replace(/\/$/, '') || '/';
}

/**
 * 从当前页面获取完整的 slug
 */
export function getFullSlug(): FullSlug {
  if (typeof window === 'undefined') return '';
  
  // 从 URL 路径中提取
  const path = window.location.pathname;
  
  // 匹配 /articles/[slug] 格式
  const match = path.match(/\/articles\/([^/]+)/);
  if (match) {
    return match[1];
  }
  
  // 如果是根路径，返回空或 index
  if (path === '/' || path === '') {
    return 'index';
  }
  
  return simplifySlug(path);
}

/**
 * 解析相对路径
 * 从当前 slug 解析到目标 slug 的相对路径
 */
export function resolveRelative(current: FullSlug, target: FullSlug | SimpleSlug): RelativeURL {
  // 简化处理：直接返回目标 slug 的路径
  const targetSlug = simplifySlug(target as FullSlug);
  return `/articles/${targetSlug}`;
}

/**
 * 获取路径到根目录的路径
 */
export function pathToRoot(slug: FullSlug): string {
  // 对于文章页面，返回到根目录的路径
  return '../../';
}

/**
 * 连接路径段
 */
export function joinSegments(...segments: string[]): string {
  return segments
    .filter(s => s && s.length > 0)
    .join('/')
    .replace(/\/+/g, '/');
}
