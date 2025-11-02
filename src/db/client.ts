import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema';
import { dbConfig } from '../config';

// 支持 Astro (import.meta.env) 和 Node.js (process.env)
// 注意：此模块仅在服务端使用，不导入 env.ts 避免客户端验证问题
const connectionString = 
  (typeof import.meta.env !== 'undefined' && import.meta.env.DATABASE_URL) ||
  process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
}

// Disable prefetch as it is not supported for "Transaction" pool mode
// 添加连接池配置以优化性能
const client = postgres(connectionString, {
  prepare: false,
  max: dbConfig.maxConnections,
  idle_timeout: dbConfig.idleTimeout,
  connect_timeout: dbConfig.connectTimeout,
});

export const db = drizzle(client, { schema });

export type Database = typeof db;