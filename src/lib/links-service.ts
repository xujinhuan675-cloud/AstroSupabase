import { db } from '../db/client';
import { articles, articleLinks, articleTags } from '../db/schema';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { processMarkdown, extractWikiLinks } from './markdown-processor';
import { createModuleLogger } from './logger';
import type { FullSlug } from './quartz/util/path';

const logger = createModuleLogger('LinksService');

/**
 * 反向链接信息
 */
export interface BacklinkInfo {
  /** 文章 ID */
  id: number;
  /** 文章标题 */
  title: string;
  /** 文章 slug */
  slug: string;
  /** 文章摘要 */
  excerpt: string | null;
}

/**
 * 图谱节点数据
 */
export interface GraphNode {
  /** 文章 ID */
  id: number;
  /** 文章标题 */
  title: string;
  /** 文章 slug */
  slug: string;
}

/**
 * 图谱链接数据
 */
export interface GraphLink {
  /** 源文章 ID */
  source: number;
  /** 目标文章 ID */
  target: number;
}

/**
 * 完整的图谱数据
 */
export interface GraphData {
  /** 节点列表 */
  nodes: GraphNode[];
  /** 链接列表 */
  links: GraphLink[];
}

/**
 * 更新文章的链接关系和标签
 * 
 * 这个函数应该在创建或更新文章时调用，它会：
 * 1. 解析文章内容中的 wiki 链接
 * 2. 验证链接目标是否存在
 * 3. 使用事务批量更新链接和标签关系
 * 4. 优化了 N+1 查询问题，使用批量操作提升性能
 * 
 * @param articleId - 文章 ID
 * @param content - 文章 Markdown 内容
 * @throws {Error} 当文章不存在或更新失败时抛出错误
 * @example
 * ```typescript
 * await updateArticleLinks(1, "# 标题\n\n这是一个 [[其他文章]] 的链接。");
 * ```
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
      logger.error(`Article ${articleId} not found`);
      return;
    }

    // 解析 Markdown 获取所有链接和标签
    // 先获取所有文章的 slug，用于链接验证
    const allArticles = await db
      .select({ slug: articles.slug })
      .from(articles)
      .where(eq(articles.isDeleted, false));
    
    // 类型转换：string[] -> FullSlug[]
    // 注意：FullSlug 是标记类型，实际运行时就是 string，这里使用类型断言是安全的
    const allSlugs = allArticles.map(a => a.slug as FullSlug);
    
    const processed = await processMarkdown(content, {
      allSlugs: allSlugs,
      currentSlug: article[0].slug as FullSlug,
    });

    // 使用事务确保数据一致性
    await db.transaction(async (tx) => {
      // 删除旧的链接关系和标签
      await tx.delete(articleLinks).where(eq(articleLinks.sourceId, articleId));
      await tx.delete(articleTags).where(eq(articleTags.articleId, articleId));

      // 批量查询所有目标文章（优化 N+1 查询问题）
      const validLinks = processed.wikiLinks.filter(link => link.data.exists);
      if (validLinks.length > 0) {
        const permalinks = validLinks.map(link => link.data.permalink);
        
        const targetArticles = await tx
          .select({ id: articles.id, slug: articles.slug })
          .from(articles)
          .where(inArray(articles.slug, permalinks));

        // 创建 slug 到 id 的映射
        const slugToId = new Map(targetArticles.map(a => [a.slug, a.id]));

        // 批量插入链接（使用冲突处理避免重复）
        const linkValues = validLinks
          .filter(link => slugToId.has(link.data.permalink))
          .map(link => ({
            sourceId: articleId,
            targetId: slugToId.get(link.data.permalink)!,
            linkType: 'internal' as const,
          }));

        if (linkValues.length > 0) {
          try {
            await tx.insert(articleLinks).values(linkValues);
          } catch (error) {
            // 如果批量插入失败，尝试逐个插入（兼容旧行为）
            logger.warn('Batch insert failed, falling back to individual inserts:', error);
            for (const linkValue of linkValues) {
              try {
                await tx.insert(articleLinks).values(linkValue);
              } catch (individualError) {
                logger.debug(`Link already exists: ${articleId} -> ${linkValue.targetId}`);
              }
            }
          }
        }
      }

      // 批量插入标签
      if (processed.tags.length > 0) {
        const tagValues = processed.tags.map(tag => ({
          articleId,
          tag,
        }));

        try {
          await tx.insert(articleTags).values(tagValues);
        } catch (error) {
          // 如果批量插入失败，尝试逐个插入（兼容旧行为）
          logger.warn('Batch tag insert failed, falling back to individual inserts:', error);
          for (const tagValue of tagValues) {
            try {
              await tx.insert(articleTags).values(tagValue);
            } catch (individualError) {
              logger.debug(`Tag already exists: ${articleId} - ${tagValue.tag}`);
            }
          }
        }
      }
    });

    logger.debug(`Updated links and tags for article ${articleId}`);
  } catch (error) {
    logger.error('Error updating article links:', error);
    throw error;
  }
}

/**
 * 获取文章的反向链接（哪些文章链接到当前文章）
 * 
 * @param articleId - 文章 ID
 * @returns 反向链接列表，包含链接到当前文章的所有文章信息
 * @throws {Error} 当查询失败时抛出错误
 * @example
 * ```typescript
 * const backlinks = await getBacklinks(1);
 * console.log(`${backlinks.length} 篇文章链接到当前文章`);
 * ```
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
    logger.error('Error fetching backlinks:', error);
    return [];
  }
}

/**
 * 获取文章的前向链接（当前文章链接到哪些文章）
 * 
 * @param articleId - 文章 ID
 * @returns 前向链接列表，包含当前文章链接到的所有文章信息
 * @throws {Error} 当查询失败时抛出错误
 * @example
 * ```typescript
 * const forwardLinks = await getForwardLinks(1);
 * console.log(`当前文章链接到 ${forwardLinks.length} 篇文章`);
 * ```
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
    logger.error('Error fetching forward links:', error);
    return [];
  }
}

/**
 * 获取所有文章的链接关系（用于构建知识图谱）
 * 
 * 返回所有已发布文章的节点和链接关系，用于渲染知识图谱可视化
 * 
 * @returns 图谱数据，包含节点列表和链接列表
 * @throws {Error} 当查询失败时抛出错误（但会返回空数组作为降级处理）
 * @example
 * ```typescript
 * const graph = await getGraphData();
 * console.log(`图谱包含 ${graph.nodes.length} 个节点和 ${graph.links.length} 条链接`);
 * ```
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
    logger.error('Error fetching graph data:', error);
    return { nodes: [], links: [] };
  }
}

/**
 * 获取文章的所有标签
 * 
 * @param articleId - 文章 ID
 * @returns 标签列表（字符串数组）
 * @throws {Error} 当查询失败时抛出错误（但会返回空数组作为降级处理）
 * @example
 * ```typescript
 * const tags = await getArticleTags(1);
 * console.log(`文章包含 ${tags.length} 个标签：${tags.join(', ')}`);
 * ```
 */
