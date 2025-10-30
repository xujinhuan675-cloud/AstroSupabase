/**
 * Explorer 组件
 * 从 Quartz 迁移并适配 AstroSupabase
 * 
 * 功能：文件/文章浏览树
 */

import React, { useEffect, useState } from 'react';
import '../../styles/quartz/explorer.css';

export interface ExplorerNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: ExplorerNode[];
}

interface ExplorerProps {
  title?: string;
  folderDefaultState?: 'collapsed' | 'open';
  folderClickBehavior?: 'collapse' | 'link';
}

export default function Explorer({
  title = '浏览',
  folderDefaultState = 'collapsed',
  folderClickBehavior = 'collapse'
}: ExplorerProps) {
  const [explorerData, setExplorerData] = useState<ExplorerNode[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 加载文章数据并构建树结构
    const loadExplorerData = async () => {
      try {
        const response = await fetch('/api/articles');
        const articles = await response.json();
        
        // 构建简单的树结构
        const tree: ExplorerNode[] = [];
        
        // 根据标签分组
        const folderMap = new Map<string, ExplorerNode>();
        
        articles.forEach((article: any) => {
          // 创建文章节点
          const articleNode: ExplorerNode = {
            name: article.title,
            path: `/articles/${article.id}`,
            isFolder: false
          };
          
          // 如果有标签，放到对应文件夹下
          if (article.tags && article.tags.length > 0) {
            article.tags.forEach((tag: string) => {
              if (!folderMap.has(tag)) {
                const folderNode: ExplorerNode = {
                  name: tag,
                  path: `/tags/${encodeURIComponent(tag)}`,
                  isFolder: true,
                  children: []
                };
                folderMap.set(tag, folderNode);
                tree.push(folderNode);
              }
              folderMap.get(tag)!.children!.push(articleNode);
            });
          } else {
            // 未分类文章
            if (!folderMap.has('未分类')) {
              const folderNode: ExplorerNode = {
                name: '未分类',
                path: '#',
                isFolder: true,
                children: []
              };
              folderMap.set('未分类', folderNode);
              tree.push(folderNode);
            }
            folderMap.get('未分类')!.children!.push(articleNode);
          }
        });
        
        setExplorerData(tree);
      } catch (error) {
        console.error('加载 Explorer 数据失败:', error);
      }
    };
    
    loadExplorerData();
  }, []);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const renderNode = (node: ExplorerNode, level = 0): JSX.Element => {
    if (node.isFolder) {
      const isExpanded = expandedFolders.has(node.path) || folderDefaultState === 'open';
      
      return (
        <li key={node.path} className="folder-item">
          <div className="folder-container">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="5 8 14 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`folder-icon ${isExpanded ? 'open' : ''}`}
              onClick={() => folderClickBehavior === 'collapse' && toggleFolder(node.path)}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            <div>
              {folderClickBehavior === 'link' ? (
                <a href={node.path} className="folder-title">{node.name}</a>
              ) : (
                <button 
                  className="folder-button"
                  onClick={() => toggleFolder(node.path)}
                >
                  <span className="folder-title">{node.name}</span>
                </button>
              )}
            </div>
          </div>
          <div className={`folder-outer ${isExpanded ? 'open' : ''}`}>
            <ul className="content">
              {node.children && node.children.map(child => renderNode(child, level + 1))}
            </ul>
          </div>
        </li>
      );
    } else {
      return (
        <li key={node.path} className="file-item">
          <a href={node.path}>{node.name}</a>
        </li>
      );
    }
  };

  return (
    <div 
      className={`explorer ${collapsed ? 'collapsed' : ''}`}
      data-behavior={folderClickBehavior}
      data-collapsed={folderDefaultState}
    >
      <button
        type="button"
        className="title-button explorer-toggle desktop-explorer"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <h2>{title}</h2>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="5 8 14 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="fold"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div className="explorer-content" aria-expanded={!collapsed}>
        <ul className="explorer-ul">
          {explorerData.map(node => renderNode(node))}
        </ul>
      </div>
    </div>
  );
}

