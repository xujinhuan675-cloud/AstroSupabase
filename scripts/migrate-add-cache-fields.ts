/**
 * 数据库迁移脚本 - 添加 HTML 缓存字段
 * 直接通过代码执行，无需手动在 Supabase 控制台操作
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from '../src/db/schema.js';

// 加载环境变量
config();

// 直接创建数据库连接（避免 import.meta.env 问题）
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL 未在 .env 文件中设置');
  process.exit(1);
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });

async function migrate() {
  console.log('🔧 开始数据库迁移...\n');

  try {
    // 添加 html_content 字段
    console.log('📝 添加 html_content 字段...');
    await db.execute(sql`
      ALTER TABLE articles 
      ADD COLUMN IF NOT EXISTS html_content TEXT
    `);
    console.log('✓ html_content 字段添加成功\n');

    // 添加 reading_time 字段
    console.log('📝 添加 reading_time 字段...');
    await db.execute(sql`
      ALTER TABLE articles 
      ADD COLUMN IF NOT EXISTS reading_time TEXT
    `);
    console.log('✓ reading_time 字段添加成功\n');

    // 添加注释
    console.log('📝 添加字段注释...');
    await db.execute(sql`
      COMMENT ON COLUMN articles.html_content IS '缓存的 HTML 内容，避免每次都处理 Markdown'
    `);
    await db.execute(sql`
      COMMENT ON COLUMN articles.reading_time IS '缓存的阅读时间，如 "5 min read"'
    `);
    console.log('✓ 字段注释添加成功\n');

    // 验证字段是否添加成功
    console.log('🔍 验证迁移结果...');
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'articles' 
      AND column_name IN ('html_content', 'reading_time')
      ORDER BY column_name
    `);

    console.log('✓ 验证成功，找到以下字段：');
    console.log(result.rows);

    console.log('\n' + '='.repeat(50));
    console.log('✅ 数据库迁移完成！');
    console.log('='.repeat(50));
    console.log('\n📊 下一步：');
    console.log('1. 重启开发服务器: npm run dev');
    console.log('2. 访问文章页面测试性能');
    console.log('3. 运行缓存预热: npm run warm-cache');
    console.log('');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 迁移失败：');
    console.error(error.message);
    
    // 如果是字段已存在的错误，这是正常的
    if (error.message?.includes('already exists')) {
      console.log('\n💡 字段已经存在，迁移已完成！');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

// 运行迁移
migrate();

