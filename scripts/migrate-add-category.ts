/**
 * 数据库迁移脚本：添加 category 字段
 * 
 * 使用方法：
 * 1. 确保 .env 文件中配置了 DATABASE_URL
 * 2. 运行: npm run tsx scripts/migrate-add-category.ts
 * 
 * 或者使用 Drizzle Kit:
 * npm run db:push
 */

import postgres from 'postgres';
import { config } from 'dotenv';

// 加载环境变量
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ 错误: DATABASE_URL 未在 .env 文件中设置');
  console.error('请确保 .env 文件存在并包含 DATABASE_URL');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

async function migrate() {
  try {
    console.log('🔄 开始执行迁移：添加 category 字段...\n');

    // 检查字段是否已存在
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'articles' AND column_name = 'category'
    `;
    
    if (checkColumn.length > 0) {
      console.log('   ℹ️  category 列已存在，跳过添加\n');
    } else {
      // 添加 category 列（先不加约束）
      console.log('1. 添加 category 列...');
      await sql`
        ALTER TABLE articles 
        ADD COLUMN category TEXT
      `;
      console.log('   ✅ category 列已添加\n');

      // 添加 CHECK 约束
      console.log('1.2. 添加 category 约束...');
      await sql`
        ALTER TABLE articles 
        ADD CONSTRAINT articles_category_check 
        CHECK (category IN ('math', 'physics', 'chemistry', 'biology', 'computer', 'literature') OR category IS NULL)
      `;
      console.log('   ✅ 约束已添加\n');
    }

    // 创建索引
    console.log('2. 创建 category 索引...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_articles_category 
      ON articles(category) 
      WHERE category IS NOT NULL
    `;
    console.log('   ✅ 索引已创建\n');

    // 添加注释
    console.log('3. 添加字段注释...');
    await sql`
      COMMENT ON COLUMN articles.category IS 'Article category: math, physics, chemistry, biology, computer, or literature'
    `;
    console.log('   ✅ 注释已添加\n');

    console.log('✅ 迁移完成！category 字段已成功添加到 articles 表。\n');
    
    // 查询验证
    console.log('📊 验证结果:');
    const result = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'articles' AND column_name = 'category'
    `;
    
    if (result.length > 0) {
      console.log('   ✅ 字段已存在:', result[0]);
    } else {
      console.log('   ⚠️  警告: 未找到 category 字段');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    if (error instanceof Error) {
      console.error('   错误信息:', error.message);
    }
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();

