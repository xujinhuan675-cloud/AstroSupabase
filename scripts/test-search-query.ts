/**
 * 测试搜索查询
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

async function testSearch() {
  console.log('🔍 测试搜索查询...\n');

  try {
    // 1. 查看第一篇文章的详细信息
    console.log('1️⃣ 查看第一篇文章...');
    const firstArticle = await client`
      SELECT id, title, 
             substring(content, 1, 200) as content_preview,
             to_tsvector('simple', coalesce(title,'')) as title_vector,
             to_tsvector('simple', coalesce(content,'')) as content_vector,
             search_vector
      FROM articles
      WHERE is_deleted = false
      LIMIT 1
    `;

    if (firstArticle.length > 0) {
      const article = firstArticle[0];
      console.log(`   ID: ${article.id}`);
      console.log(`   标题: ${article.title}`);
      console.log(`   内容预览: ${article.content_preview.substring(0, 100)}...`);
      console.log(`   标题向量: ${article.title_vector.toString().substring(0, 100)}...`);
      console.log(`   内容向量: ${article.content_vector.toString().substring(0, 100)}...`);
      console.log(`   search_vector: ${article.search_vector ? article.search_vector.toString().substring(0, 100) + '...' : 'NULL'}`);
    }

    // 2. 测试不同的搜索方式
    console.log('\n2️⃣ 测试不同的搜索方式...');
    
    const testQueries = [
      { query: '城市', desc: '中文词' },
      { query: '经济', desc: '中文词' },
      { query: '管理', desc: '中文词' },
    ];

    for (const test of testQueries) {
      console.log(`\n   测试: "${test.query}" (${test.desc})`);
      
      // 方法1: 使用 plainto_tsquery
      const result1 = await client`
        SELECT id, title
        FROM articles
        WHERE is_deleted = false
          AND search_vector @@ plainto_tsquery('simple', ${test.query})
        LIMIT 3
      `;
      console.log(`   plainto_tsquery 结果: ${result1.length} 条`);
      
      // 方法2: 使用 to_tsquery
      try {
        const result2 = await client`
          SELECT id, title
          FROM articles
          WHERE is_deleted = false
            AND search_vector @@ to_tsquery('simple', ${test.query})
          LIMIT 3
        `;
        console.log(`   to_tsquery 结果: ${result2.length} 条`);
      } catch (e) {
        console.log(`   to_tsquery 失败: ${e.message}`);
      }
      
      // 方法3: 使用 LIKE
      const result3 = await client`
        SELECT id, title
        FROM articles
        WHERE is_deleted = false
          AND (title LIKE ${'%' + test.query + '%'} OR content LIKE ${'%' + test.query + '%'})
        LIMIT 3
      `;
      console.log(`   LIKE 结果: ${result3.length} 条`);
      if (result3.length > 0) {
        result3.forEach(r => console.log(`     - [${r.id}] ${r.title}`));
      }
    }

    // 3. 检查 search_vector 是否真的包含中文
    console.log('\n3️⃣ 检查 search_vector 内容...');
    const vectorCheck = await client`
      SELECT id, title,
             search_vector::text as vector_text
      FROM articles
      WHERE is_deleted = false
        AND title LIKE '%城市%'
      LIMIT 1
    `;
    
    if (vectorCheck.length > 0) {
      const article = vectorCheck[0];
      console.log(`   文章: [${article.id}] ${article.title}`);
      console.log(`   向量内容: ${article.vector_text.substring(0, 200)}...`);
      console.log(`   是否包含"城市": ${article.vector_text.includes('城市') ? '是' : '否'}`);
      console.log(`   是否包含"经济": ${article.vector_text.includes('经济') ? '是' : '否'}`);
    }

  } catch (error) {
    console.error('\n❌ 测试出错:', error);
  } finally {
    await client.end();
  }
}

testSearch();
