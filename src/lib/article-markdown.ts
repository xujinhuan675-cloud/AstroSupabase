import matter from 'gray-matter';
import { isValidCategory, type Category } from './categories';
import { filenameToSlug, generateSlug, processMarkdown } from './markdown-processor';

export const articleStatusValues = ['draft', 'published', 'archived'] as const;

export type ArticleStatus = (typeof articleStatusValues)[number];

export interface ParsedMarkdownArticle {
  sourceMarkdown: string;
  frontmatter: Record<string, unknown>;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  authorId: string | null;
  featuredImage: string | null;
  status: ArticleStatus;
  category: Category | null;
  tags: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
  publishedAt: Date | null;
}

export interface ArticleTimestampInput {
  status: ArticleStatus;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  publishedAt?: Date | null;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => asStringArray(item))
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  const stringValue = asString(value);
  if (!stringValue) {
    return [];
  }

  return stringValue
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const date =
      /^\d{4}-\d{2}-\d{2}$/.test(normalized)
        ? new Date(`${normalized}T00:00:00`)
        : new Date(normalized);

    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function normalizeStatus(value: unknown, fallback: ArticleStatus = 'draft'): ArticleStatus {
  const candidate = asString(value)?.toLowerCase();
  return articleStatusValues.includes(candidate as ArticleStatus)
    ? (candidate as ArticleStatus)
    : fallback;
}

function normalizeCategory(value: unknown): Category | null {
  const candidate = asString(value)?.toLowerCase();
  if (!candidate || !isValidCategory(candidate)) {
    return null;
  }

  return candidate;
}

function guessTitleFromContent(content: string): string | undefined {
  const match = content.match(/^\s*#\s+(.+)\s*$/m);
  return match?.[1]?.trim() || undefined;
}

function guessTitleFromFilename(filename?: string): string | undefined {
  if (!filename) {
    return undefined;
  }

  const withoutExtension = filename.replace(/\.[^.]+$/, '').trim();
  if (!withoutExtension) {
    return undefined;
  }

  return withoutExtension.replace(/[-_]+/g, ' ').trim() || undefined;
}

function normalizeSlug(slugOrTitle: string, fallbackFilename?: string): string {
  const normalized = generateSlug(slugOrTitle);
  if (normalized) {
    return normalized;
  }

  if (fallbackFilename) {
    const fromFilename = filenameToSlug(fallbackFilename);
    if (fromFilename) {
      return fromFilename;
    }
  }

  return `article-${Date.now()}`;
}

function dedupeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

export function resolveArticleTimestamps(
  input: ArticleTimestampInput,
  fallbackNow: Date = new Date()
) {
  const createdAt = input.createdAt ?? input.publishedAt ?? fallbackNow;
  const publishedAt =
    input.publishedAt !== undefined
      ? input.publishedAt
      : input.status === 'published'
        ? createdAt
        : null;
  const updatedAt = input.updatedAt ?? createdAt;

  return {
    createdAt,
    publishedAt,
    updatedAt,
  };
}

export async function parseArticleMarkdown(
  sourceMarkdown: string,
  options: {
    filename?: string;
    defaultStatus?: ArticleStatus;
    defaultAuthorId?: string;
  } = {}
): Promise<ParsedMarkdownArticle> {
  let frontmatter: Record<string, unknown> = {};
  let content = sourceMarkdown;

  try {
    const parsed = matter(sourceMarkdown);
    frontmatter = (parsed.data ?? {}) as Record<string, unknown>;
    content = parsed.content ?? sourceMarkdown;
  } catch {
    frontmatter = {};
    content = sourceMarkdown;
  }

  const processed = await processMarkdown(sourceMarkdown);
  const title =
    asString(frontmatter.title) ??
    guessTitleFromContent(content) ??
    guessTitleFromFilename(options.filename) ??
    'Untitled Article';

  const slug = normalizeSlug(
    asString(frontmatter.slug) ?? title,
    options.filename
  );

  const status = normalizeStatus(frontmatter.status, options.defaultStatus ?? 'draft');
  const publishedAt = parseDateValue(
    frontmatter.date ?? frontmatter.publishedAt ?? frontmatter.published
  );
  const updatedAt = parseDateValue(frontmatter.updated ?? frontmatter.updatedAt);
  const createdAt = parseDateValue(frontmatter.createdAt) ?? publishedAt;

  const categorySource = Array.isArray(frontmatter.category)
    ? frontmatter.category[0]
    : frontmatter.category ?? frontmatter.categories;

  return {
    sourceMarkdown,
    frontmatter,
    title,
    slug,
    excerpt: asString(frontmatter.excerpt) ?? processed.excerpt,
    content: content.replace(/^\n+/, ''),
    authorId:
      asString(frontmatter.author) ??
      asString(frontmatter.authorId) ??
      options.defaultAuthorId ??
      null,
    featuredImage:
      asString(frontmatter.featuredImage) ??
      asString(frontmatter.featured_image) ??
      asString(frontmatter.cover) ??
      asString(frontmatter.image) ??
      null,
    status,
    category: normalizeCategory(categorySource),
    tags: dedupeTags([
      ...asStringArray(frontmatter.tags),
      ...asStringArray(frontmatter.tag),
      ...processed.tags,
    ]),
    createdAt,
    updatedAt,
    publishedAt,
  };
}
