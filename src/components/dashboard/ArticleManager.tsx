import { useCallback, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.css';
import {
  deleteArticle,
  fetchArticles,
  importMarkdownArticles,
  isErrorResponse,
  isSuccessResponse,
  updateArticle,
  type DashboardArticle,
} from '../../lib/api';
import ArticleList from './ArticleList';

function describeImportSummary(imported: number, skipped: number, failed: number) {
  return `成功导入 ${imported} 篇，跳过 ${skipped} 篇，失败 ${failed} 篇。`;
}

export default function ArticleManager() {
  const [articles, setArticles] = useState<DashboardArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetchArticles();
      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }

      if (!isSuccessResponse(response)) {
        throw new Error('Unexpected API response');
      }

      setArticles(response.data);
    } catch (error) {
      console.error('Error loading articles:', error);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const handleEdit = useCallback((article: DashboardArticle) => {
    window.location.href = `/dashboard/article/${article.id}`;
  }, []);

  const handleDelete = useCallback(
    async (id: number) => {
      const confirmed = window.confirm('确定要删除这篇文章吗？此操作无法恢复。');
      if (!confirmed) {
        return;
      }

      try {
        const response = await deleteArticle(id);
        if (isErrorResponse(response)) {
          throw new Error(response.error);
        }

        await loadArticles();
      } catch (error) {
        console.error('Error deleting article:', error);
        await Swal.fire({
          icon: 'error',
          title: '删除失败',
          text: error instanceof Error ? error.message : '删除文章时发生错误。',
        });
      }
    },
    [loadArticles]
  );

  const handleQuickUpdate = useCallback(
    async (id: number, updates: Partial<DashboardArticle>) => {
      const previousArticle = articles.find((item) => item.id === id);
      if (!previousArticle) {
        return;
      }

      setArticles((current) =>
        current.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );

      const response = await updateArticle({
        id,
        ...updates,
      });

      if (isErrorResponse(response)) {
        setArticles((current) =>
          current.map((item) => (item.id === id ? previousArticle : item))
        );
        await Swal.fire({
          icon: 'error',
          title: '更新失败',
          text: response.error,
        });
        return;
      }

      setArticles((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                ...response.data,
                tags: item.tags,
              }
            : item
        )
      );
    },
    [articles]
  );

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleBatchUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []).filter((file) =>
        /\.(md|markdown)$/i.test(file.name)
      );

      if (selectedFiles.length === 0) {
        event.target.value = '';
        return;
      }

      setIsImporting(true);
      try {
        const payload = await Promise.all(
          selectedFiles.map(async (file) => ({
            name: file.name,
            content: await file.text(),
          }))
        );

        const response = await importMarkdownArticles(payload);
        if (isErrorResponse(response)) {
          throw new Error(response.error);
        }

        await loadArticles();

        await Swal.fire({
          icon: response.data.failed > 0 ? 'warning' : 'success',
          title: '批量导入完成',
          text: describeImportSummary(
            response.data.imported,
            response.data.skipped,
            response.data.failed
          ),
        });
      } catch (error) {
        console.error('Error importing markdown files:', error);
        await Swal.fire({
          icon: 'error',
          title: '批量导入失败',
          text: error instanceof Error ? error.message : '导入 Markdown 文件时发生错误。',
        });
      } finally {
        setIsImporting(false);
        event.target.value = '';
      }
    },
    [loadArticles]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,text/markdown"
        multiple
        className="hidden"
        onChange={(event) => void handleBatchUpload(event)}
      />

      <div className="flex flex-col gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">文章管理 ({articles.length})</h2>
          <p className="mt-2 text-sm text-gray-600">
            支持直接粘贴 Markdown、批量导入 Obsidian `.md` 文件，并在列表页快速切换状态与分类。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleImportClick}
            disabled={isImporting}
            className="inline-flex items-center rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? '上传中...' : '批量上传 Markdown'}
          </button>
          <a
            href="/dashboard/article/new"
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            新建文章
          </a>
        </div>
      </div>

      <ArticleList
        articles={articles}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onQuickUpdate={handleQuickUpdate}
      />
    </div>
  );
}
