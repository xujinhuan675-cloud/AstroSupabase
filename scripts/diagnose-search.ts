/**
 * 诊断搜索功能问题
 * 检查：
 * 1. 数据库中是否有文章
 * 2. search_vector 字段是否存在且有值
 * 3. 搜索查询是否能返回结果
 */

import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { articles } from '../src/db/schema';
import { sql, and, eq } from 'drizzle-orm';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL 未在 .env 文件中设置');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function diagnose() {
  console.log('🔍 开始诊断搜索功能...\n');

  try {
    // 1. 检查文章总数
    console.log('1️⃣ 检查文章总数...');
    const totalArticles = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles);
    console.log(`   总文章数: ${totalArticles[0].count}`);

    // 2. 检查已发布文章数
    console.log('\n2️⃣ 检查已发布文章数...');
    const publishedArticles = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .where(and(eq(articles.status, 'published'), eq(articles.isDeleted, false)));
    console.log(`   已发布文章数: ${publishedArticles[0].count}`);

    // 3. 检查 search_vector 字段
    console.log('\n3️⃣ 检查 search_vector 字段...');
    const articlesWithSearchVector = await db
      .select({
        id: articles.id,
        title: articles.title,
        hasSearchVector: sql<boolean>`${articles.searchVector} IS NOT NULL`,
      })
      .from(articles)
      .where(eq(articles.isDeleted, false))
      .limit(5);

    console.log('   前5篇文章的 search_vector 状态:');
    articlesWithSearchVector.forEach(article => {
      console.log(`   - [${article.id}] ${article.title}: ${article.hasSearchVector ? '✅ 有' : '❌ 无'}`);
    });

    // 4. 统计有/无 search_vector 的文章数
    const vectorStats = await db
      .select({
        hasVector: sql<number>`count(*) FILTER (WHERE ${articles.searchVector} IS NOT NULL)`,
        noVector: sql<number>`count(*) FILTER (WHERE ${articles.searchVector} IS NULL)`,
      })
      .from(articles)
      .where(eq(articles.isDeleted, false));

    console.log(`\n   有 search_vector: ${vectorStats[0].hasVector}`);
    console.log(`   无 search_vector: ${vectorStats[0].noVector}`);

    // 5. 测试搜索查询
    console.log('\n4️⃣ 测试搜索查询...');
    const testQueries = ['数学', 'math', '物理', '化学'];

    for (const query of testQueries) {
      console.log(`\n   测试查询: "${query}"`);
      
      // 使用 API 中的查询逻辑
      const results = await db
        .select({
          id: articles.id,
          title: articles.title,
          slug: articles.slug,
        })
        .from(articles)
        .where(
          and(
            eq(articles.isDeleted, false),
            sql`${articles.searchVector} @@ plainto_tsquery('simple', ${query})`
          )
        )
        .limit(5);

      console.log(`   结果数: ${results.length}`);
      if (results.length > 0) {
        results.forEach(r => console.log(`   - [${r.id}] ${r.title}`));
      }
    }

    // 6. 检查触发器是否存在
    console.log('\n5️⃣ 检查触发器...');
    const triggers = await client`
      SELECT trigger_name, event_manipulation, action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'articles'
      AND trigger_name = 'articles_search_update'
    `;
    
    if (triggers.length > 0) {
      console.log('   ✅ 触发器存在');
      console.log(`   触发时机: ${triggers[0].event_manipulation}`);
    } else {
      console.log('   ❌ 触发器不存在');
    }

    // 7. 手动测试一篇文章的搜索向量
    console.log('\n6️⃣ 查看第一篇文章的详细信息...');
    const firstArticle = await db
      .select({
        id: articles.id,
        title: articles.title,
        content: sql<string>`substring(${articles.content}, 1, 100)`,
        searchVector: sql<string>`${articles.searchVector}::text`,
      })
      .from(articles)
      .where(eq(articles.isDeleted, false))
      .limit(1);

    if (firstArticle.length > 0) {
      const article = firstArticle[0];
      console.log(`   ID: ${article.id}`);
      console.log(`   标题: ${article.title}`);
      console.log(`   内容前100字: ${article.content}`);
      console.log(`   search_vector: ${article.searchVector ? article.searchVector.substring(0, 100) + '...' : 'NULL'}`);
    }

  } catch (error) {
    console.error('\n❌ 诊断过程中出错:', error);
  } finally {
    await client.end();
    console.log('\n✅ 诊断完成');
  }
}

diagnose();
