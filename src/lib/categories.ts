/**
 * 分类相关工具函数和常量
 */

/**
 * 分类类型定义
 */
export type Category = 'math' | 'physics' | 'chemistry' | 'biology' | 'computer' | 'literature';

/**
 * 分类信息接口
 */
export interface CategoryInfo {
  name: string;
  icon: string;
  description: string;
}

/**
 * 所有分类的配置信息
 */
export const categoryInfo: Record<Category, CategoryInfo> = {
  math: { name: '数学', icon: '📐', description: '数学相关的知识和学习笔记' },
  physics: { name: '物理', icon: '⚛️', description: '物理学原理和实验' },
  chemistry: { name: '化学', icon: '🧪', description: '化学知识和实验记录' },
  biology: { name: '生物', icon: '🧬', description: '生物学和生命科学' },
  computer: { name: '计算机', icon: '💻', description: '编程和计算机科学' },
  literature: { name: '文学', icon: '📚', description: '文学作品和语言学习' },
};

/**
 * 获取所有分类列表
 */
export function getAllCategories(): Category[] {
  return Object.keys(categoryInfo) as Category[];
}

/**
 * 获取分类信息
 */
export function getCategoryInfo(category: Category | string | null | undefined): CategoryInfo | null {
  if (!category || !(category in categoryInfo)) {
    return null;
  }
  return categoryInfo[category as Category];
}

/**
 * 验证分类是否有效
 */
export function isValidCategory(category: string | null | undefined): category is Category {
  return category !== null && category !== undefined && category in categoryInfo;
}

