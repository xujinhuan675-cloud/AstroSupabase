import { useCallback, useEffect, useState } from 'react';
import type { Article } from '../../db/schema';
import {
  isErrorResponse,
  parseMarkdownArticle,
  saveArticle,
  updateArticle,
  type ArticleMutationPayload,
} from '../../lib/api';
import { categoryInfo, getAllCategories, type Category } from '../../lib/categories';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.css';

interface ArticleEditorProps {
  article: Partial<Article> | null;
  onCancel: () => void;
}

function toDateTimeLocalValue(value: Date | string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function fromDateTimeLocalValue(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function looksLikeFrontmatterMarkdown(value: string): boolean {
  return /^---\s*[\r\n]/.test(value.trimStart());
}

export default function ArticleEditor({ article, onCancel }: ArticleEditorProps) {
  const [title, setTitle] = useState(article?.title || '');
  const [slug, setSlug] = useState(article?.slug || '');
  const [author, setAuthor] = useState(article?.authorId || '');
  const [excerpt, setExcerpt] = useState(article?.excerpt || '');
  const [content, setContent] = useState(article?.content || '');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(
    (article?.status as 'draft' | 'published' | 'archived') || 'draft'
  );
  const [category, setCategory] = useState<Category | ''>((article?.category as Category) || '');
  const [featuredImage, setFeaturedImage] = useState(article?.featuredImage || '');
  const [publishedAt, setPublishedAt] = useState(toDateTimeLocalValue(article?.publishedAt));
  const [updatedAt, setUpdatedAt] = useState(toDateTimeLocalValue(article?.updatedAt));
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [markdownHint, setMarkdownHint] = useState<string | null>(null);
  const [isParsingMarkdown, setIsParsingMarkdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!article) {
      return;
    }

    setTitle(article.title || '');
    setSlug(article.slug || '');
    setAuthor(article.authorId || '');
    setExcerpt(article.excerpt || '');
    setContent(article.content || '');
    setStatus((article.status as 'draft' | 'published' | 'archived') || 'draft');
    setCategory((article.category as Category) || '');
    setFeaturedImage(article.featuredImage || '');
    setPublishedAt(toDateTimeLocalValue(article.publishedAt));
    setUpdatedAt(toDateTimeLocalValue(article.updatedAt));
    setMarkdownHint(null);
  }, [article]);

  const handleParseMarkdown = useCallback(
    async (markdownSource: string, filename?: string) => {
      if (!markdownSource.trim()) {
        return;
      }

      setIsParsingMarkdown(true);
      try {
        const response = await parseMarkdownArticle(markdownSource, filename);
        if (isErrorResponse(response)) {
          throw new Error(response.error);
        }

        const parsed = response.data;

        setTitle(parsed.title || title);
        setSlug(parsed.slug || slug);
        setExcerpt(parsed.excerpt || excerpt);
        setContent(parsed.content);
        setDetectedTags(parsed.tags || []);

        if (parsed.hasFrontmatter) {
          setStatus(parsed.status);
          setCategory(
            parsed.category && getAllCategories().includes(parsed.category as Category)
              ? (parsed.category as Category)
              : ''
          );
          setFeaturedImage(parsed.featuredImage || '');
          setAuthor(parsed.authorId || '');
          setPublishedAt(toDateTimeLocalValue(parsed.publishedAt));
          setUpdatedAt(toDateTimeLocalValue(parsed.updatedAt));
          setMarkdownHint('已识别 Markdown frontmatter，并同步填充标题、摘要、状态、分类、作者和日期。');
        } else {
          setMarkdownHint('已解析 Markdown 内容，正文中的 Mermaid、数学公式和 Obsidian 语法会按现有文章链路处理。');
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Markdown 解析失败',
          text: error instanceof Error ? error.message : '无法解析当前 Markdown 内容。',
        });
      } finally {
        setIsParsingMarkdown(false);
      }
    },
    [excerpt, slug, title]
  );

  const handleSave = useCallback(
    async (articleData: ArticleMutationPayload) => {
      setIsSaving(true);
      try {
        const prepared: ArticleMutationPayload = {
          ...articleData,
          updatedAt: articleData.updatedAt ?? new Date(),
        };

        if (!prepared.slug && prepared.title) {
          prepared.slug = prepared.title
            .toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        }

        if (prepared.status === 'published' && !prepared.publishedAt) {
          prepared.publishedAt = new Date();
        }

        const response = article?.id
          ? await updateArticle(prepared)
          : await saveArticle(prepared);

        if (isErrorResponse(response)) {
          throw new Error(response.error);
        }

        Swal.fire({
          icon: 'success',
          title: '保存成功',
          text: article?.id ? '文章已更新。' : '文章已创建。',
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: '保存文章时发生错误',
          text: error instanceof Error ? error.message : '保存文章时发生错误。',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [article?.id]
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      const publishedDate = fromDateTimeLocalValue(publishedAt);
      const updatedDate = fromDateTimeLocalValue(updatedAt);

      void handleSave({
        ...article,
        title,
        slug,
        authorId: author.trim() || undefined,
        excerpt,
        content,
        status,
        category: category || null,
        featuredImage,
        publishedAt: publishedDate,
        updatedAt: updatedDate ?? new Date(),
        ...(article?.id ? {} : { createdAt: publishedDate }),
        tags: detectedTags,
      });
    },
    [
      article,
      author,
      category,
      content,
      detectedTags,
      excerpt,
      featuredImage,
      handleSave,
      publishedAt,
      slug,
      status,
      title,
      updatedAt,
    ]
  );

  const handleContentPaste = useCallback(
    (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pastedText = event.clipboardData.getData('text');
      if (!looksLikeFrontmatterMarkdown(pastedText)) {
        return;
      }

      window.setTimeout(() => {
        void handleParseMarkdown(pastedText);
      }, 0);
    },
    [handleParseMarkdown]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                标题 *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Slug *
              </label>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700">
                作者
              </label>
              <input
                type="text"
                id="author"
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="例如：徐尽欢"
              />
            </div>

            <div>
              <label htmlFor="featuredImage" className="block text-sm font-medium text-gray-700">
                封面图 URL
              </label>
              <input
                type="url"
                id="featuredImage"
                value={featuredImage}
                onChange={(event) => setFeaturedImage(event.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700">
              摘要
            </label>
            <textarea
              id="excerpt"
              rows={3}
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                  正文 *
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  直接粘贴整个 Markdown 文件也可以。若开头带 frontmatter，会自动识别；Mermaid、公式、WikiLink 等语法沿用现有文章处理链路。
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleParseMarkdown(content)}
                disabled={isParsingMarkdown || !content.trim()}
                className="inline-flex items-center justify-center rounded-md border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isParsingMarkdown ? '识别中...' : '识别当前 Markdown 属性'}
              </button>
            </div>
            <textarea
              id="content"
              rows={16}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onPaste={handleContentPaste}
              className="mt-3 block w-full border border-gray-300 rounded-md shadow-sm py-3 px-3 font-mono text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            {markdownHint && (
              <p className="mt-2 text-sm text-emerald-600">{markdownHint}</p>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                状态
              </label>
              <select
                id="status"
                value={status}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === 'draft' || value === 'published' || value === 'archived') {
                    setStatus(value);
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
                <option value="archived">已归档</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                分类
              </label>
              <select
                id="category"
                value={category}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '' || getAllCategories().includes(value as Category)) {
                    setCategory(value as Category | '');
                  }
                }}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">无分类</option>
                {getAllCategories().map((item) => (
                  <option key={item} value={item}>
                    {categoryInfo[item].icon} {categoryInfo[item].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="publishedAt" className="block text-sm font-medium text-gray-700">
                发布时间
              </label>
              <input
                type="datetime-local"
                id="publishedAt"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="updatedAt" className="block text-sm font-medium text-gray-700">
                更新时间
              </label>
              <input
                type="datetime-local"
                id="updatedAt"
                value={updatedAt}
                onChange={(event) => setUpdatedAt(event.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {detectedTags.length > 0 && (
            <div>
              <span className="block text-sm font-medium text-gray-700">识别到的标签</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {detectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
