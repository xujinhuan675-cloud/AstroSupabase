import { z } from 'zod';
import { db } from '../../../db/client';
import { articles } from '../../../db/schema';
import { createAuthenticatedApiHandler } from '../../../lib/api-handler';
import { parseArticleMarkdown, resolveArticleTimestamps } from '../../../lib/article-markdown';
import { updateArticleLinks } from '../../../lib/links-service';
import { createModuleLogger } from '../../../lib/logger';

export const prerender = false;

const logger = createModuleLogger('API.Articles.Import');

const MarkdownFileSchema = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
});

const MarkdownImportSchema = z.object({
  files: z.array(MarkdownFileSchema).min(1),
});

type ImportResult =
  | {
      fileName: string;
      title: string;
      slug: string;
      status: 'imported';
      articleId: number;
    }
  | {
      fileName: string;
      title?: string;
      slug?: string;
      status: 'skipped' | 'failed';
      reason: string;
    };

export const POST = createAuthenticatedApiHandler(
  async (context) => {
    const user = (context as any).user;
    const body = (context as any).body as z.infer<typeof MarkdownImportSchema>;

    const existingArticles = await db
      .select({ slug: articles.slug })
      .from(articles);

    const existingSlugs = new Set(existingArticles.map((article) => article.slug));
    const importedArticles: Array<{
      articleId: number;
      content: string;
      tags: string[];
      fileName: string;
    }> = [];
    const results: ImportResult[] = [];

    for (const file of body.files) {
      try {
        const parsed = await parseArticleMarkdown(file.content, {
          filename: file.name,
          defaultAuthorId: user.id,
        });

        if (!parsed.content.trim()) {
          results.push({
            fileName: file.name,
            title: parsed.title,
            slug: parsed.slug,
            status: 'failed',
            reason: 'Markdown 正文为空，未导入。',
          });
          continue;
        }

        if (existingSlugs.has(parsed.slug)) {
          results.push({
            fileName: file.name,
            title: parsed.title,
            slug: parsed.slug,
            status: 'skipped',
            reason: '相同 slug 的文章已存在。',
          });
          continue;
        }

        const timestamps = resolveArticleTimestamps({
          status: parsed.status,
          createdAt: parsed.createdAt,
          updatedAt: parsed.updatedAt,
          publishedAt: parsed.publishedAt,
        });

        const inserted = await db
          .insert(articles)
          .values({
            title: parsed.title,
            slug: parsed.slug,
            excerpt: parsed.excerpt,
            content: parsed.content,
            authorId: parsed.authorId ?? user.id,
            featuredImage: parsed.featuredImage,
            status: parsed.status,
            category: parsed.category,
            createdAt: timestamps.createdAt,
            updatedAt: timestamps.updatedAt,
            publishedAt: timestamps.publishedAt,
            isDeleted: false,
          })
          .returning();

        const article = inserted[0];
        existingSlugs.add(parsed.slug);
        importedArticles.push({
          articleId: article.id,
          content: parsed.content,
          tags: parsed.tags,
          fileName: file.name,
        });
        results.push({
          fileName: file.name,
          title: parsed.title,
          slug: parsed.slug,
          status: 'imported',
          articleId: article.id,
        });
      } catch (error) {
        logger.warn('Failed to import markdown file', { fileName: file.name, error });
        results.push({
          fileName: file.name,
          status: 'failed',
          reason: error instanceof Error ? error.message : '导入失败',
        });
      }
    }

    for (const imported of importedArticles) {
      try {
        await updateArticleLinks(imported.articleId, imported.content, {
          tags: imported.tags,
        });
      } catch (error) {
        logger.warn('Failed to sync links after markdown import', {
          articleId: imported.articleId,
          fileName: imported.fileName,
          error,
        });
      }
    }

    return {
      imported: results.filter((item) => item.status === 'imported').length,
      skipped: results.filter((item) => item.status === 'skipped').length,
      failed: results.filter((item) => item.status === 'failed').length,
      results,
    };
  },
  {
    bodySchema: MarkdownImportSchema,
  }
);
