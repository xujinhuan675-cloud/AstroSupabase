/**
 * 统一的日志管理工具
 * 开发环境显示所有日志，生产环境只显示错误
 */

const isDev = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

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

