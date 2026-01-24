/**
 * 部署后自动修复脚本
 * 
 * 功能：
 * 1. 检查搜索向量是否存在
 * 2. 如果不存在，自动重建
 * 3. 验证修复结果
 * 
 * 使用场景：
 * - Vercel 部署后自动运行
 * - 确保搜索功能正常
 */

import * as dotenv from 'dotenv';
import { sql, and, eq } from 'drizzle-orm';

// Load environment variables FIRST
dotenv.config();

// Dynamically import db client after env vars are loaded
const { db } = await import('../src/db/client');
const { articles } = await import('../src/db/schema');

async function checkAndFix() {
  console.log('🔍 检查搜索功能状态...\n');

  try {
    // 1. 检查是否有文章
    const totalCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(eq(articles.isDeleted, false));

    const total = Number(totalCount[0].count);
    console.log(`📊 总文章数: ${total}`);

    if (total === 0) {
      console.log('⚠️  数据库中没有文章，跳过修复');
      process.exit(0);
    }

    // 2. 检查有多少文章缺少搜索向量
    const vectorStats = await db
      .select({
        hasVector: sql<number>`count(*) FILTER (WHERE ${articles.searchVector} IS NOT NULL)`,
        noVector: sql<number>`count(*) FILTER (WHERE ${articles.searchVector} IS NULL)`,
      })
      .from(articles)
      .where(eq(articles.isDeleted, false));

    const hasVector = Number(vectorStats[0].hasVector);
    const noVector = Number(vectorStats[0].noVector);

    console.log(`✅ 有搜索向量: ${hasVector}`);
    console.log(`❌ 无搜索向量: ${noVector}\n`);

    // 3. 如果有文章缺少搜索向量，进行修复
    if (noVector > 0) {
      console.log('🔧 开始重建搜索索引...');
      
      await db.execute(sql`
        UPDATE articles 
        SET search_vector = 
          setweight(to_tsvector('simple', coalesce(title,'')), 'A') || 
          setweight(to_tsvector('simple', coalesce(content,'')), 'B')
        WHERE search_vector IS NULL
      `);

      console.log('✅ 搜索索引重建完成\n');

      // 4. 验证修复结果
      const afterStats = await db
        .select({
          hasVector: sql<number>`count(*) FILTER (WHERE ${articles.searchVector} IS NOT NULL)`,
          noVector: sql<number>`count(*) FILTER (WHERE ${articles.searchVector} IS NULL)`,
        })
        .from(articles)
        .where(eq(articles.isDeleted, false));

      const afterHasVector = Number(afterStats[0].hasVector);
      const afterNoVector = Number(afterStats[0].noVector);

      console.log('📊 修复后统计:');
      console.log(`✅ 有搜索向量: ${afterHasVector}`);
      console.log(`❌ 无搜索向量: ${afterNoVector}\n`);

      if (afterNoVector === 0) {
        console.log('🎉 所有文章的搜索向量已成功生成！');
      } else {
        console.log('⚠️  仍有部分文章缺少搜索向量，请手动检查');
      }
    } else {
      console.log('✅ 所有文章都有搜索向量，无需修复');
    }

    // 5. 测试搜索功能
    console.log('\n🧪 测试搜索功能...');
    const testQuery = '数学';
    const searchResults = await db
      .select({
        id: articles.id,
        title: articles.title,
      })
      .from(articles)
      .where(
        and(
          eq(articles.isDeleted, false),
          sql`${articles.searchVector} @@ plainto_tsquery('simple', ${testQuery})`
        )
      )
      .limit(3);

    console.log(`搜索 "${testQuery}" 的结果数: ${searchResults.length}`);
    if (searchResults.length > 0) {
      console.log('前3条结果:');
      searchResults.forEach(r => console.log(`  - [${r.id}] ${r.title}`));
      console.log('\n✅ 搜索功能正常！');
    } else {
      console.log('⚠️  搜索无结果，可能需要检查文章内容');
    }

  } catch (error) {
    console.error('\n❌ 修复过程中出错:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkAndFix();
