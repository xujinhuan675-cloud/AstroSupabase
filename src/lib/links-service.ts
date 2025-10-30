import { db } from '../db/client';
import { articles, articleLinks, articleTags } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { processMarkdown, extractWikiLinks } from './markdown-processor';

export interface BacklinkInfo {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
}

export interface GraphNode {
  id: number;
  title: string;
  slug: string;
}

export interface GraphLink {
  source: number;
  target: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/**
 * 更新文章的链接关系和标签
 * 这个函数应该在创建或更新文章时调用
 * @param articleId - 文章 ID
 * @param content - 文章内容
 */
export async function updateArticleLinks(articleId: number, content: string) {
  try {
    // 获取文章信息
    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    if (article.length === 0) {
      console.error(`Article ${articleId} not found`);
      return;
    }

    // 解析 Markdown 获取所有链接和标签
    const processed = await processMarkdown(content, async (permalink) => {
      const result = await db
        .select()
        .from(articles)
        .where(eq(articles.slug, permalink))
        .limit(1);
      return result.length > 0;
    });

    // 删除旧的链接关系
    await db.delete(articleLinks).where(eq(articleLinks.sourceId, articleId));

    // 创建新的链接关系
    for (const link of processed.wikiLinks) {
      if (link.data.exists) {
        const targetArticle = await db
          .select()
          .from(articles)
          .where(eq(articles.slug, link.data.permalink))
          .limit(1);

        if (targetArticle.length > 0) {
          try {
            await db.insert(articleLinks).values({
              sourceId: articleId,
              targetId: targetArticle[0].id,
              linkType: 'internal',
            });
          } catch (error) {
            // 忽略重复插入错误
            console.log(`Link already exists: ${articleId} -> ${targetArticle[0].id}`);
          }
        }
      }
    }

    // 更新标签
    await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
    
    for (const tag of processed.tags) {
      try {
        await db.insert(articleTags).values({
          articleId,
          tag,
        });
      } catch (error) {
        // 忽略重复插入错误
        console.log(`Tag already exists: ${articleId} - ${tag}`);
      }
    }

    console.log(`Updated links and tags for article ${articleId}`);
  } catch (error) {
    console.error('Error updating article links:', error);
    throw error;
  }
}

/**
 * 获取文章的反向链接（哪些文章链接到当前文章）
 * @param articleId - 文章 ID
 * @returns 反向链接列表
 */
export async function getBacklinks(articleId: number): Promise<BacklinkInfo[]> {
  try {
    const links = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
      })
      .from(articleLinks)
      .innerJoin(articles, eq(articleLinks.sourceId, articles.id))
      .where(
        and(
          eq(articleLinks.targetId, articleId),
          eq(articles.isDeleted, false),
          eq(articles.status, 'published')
        )
      );

    return links;
  } catch (error) {
    console.error('Error fetching backlinks:', error);
    return [];
  }
}

/**
 * 获取文章的前向链接（当前文章链接到哪些文章）
 * @param articleId - 文章 ID
 * @returns 前向链接列表
 */
export async function getForwardLinks(articleId: number): Promise<BacklinkInfo[]> {
  try {
    const links = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
      })
      .from(articleLinks)
      .innerJoin(articles, eq(articleLinks.targetId, articles.id))
      .where(
        and(
          eq(articleLinks.sourceId, articleId),
          eq(articles.isDeleted, false),
          eq(articles.status, 'published')
        )
      );

    return links;
  } catch (error) {
    console.error('Error fetching forward links:', error);
    return [];
  }
}

/**
 * 获取所有文章的链接关系（用于构建知识图谱）
 * @returns 图谱数据
 */
export async function getGraphData(): Promise<GraphData> {
  try {
    // 获取所有已发布的文章
    const allArticles = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
      })
      .from(articles)
      .where(
        and(
          eq(articles.isDeleted, false),
          eq(articles.status, 'published')
        )
      );

    // 获取所有链接关系
    const allLinks = await db
      .select({
        sourceId: articleLinks.sourceId,
        targetId: articleLinks.targetId,
      })
      .from(articleLinks);

    // 过滤掉指向不存在文章的链接
    const validArticleIds = new Set(allArticles.map(a => a.id));
    const validLinks = allLinks.filter(
      link => validArticleIds.has(link.sourceId) && validArticleIds.has(link.targetId)
    );

    return {
      nodes: allArticles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
      })),
      links: validLinks.map(l => ({
        source: l.sourceId,
        target: l.targetId,
      })),
    };
  } catch (error) {
    console.error('Error fetching graph data:', error);
    return { nodes: [], links: [] };
  }
}

/**
 * 获取文章的所有标签
 * @param articleId - 文章 ID
 * @returns 标签列表
 */
export async function getArticleTags(articleId: number): Promise<string[]> {
  try {
    const tags = await db
      .select({ tag: articleTags.tag })
      .from(articleTags)
      .where(eq(articleTags.articleId, articleId));

    return tags.map(t => t.tag);
  } catch (error) {
    console.error('Error fetching article tags:', error);
    return [];
  }
}

/**
 * 根据标签获取文章列表
 * @param tag - 标签名
 * @returns 文章列表
 */
export async function getArticlesByTag(tag: string): Promise<BacklinkInfo[]> {
  try {
    const articlesWithTag = await db
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
      })
      .from(articleTags)
      .innerJoin(articles, eq(articleTags.articleId, articles.id))
      .where(
        and(
          eq(articleTags.tag, tag),
          eq(articles.isDeleted, false),
          eq(articles.status, 'published')
        )
      );

    return articlesWithTag;
  } catch (error) {
    console.error('Error fetching articles by tag:', error);
    return [];
  }
}

/**
 * 获取所有标签及其文章数量
 * @returns 标签统计
 */
export async function getAllTags(): Promise<Array<{ tag: string; count: number }>> {
  try {
    const result = await db
      .select({
        tag: articleTags.tag,
        count: sql<number>`count(*)::int`,
      })
      .from(articleTags)
      .innerJoin(articles, eq(articleTags.articleId, articles.id))
      .where(
        and(
          eq(articles.isDeleted, false),
          eq(articles.status, 'published')
        )
      )
      .groupBy(articleTags.tag)
      .orderBy(sql`count(*) DESC`);

    return result;
  } catch (error) {
    console.error('Error fetching all tags:', error);
    return [];
  }
}

