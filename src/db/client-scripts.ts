/**
 * 数据库客户端 - 用于 Node.js 脚本
 * 使用 process.env 而不是 import.meta.env
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { config } from 'dotenv';

// 加载环境变量
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ 错误: DATABASE_URL 未设置');
  console.error('请确保 .env 文件存在并包含 DATABASE_URL');
  console.error('\n示例 .env 文件:');
  console.error('DATABASE_URL=postgresql://user:password@host:5432/database');
  process.exit(1);
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });

export type Database = typeof db;

