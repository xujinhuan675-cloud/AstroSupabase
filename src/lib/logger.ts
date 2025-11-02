/**
 * 统一的日志管理工具
 * 开发环境显示所有日志，生产环境只显示错误
 */
// 兼容 Astro/Vite 与 Node（Vercel 构建/运行时）环境
// - 在浏览器或 Astro SSR 中使用 import.meta.env
// - 在 Node 环境（例如 tsx 脚本、Vercel 构建钩子）使用 process.env
const astroEnv: any = (import.meta as any).env || {};
const isDev: boolean = astroEnv?.DEV ?? (process.env.NODE_ENV !== 'production');
const isProduction: boolean = astroEnv?.PROD ?? (process.env.NODE_ENV === 'production');

export interface Logger {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * 日志工具实例
 */
export const logger: Logger = {
  /**
   * 信息日志 - 仅在开发环境显示
   */
  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * 错误日志 - 始终显示（生产环境也需要记录错误）
   */
  error: (...args: unknown[]) => {
    console.error(...args);
    // TODO: 后续可以集成错误追踪服务（如 Sentry）
  },

  /**
   * 警告日志 - 仅在开发环境显示
   */
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * 调试日志 - 仅在开发环境显示
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};

/**
 * 带前缀的日志工具（用于特定模块）
 */
export function createModuleLogger(moduleName: string): Logger {
  return {
    info: (...args: unknown[]) => logger.info(`[${moduleName}]`, ...args),
    error: (...args: unknown[]) => logger.error(`[${moduleName}]`, ...args),
    warn: (...args: unknown[]) => logger.warn(`[${moduleName}]`, ...args),
    debug: (...args: unknown[]) => logger.debug(`[${moduleName}]`, ...args),
  };
}

