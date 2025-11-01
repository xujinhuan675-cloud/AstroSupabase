/**
 * Quartz Graph 类型定义
 * 与 Quartz-4 的图谱组件类型保持一致
 */

export type SimpleSlug = string;
export type FullSlug = string;

/**
 * Quartz ContentDetails 类型
 * 与 Quartz 的 ContentDetails 保持一致
 * 扩展添加 id 字段以支持 AstroSupabase 的路由系统
 */
export type ContentDetails = {
  slug: FullSlug;
  filePath: string;
  title: string;
  links: SimpleSlug[];
  tags: string[];
  content: string;
  id?: number;  // 文章 ID（AstroSupabase 特有，用于路由跳转）
};

/**
 * D3 配置选项
 * 控制图谱的显示和行为
 */
export interface D3Config {
  /** 是否启用节点拖拽 */
  drag: boolean;
  
  /** 是否启用缩放 */
  zoom: boolean;
  
  /** 深度过滤：-1 显示所有节点，0+ 显示指定深度的邻居节点 */
  depth: number;
  
  /** 缩放比例 */
  scale: number;
  
  /** 排斥力强度（节点之间的排斥力） */
  repelForce: number;
  
  /** 中心力强度（节点向中心聚集的力） */
  centerForce: number;
  
  /** 链接距离 */
  linkDistance: number;
  
  /** 字体大小（相对值） */
  fontSize: number;
  
  /** 透明度缩放（控制标签显示） */
  opacityScale: number;
  
  /** 要移除的标签列表 */
  removeTags: string[];
  
  /** 是否显示标签节点 */
  showTags: boolean;
  
  /** 悬停时聚焦（淡出非相关节点） */
  focusOnHover?: boolean;
  
  /** 是否启用径向布局 */
  enableRadial?: boolean;
}

/**
 * 图谱选项配置
 */
export interface GraphOptions {
  /** 局部图谱配置 */
  localGraph?: Partial<D3Config>;
  
  /** 全局图谱配置 */
  globalGraph?: Partial<D3Config>;
}
