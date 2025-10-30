/**
 * Breadcrumbs 组件
 * 从 Quartz 迁移
 * 
 * 功能：面包屑导航
 */

import React from 'react';
import '../../styles/quartz/breadcrumbs.css';

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumbs" aria-label="breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={item.path}>
            {index < items.length - 1 ? (
              <>
                <a href={item.path}>{item.label}</a>
                <span className="separator">›</span>
              </>
            ) : (
              <span className="current">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

