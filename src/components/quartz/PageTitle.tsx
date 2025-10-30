/**
 * PageTitle 组件
 * 从 Quartz 迁移
 * 
 * 显示网站标题，点击返回首页
 */

import React from 'react';
import '../../styles/quartz/pagetitle.css';

interface PageTitleProps {
  title?: string;
}

export default function PageTitle({ title = "IOTO Digital Garden" }: PageTitleProps) {
  return (
    <h2 className="page-title">
      <a href="/">{title}</a>
    </h2>
  );
}

