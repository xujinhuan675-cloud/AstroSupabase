import { useState } from 'react';
import { categoryInfo, getAllCategories, type Category } from '../../lib/categories';
import type { DashboardArticle } from '../../lib/api';

interface ArticleListProps {
  articles: DashboardArticle[];
  onEdit: (article: DashboardArticle) => void;
  onDelete: (id: number) => void | Promise<void>;
  onQuickUpdate: (id: number, updates: Partial<DashboardArticle>) => Promise<void>;
}

const statusLabels: Record<'draft' | 'published' | 'archived', string> = {
  draft: '草稿',
  published: '已发布',
  archived: '已归档',
};

const statusClasses: Record<'draft' | 'published' | 'archived', string> = {
  draft: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  published: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  archived: 'border-slate-200 bg-slate-50 text-slate-700',
};

export default function ArticleList({
  articles,
  onEdit,
  onDelete,
  onQuickUpdate,
}: ArticleListProps) {
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);

  const setPending = (key: string, active: boolean) => {
    setPendingKeys((current) =>
      active ? [...current, key] : current.filter((item) => item !== key)
    );
  };

  const isPending = (key: string) => pendingKeys.includes(key);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              标题
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              状态
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              分类
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              发布时间
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {articles.map((article) => {
            const statusKey = `${article.id}:status`;
            const categoryKey = `${article.id}:category`;
            const currentStatus =
              article.status === 'published' || article.status === 'archived'
                ? article.status
                : 'draft';
            const categoryValue = article.category || '';

            return (
              <tr key={article.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 align-top">
                  <a
                    href={`/dashboard/article/${article.id}`}
                    className="block text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {article.title}
                  </a>
                  <div className="mt-1 text-xs text-gray-500">
                    ID: {article.id} · 创建于{' '}
                    {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                  {article.excerpt && (
                    <p className="mt-2 line-clamp-2 max-w-xl text-sm text-gray-500">
                      {article.excerpt}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 align-top">
                  <select
                    value={currentStatus}
                    disabled={isPending(statusKey)}
                    onChange={async (event) => {
                      const nextStatus = event.target.value as 'draft' | 'published' | 'archived';
                      setPending(statusKey, true);
                      try {
                        await onQuickUpdate(article.id, { status: nextStatus });
                      } finally {
                        setPending(statusKey, false);
                      }
                    }}
                    className={`min-w-[112px] rounded-full border px-3 py-1 text-xs font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${statusClasses[currentStatus]}`}
                  >
                    <option value="draft">{statusLabels.draft}</option>
                    <option value="published">{statusLabels.published}</option>
                    <option value="archived">{statusLabels.archived}</option>
                  </select>
                </td>
                <td className="px-6 py-4 align-top">
                  <select
                    value={categoryValue}
                    disabled={isPending(categoryKey)}
                    onChange={async (event) => {
                      const nextCategory = event.target.value;
                      setPending(categoryKey, true);
                      try {
                        await onQuickUpdate(article.id, {
                          category: (nextCategory || null) as Category | null,
                        });
                      } finally {
                        setPending(categoryKey, false);
                      }
                    }}
                    className="min-w-[148px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">无分类</option>
                    {getAllCategories().map((item) => (
                      <option key={item} value={item}>
                        {categoryInfo[item].icon} {categoryInfo[item].name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 align-top text-sm text-gray-500">
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleString('zh-CN')
                    : '未发布'}
                </td>
                <td className="px-6 py-4 align-top text-sm font-medium">
                  <a
                    href={`/dashboard/article/${article.id}`}
                    className="mr-4 text-indigo-600 hover:text-indigo-900"
                    onClick={(event) => {
                      event.preventDefault();
                      onEdit(article);
                    }}
                  >
                    编辑
                  </a>
                  <button
                    type="button"
                    onClick={() => void onDelete(article.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    删除
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
