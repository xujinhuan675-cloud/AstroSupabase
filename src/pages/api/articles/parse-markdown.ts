import { z } from 'zod';
import { createAuthenticatedApiHandler } from '../../../lib/api-handler';
import { parseArticleMarkdown } from '../../../lib/article-markdown';

export const prerender = false;

const ParseMarkdownSchema = z.object({
  markdown: z.string().min(1),
  filename: z.string().optional(),
});

export const POST = createAuthenticatedApiHandler(
  async (context) => {
    const user = (context as any).user;
    const body = (context as any).body as z.infer<typeof ParseMarkdownSchema>;

    const parsed = await parseArticleMarkdown(body.markdown, {
      filename: body.filename,
      defaultAuthorId: user.id,
    });

    return {
      title: parsed.title,
      slug: parsed.slug,
      excerpt: parsed.excerpt,
      content: parsed.content,
      authorId: parsed.authorId,
      featuredImage: parsed.featuredImage,
      status: parsed.status,
      category: parsed.category,
      tags: parsed.tags,
      createdAt: parsed.createdAt,
      updatedAt: parsed.updatedAt,
      publishedAt: parsed.publishedAt,
      hasFrontmatter: Object.keys(parsed.frontmatter).length > 0,
    };
  },
  {
    bodySchema: ParseMarkdownSchema,
  }
);
