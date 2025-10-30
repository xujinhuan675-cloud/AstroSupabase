/**
 * Footer 组件
 * 从 Quartz 迁移
 * 
 * 显示页脚链接和版权信息
 */

import React from 'react';
import '../../styles/quartz/footer.css';

interface FooterProps {
  links?: Record<string, string>;
}

export default function Footer({ links }: FooterProps) {
  const year = new Date().getFullYear();
  const defaultLinks = links || {
    "GitHub": "https://github.com/yourusername/ioto-doc",
  };

  return (
    <footer className="quartz-footer">
      <p>
        Created with <a href="https://quartz.jzhao.xyz/">Quartz v4</a> © {year}
      </p>
      {Object.keys(defaultLinks).length > 0 && (
        <ul>
          {Object.entries(defaultLinks).map(([text, link]) => (
            <li key={text}>
              <a href={link} target="_blank" rel="noopener noreferrer">
                {text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </footer>
  );
}

