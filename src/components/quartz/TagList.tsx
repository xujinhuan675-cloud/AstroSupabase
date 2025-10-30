/**
 * TagList 组件
 * 从 Quartz 迁移
 * 
 * 功能：显示文章标签列表
 */

import React from 'react';
import '../../styles/quartz/taglist.css';

interface TagListProps {
  tags: string[];
}

export default function TagList({ tags }: TagListProps) {
  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="taglist">
      <ul>
        {tags.map((tag) => (
          <li key={tag}>
            <a href={`/tags/${encodeURIComponent(tag)}`} className="tag-link">
              #{tag}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

