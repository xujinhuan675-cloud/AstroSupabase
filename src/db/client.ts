
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema';

// 支持 Astro (import.meta.env) 和 Node.js (process.env)
const connectionString = 
  (typeof import.meta.env !== 'undefined' && import.meta.env.DATABASE_URL) ||
  process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is not set in .env');
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false })

export const db = drizzle(client, { schema });

export type Database = typeof db;