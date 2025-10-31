/**
 * 添加性能优化索引
 * 执行 migrations/add_performance_indexes.sql
 */

import * as fs from 'fs';
import * as path from 'path';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

async function addIndexes() {
  const sql = postgres(databaseUrl);

  try {
    console.log('🚀 开始添加性能优化索引...\n');

    // 直接定义索引创建语句（避免 SQL 文件解析问题）
    const indexes = [
      {
        name: 'idx_articles_status_published_date',
        sql: `CREATE INDEX IF NOT EXISTS idx_articles_status_published_date 
              ON articles(status, is_deleted, published_at DESC) 
              WHERE status = 'published' AND is_deleted = false`
      },
      {
        name: 'idx_articles_slug',
        sql: `CREATE INDEX IF NOT EXISTS idx_articles_slug 
              ON articles(slug) 
              WHERE status = 'published'`
      },
      {
        name: 'idx_articles_published_at',
        sql: `CREATE INDEX IF NOT EXISTS idx_articles_published_at 
              ON articles(published_at DESC NULLS LAST)`
      },
      {
        name: 'idx_article_tags_article_id',
        sql: `CREATE INDEX IF NOT EXISTS idx_article_tags_article_id 
              ON article_tags(article_id)`
      },
      {
        name: 'idx_article_tags_tag',
        sql: `CREATE INDEX IF NOT EXISTS idx_article_tags_tag 
              ON article_tags(tag)`
      },
      {
        name: 'idx_article_links_source',
        sql: `CREATE INDEX IF NOT EXISTS idx_article_links_source 
              ON article_links(source_id)`
      },
      {
        name: 'idx_article_links_target',
        sql: `CREATE INDEX IF NOT EXISTS idx_article_links_target 
              ON article_links(target_id)`
      },
      {
        name: 'idx_article_links_source_target',
        sql: `CREATE INDEX IF NOT EXISTS idx_article_links_source_target 
              ON article_links(source_id, target_id)`
      },
    ];

    let successCount = 0;
    let skipCount = 0;

    // 逐个执行索引创建
    for (const index of indexes) {
      try {
        await sql.unsafe(index.sql);
        console.log(`✅ 索引已创建: ${index.name}`);
        successCount++;
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  索引已存在: ${index.name}`);
          skipCount++;
        } else {
          console.error(`❌ 创建失败 ${index.name}:`, error.message);
        }
      }
    }

    // 分析表统计信息
    console.log(`\n📊 分析表统计信息...`);
    try {
      await sql.unsafe('ANALYZE articles');
      await sql.unsafe('ANALYZE article_tags');
      await sql.unsafe('ANALYZE article_links');
      console.log(`✅ 表分析完成`);
    } catch (error: any) {
      console.log(`⚠️  表分析失败:`, error.message);
    }

    console.log(`\n📊 总结:`);
    console.log(`   ✅ 成功创建: ${successCount} 个索引`);
    console.log(`   ⏭️  已存在: ${skipCount} 个索引`);
    console.log(`\n🎉 性能优化索引添加完成！`);
    console.log(`\n💡 提示: 可以使用以下命令查看索引使用情况:`);
    console.log(`   npm run diagnose\n`);

  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

addIndexes();

