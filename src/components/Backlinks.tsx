/**
 * Backlinks 组件
 * 使用 Quartz 样式和逻辑
 */

import React, { useEffect, useState } from 'react';
import '../styles/quartz/backlinks.css';

interface Backlink {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
}

interface BacklinksProps {
  articleId: number;
  backlinks?: Backlink[];
  hideWhenEmpty?: boolean;
}

export default function Backlinks({ articleId, backlinks: initialBacklinks, hideWhenEmpty = false }: BacklinksProps) {
  const [backlinks, setBacklinks] = useState<Backlink[]>(initialBacklinks || []);
  const [loading, setLoading] = useState(!initialBacklinks);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 如果已有服务端数据，不需要请求
    if (initialBacklinks) {
      setBacklinks(initialBacklinks);
      setLoading(false);
      return;
    }

    // 没有数据时才请求
    fetch(`/api/articles/${articleId}/backlinks`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch backlinks');
        }
        return res.json();
      })
      .then(data => {
        setBacklinks(data.backlinks || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching backlinks:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [articleId, initialBacklinks]);

  // 如果设置了隐藏且没有反向链接，则不显示
  if (hideWhenEmpty && backlinks.length === 0 && !loading) {
    return null;
  }

  if (loading) {
    return (
      <div className="backlinks">
        <h3>反向链接</h3>
        <p className="no-backlinks">加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="backlinks">
        <h3>反向链接</h3>
        <p className="no-backlinks" style={{ color: 'var(--danger, #db4242)' }}>
          加载失败: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="backlinks">
      <h3>反向链接</h3>
      {backlinks.length > 0 ? (
        <ul className="overflow">
          {backlinks.map((backlink) => (
            <li key={backlink.id}>
              <a href={`/articles/${backlink.slug}`} className="internal">
                {backlink.title}
              </a>
              {backlink.excerpt && (
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: 'var(--gray)', 
                  marginTop: '0.25rem',
                  marginBottom: 0
                }}>
                  {backlink.excerpt}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-backlinks">暂无其他文章链接到此文章</p>
      )}
    </div>
  );
}
