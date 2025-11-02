/**
 * 环境变量验证和管理
 * 使用 Zod 进行类型安全的配置验证
 * 
 * 注意：此模块主要用于服务端，客户端环境会有不同的验证规则
 */

import { z } from 'zod';

/**
 * 检查是否在服务端环境
 */
const isServer = typeof window === 'undefined';

/**
 * 服务端环境变量 Schema（包含 DATABASE_URL）
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url({
    message: 'DATABASE_URL must be a valid URL',
  }),
  PUBLIC_SUPABASE_URL: z.string().url({
    message: 'PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'PUBLIC_SUPABASE_ANON_KEY is required',
  }),
  PUBLIC_SITE_URL: z
    .string()
    .url({
      message: 'PUBLIC_SITE_URL must be a valid URL',
    })
    .optional()
    .default('http://localhost:4321'),
});

/**
 * 客户端环境变量 Schema（不包含 DATABASE_URL）
 */
const clientEnvSchema = serverEnvSchema.omit({ DATABASE_URL: true });

/**
 * 获取并验证环境变量
 * 在客户端环境中，DATABASE_URL 不是必需的
 */
function getEnv() {
  const rawEnv = {
    DATABASE_URL:
      (typeof import.meta.env !== 'undefined' && import.meta.env.DATABASE_URL) ||
      process.env.DATABASE_URL,
    PUBLIC_SUPABASE_URL:
      typeof import.meta.env !== 'undefined'
        ? import.meta.env.PUBLIC_SUPABASE_URL
        : process.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY:
      typeof import.meta.env !== 'undefined'
        ? import.meta.env.PUBLIC_SUPABASE_ANON_KEY
        : process.env.PUBLIC_SUPABASE_ANON_KEY,
    PUBLIC_SITE_URL:
      typeof import.meta.env !== 'undefined'
        ? import.meta.env.PUBLIC_SITE_URL
        : process.env.PUBLIC_SITE_URL,
  };

  // 根据环境选择不同的 schema
  const schema = isServer ? serverEnvSchema : clientEnvSchema;

  try {
    return schema.parse(rawEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `Environment variable validation failed:\n${errorMessages}\n\nPlease check your .env file or environment variables.`
      );
    }
    throw error;
  }
}

/**
 * 验证后的环境变量（类型安全）
 * 注意：仅在服务端环境导出 env，客户端不应使用此模块
 */
let envCache: z.infer<typeof serverEnvSchema> | null = null;

export const env: z.infer<typeof serverEnvSchema> = (() => {
  // 仅在服务端环境执行验证
  if (isServer) {
    if (!envCache) {
      envCache = getEnv() as z.infer<typeof serverEnvSchema>;
    }
    return envCache;
  }
  // 客户端环境返回一个安全的默认值（不会实际使用）
  return {
    DATABASE_URL: '',
    PUBLIC_SUPABASE_URL: '',
    PUBLIC_SUPABASE_ANON_KEY: '',
    PUBLIC_SITE_URL: 'http://localhost:4321',
  } as z.infer<typeof serverEnvSchema>;
})();

/**
 * 环境类型定义
 */
export type Env = z.infer<typeof serverEnvSchema>;

