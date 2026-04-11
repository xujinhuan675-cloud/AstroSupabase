/**
 * 诊断脚本：检查 Supabase 数据库中的文章数据
 * 使用方式: tsx scripts/diagnose-db.ts
 */

import { db } from '../src/db/client';
import { articles, articleTags, articleLinks } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function diagnoseDatabase() {
  try {
    console.log('📊 开始数据库诊断...\n');

    // 1. 获取所有文章
    console.log('1️⃣  检查文章总数:');
    const allArticles = await db.select().from(articles);
    console.log(`   总数: ${allArticles.length}`);

    // 2. 检查已发布文章
    console.log('\n2️⃣  检查已发布文章:');
    const publishedArticles = await db
      .select()
      .from(articles)
      .where(eq(articles.status, 'published'));
    console.log(`   已发布: ${publishedArticles.length}`);

    // 3. 详细列出所有文章
    console.log('\n3️⃣  文章详情:');
    if (allArticles.length === 0) {
      console.log('   ⚠️  数据库中没有文章');
    } else {
      allArticles.forEach((article, index) => {
        console.log(`\n   ${index + 1}. ${article.title}`);
        console.log(`      ID: ${article.id}`);
        console.log(`      Slug: ${article.slug}`);
        console.log(`      Status: ${article.status}`);
        console.log(`      Author: ${article.authorId}`);
        console.log(`      Created: ${article.createdAt}`);
        console.log(`      Published: ${article.publishedAt}`);
        console.log(`      Updated: ${article.updatedAt}`);
        console.log(`      Excerpt: ${article.excerpt?.substring(0, 50)}...`);
      });
    }

    // 4. 检查标签
    console.log('\n4️⃣  检查标签:');
    const allTags = await db.select().from(articleTags);
    console.log(`   总数: ${allTags.length}`);
    if (allTags.length > 0) {
      const tagMap: { [key: string]: string[] } = {};
      allTags.forEach((tag) => {
        if (!tagMap[tag.articleId]) {
          tagMap[tag.articleId] = [];
        }
        tagMap[tag.articleId].push(tag.tag);
      });
      Object.entries(tagMap).forEach(([articleId, tags]) => {
        console.log(`   Article ${articleId}: ${tags.join(', ')}`);
      });
    }

    // 5. 检查链接
    console.log('\n5️⃣  检查双向链接:');
    const allLinks = await db.select().from(articleLinks);
    console.log(`   总数: ${allLinks.length}`);
    if (allLinks.length > 0) {
      allLinks.slice(0, 5).forEach((link) => {
        const sourceTitle = allArticles.find((a) => a.id === link.sourceId)?.title || '未找到';
        const targetTitle = allArticles.find((a) => a.id === link.targetId)?.title || '未找到';
        console.log(`   ${sourceTitle} -> ${targetTitle} (${link.linkType})`);
      });
      if (allLinks.length > 5) {
        console.log(`   ... 还有 ${allLinks.length - 5} 条链接`);
      }
    }

    // 6. 测试查询
    console.log('\n6️⃣  测试首页查询 (getArticles(6)):');
    const articlesForHome = allArticles
      .filter((a) => a.status === 'published')
      .sort((a, b) => {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 6);
    console.log(`   应该显示: ${articlesForHome.length} 篇文章`);
    articlesForHome.forEach((article, index) => {
      console.log(`   ${index + 1}. ${article.title}`);
    });

    console.log('\n✅ 诊断完成!\n');
  } catch (error) {
    console.error('❌ 诊断出错:', error);
    process.exit(1);
  }
}

diagnoseDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
