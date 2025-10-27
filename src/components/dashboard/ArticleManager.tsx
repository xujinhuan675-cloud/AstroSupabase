import { useState, useEffect, useCallback } from 'react';
import type { Article } from '../../db/schema';
import { fetchArticles, deleteArticle } from '../../lib/api';
import ArticleList from './ArticleList';
import ArticleEditor from './ArticleEditor';

export default function ArticleManager() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<Partial<Article> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await fetchArticles();
      if (error) throw new Error(error);

      console.info('[loadArticles] Articles loaded successfully', data);
      setArticles(data || []);
    } catch (err) {
      console.error('Error loading articles:', err);
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchArticles]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const handleCreateNew = useCallback(() => {
    setCurrentArticle({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      status: 'draft',
      featuredImage: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setIsEditorOpen(true);
  }, []);

  const handleEdit = useCallback((article: Article) => {
    setCurrentArticle(article);
    setIsEditorOpen(true);
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('確定要刪除這篇文章嗎？此操作無法復原。')) return;
    try {
      const { error } = await deleteArticle(id);
      if (error) throw new Error(error);
      await loadArticles();
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('刪除文章時發生錯誤');
    }
  }, [loadArticles]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">文章管理 ({articles.length})</h2>
        <a
          href="/dashboard/article/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          新增文章
        </a>
      </div>

      <ArticleList
        articles={articles}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
