/**
 * 对比 Drizzle ORM 和原始 SQL 的查询结果
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { articles } from '../src/db/schema';
import { sql, and, eq } from 'drizzle-orm';

config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL 未设置');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function testDrizzleVsSQL() {
  console.log('🔍 对比 Drizzle ORM vs 原始 SQL\n');

  const searchTerm = '城市';

  try {
    // 方法1: Drizzle ORM - 完整查询（和 search.ts 一样）
    console.log('1️⃣ Drizzle ORM - 完整查询:');
    const drizzleResults = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
      })
      .from(articles)
      .where(
        and(
          eq(articles.isDeleted, false),
          eq(articles.status, 'published'),
          sql`${articles.searchVector} @@ plainto_tsquery('simple', ${searchTerm})`
        )
      )
      .limit(10);
    
    console.log(`   结果数: ${drizzleResults.length}`);
    if (drizzleResults.length > 0) {
      drizzleResults.forEach(r => console.log(`     - [${r.id}] ${r.title}`));
    }

    // 方法2: Drizzle ORM - 不含 excerpt
    console.log('\n2️⃣ Drizzle ORM - 不含 excerpt:');
    const drizzleNoExcerpt = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
      })
      .from(articles)
      .where(
        and(
          eq(articles.isDeleted, false),
          eq(articles.status, 'published'),
          sql`${articles.searchVector} @@ plainto_tsquery('simple', ${searchTerm})`
        )
      )
      .limit(10);
    
    console.log(`   结果数: ${drizzleNoExcerpt.length}`);
    if (drizzleNoExcerpt.length > 0) {
      drizzleNoExcerpt.forEach(r => console.log(`     - [${r.id}] ${r.title}`));
    }

    // 方法3: 原始 SQL - 使用 db.execute
    console.log('\n3️⃣ 原始 SQL - db.execute:');
    const rawSqlResults = await db.execute(sql`
      SELECT id, title, slug, excerpt
      FROM articles
      WHERE is_deleted = false
        AND status = 'published'
        AND search_vector @@ plainto_tsquery('simple', ${searchTerm})
      LIMIT 10
    `);
    
    console.log(`   结果数: ${rawSqlResults.length}`);
    if (rawSqlResults.length > 0) {
      rawSqlResults.forEach((r: any) => console.log(`     - [${r.id}] ${r.title}`));
    }

    // 方法4: 原始 SQL - 使用 client 直接查询
    console.log('\n4️⃣ 原始 SQL - postgres client:');
    const clientResults = await client`
      SELECT id, title, slug, excerpt
      FROM articles
      WHERE is_deleted = false
        AND status = 'published'
        AND search_vector @@ plainto_tsquery('simple', ${searchTerm})
      LIMIT 10
    `;
    
    console.log(`   结果数: ${clientResults.length}`);
    if (clientResults.length > 0) {
      clientResults.forEach(r => console.log(`     - [${r.id}] ${r.title}`));
    }

    // 方法5: 检查 excerpt 字段是否存在问题
    console.log('\n5️⃣ 检查 excerpt 字段:');
    const excerptCheck = await client`
      SELECT id, title, 
             excerpt IS NULL as excerpt_is_null,
             LENGTH(excerpt) as excerpt_length
      FROM articles
      WHERE is_deleted = false
        AND status = 'published'
        AND search_vector @@ plainto_tsquery('simple', ${searchTerm})
      LIMIT 3
    `;
    
    excerptCheck.forEach(r => {
      console.log(`     [${r.id}] ${r.title}`);
      console.log(`        excerpt_is_null: ${r.excerpt_is_null}, length: ${r.excerpt_length}`);
    });

    // 方法6: 测试不同的查询条件组合
    console.log('\n6️⃣ 测试查询条件组合:');
    
    // 只有 is_deleted
    const test1 = await client`
      SELECT COUNT(*) as count
      FROM articles
      WHERE is_deleted = false
        AND search_vector @@ plainto_tsquery('simple', ${searchTerm})
    `;
    console.log(`   只过滤 is_deleted: ${test1[0].count} 条`);
    
    // 只有 status
    const test2 = await client`
      SELECT COUNT(*) as count
      FROM articles
      WHERE status = 'published'
        AND search_vector @@ plainto_tsquery('simple', ${searchTerm})
    `;
    console.log(`   只过滤 status: ${test2[0].count} 条`);
    
    // 两个条件都有
    const test3 = await client`
      SELECT COUNT(*) as count
      FROM articles
      WHERE is_deleted = false
        AND status = 'published'
        AND search_vector @@ plainto_tsquery('simple', ${searchTerm})
    `;
    console.log(`   两个条件都有: ${test3[0].count} 条`);

    // 总结
    console.log('\n📊 总结:');
    console.log(`   Drizzle ORM (含 excerpt): ${drizzleResults.length} 条`);
    console.log(`   Drizzle ORM (不含 excerpt): ${drizzleNoExcerpt.length} 条`);
    console.log(`   原始 SQL (db.execute): ${rawSqlResults.length} 条`);
    console.log(`   原始 SQL (client): ${clientResults.length} 条`);

    if (drizzleResults.length === 0 && rawSqlResults.length > 0) {
      console.log('\n⚠️ Drizzle ORM 有问题！');
    } else if (drizzleResults.length > 0) {
      console.log('\n✅ Drizzle ORM 正常工作');
    }

  } catch (error) {
    console.error('\n❌ 测试出错:', error);
  } finally {
    await client.end();
  }
}

testDrizzleVsSQL();
