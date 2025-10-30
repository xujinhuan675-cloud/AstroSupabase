/**
 * ContentMeta 组件
 * 从 Quartz 迁移
 * 
 * 功能：显示文章元数据（日期、阅读时间等）
 */

import React from 'react';
import '../../styles/quartz/contentmeta.css';

interface ContentMetaProps {
  publishedAt?: Date;
  readingTime?: string;
  author?: string;
}

export default function ContentMeta({ publishedAt, readingTime, author }: ContentMetaProps) {
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="content-meta">
      {author && <span className="author">作者: {author}</span>}
      {formattedDate && (
        <>
          {author && <span className="separator">•</span>}
          <span className="date">{formattedDate}</span>
        </>
      )}
      {readingTime && (
        <>
          <span className="separator">•</span>
          <span className="reading-time">{readingTime}</span>
        </>
      )}
    </div>
  );
}

