/**
 * 应用配置集中管理
 */

import type { D3Config } from '../types/graph-quartz';

/**
 * 应用基础配置
 * 注意：不直接导入 env，避免在客户端环境导入服务端变量
 */
export const appConfig = {
  name: 'Digital Garden',
  url: typeof import.meta.env !== 'undefined' 
    ? import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321'
    : 'http://localhost:4321',
  version: '1.0.0',
} as const;

/**
 * 图谱默认配置
 */
export const graphConfig = {
  defaultLocal: {
    drag: true,
    zoom: true,
    depth: 1,
    scale: 1.1,
    repelForce: 1.5,
    centerForce: 0.3,
    linkDistance: 45,
    fontSize: 0.75,
    opacityScale: 1,
    showTags: true,
    removeTags: [],
    focusOnHover: false,
    enableRadial: false,
  } as Partial<D3Config>,

  defaultGlobal: {
    drag: true,
    zoom: true,
    depth: -1,
    scale: 0.9,
    repelForce: 1.2,
    centerForce: 0.2,
    linkDistance: 45,
    fontSize: 0.7,
    opacityScale: 1,
    showTags: true,
    removeTags: [],
    focusOnHover: true,
    enableRadial: true,
  } as Partial<D3Config>,
} as const;

/**
 * 缓存配置
 */
export const cacheConfig = {
  contentIndexTTL: 5 * 60 * 1000, // 5 分钟
  markdownTTL: 10 * 60 * 1000, // 10 分钟
  maxCacheSize: 100, // 最大缓存条目数
} as const;

/**
 * API 配置
 */
export const apiConfig = {
  defaultLimit: 20,
  maxLimit: 100,
  timeout: 30000, // 30 秒
} as const;

/**
 * 数据库配置
 */
export const dbConfig = {
  maxConnections: 10,
  idleTimeout: 20, // 秒
  connectTimeout: 10, // 秒
} as const;

