/**
 * RSS Feed 生成器
 * 生成博客文章的 RSS 订阅源
 */
import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getArticles } from '../lib/articles';

export async function GET(context: APIContext) {
  try {
    // 获取所有已发布的文章
    const articles = await getArticles();

    return rss({
      // 网站标题
      title: 'IOTO Digital Garden',
      
      // 网站描述
      description: 'Ship your Second Brain into the Cyber-Space - 分享技术见解、生活点滴与学习心得',
      
      // 网站地址（从 context 获取，确保使用正确的域名）
      site: context.site?.toString() || 'https://astrosupabase.vercel.app',
      
      // 文章列表
      items: articles.map((article) => ({
        // 文章标题
        title: article.title,
        
        // 文章链接
        link: `/articles/${article.id}/`,
        
        // 文章描述/摘要
        description: article.excerpt || '',
        
        // 发布日期
        pubDate: new Date(article.publishedAt || article.createdAt),
        
        // 作者（可选）
        author: article.authorId ? `author-${article.authorId}` : undefined,
        
        // 分类（可选，使用文章标签）
        categories: [], // 如果需要标签，可以从 getArticleTags 获取
      })),
      
      // 自定义 XML 样式（可选）
      customData: `
        <language>zh-CN</language>
        <copyright>Copyright ${new Date().getFullYear()} IOTO Digital Garden</copyright>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      `,
      
      // 是否包含完整内容（默认 false，仅包含摘要）
      // 如果设为 true，需要在 items 中添加 content 字段
      stylesheet: '/rss-styles.xsl', // 可选：RSS 样式表
    });
  } catch (error) {
    console.error('Failed to generate RSS feed:', error);
    
    // 返回错误响应
    return new Response('Failed to generate RSS feed', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}