export async function getArticleTags(articleId: number): Promise<string[]> {
  try {
    const tags = await db
      .select({ tag: articleTags.tag })
      .from(articleTags)
      .where(eq(articleTags.articleId, articleId));

    return tags.map(t => t.tag);
  } catch (error) {
    logger.error('Error fetching article tags:', error);
    return [];
  }
}

/**
 * 根据标签获取文章列表
 * 
 * @param tag - 标签名
 * @returns 文章列表，包含所有包含该标签的已发布文章信息
 * @throws {Error} 当查询失败时抛出错误（但会返回空数组作为降级处理）
 * @example
 * ```typescript
 * const articles = await getArticlesByTag('技术');
 * console.log(`标签"技术"下有 ${articles.length} 篇文章`);
 * ```
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
    logger.error('Error fetching articles by tag:', error);
    return [];
  }
}

/**
 * 获取所有标签及其文章数量
 * 
 * 返回所有标签及其对应的已发布文章数量，按文章数量降序排列
 * 
 * @returns 标签统计数组，每个元素包含标签名和文章数量
 * @throws {Error} 当查询失败时抛出错误（但会返回空数组作为降级处理）
 * @example
 * ```typescript
 * const tags = await getAllTags();
 * console.log(`共有 ${tags.length} 个标签`);
 * tags.forEach(({ tag, count }) => {
 *   console.log(`${tag}: ${count} 篇文章`);
 * });
 * ```
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
    logger.error('Error fetching all tags:', error);
    return [];
  }
}

