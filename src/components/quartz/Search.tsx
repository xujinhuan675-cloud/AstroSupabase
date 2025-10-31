/**
 * Search 组件
 * 从 Quartz 迁移并适配 AstroSupabase
 * 
 * 功能：全文搜索
 */

import React, { useState, useEffect, useRef } from 'react';
import '../../styles/quartz/search.css';

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
}

interface SearchProps {
  enablePreview?: boolean;
}

export default function Search({ enablePreview = true }: SearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchArticles = async () => {
      setIsSearching(true);
      try {
        const response = await fetch('/api/articles');
        const articles = await response.json();
        
        // 简单的客户端搜索
        const filtered = articles.filter((article: any) => {
          const titleMatch = article.title.toLowerCase().includes(searchQuery.toLowerCase());
          const contentMatch = article.content.toLowerCase().includes(searchQuery.toLowerCase());
          const slugMatch = article.slug?.toLowerCase().includes(searchQuery.toLowerCase());
          
          return titleMatch || contentMatch || slugMatch;
        });
        
        setSearchResults(filtered.slice(0, 10)); // 只显示前10个结果
      } catch (error) {
        console.error('搜索失败:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchArticles, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // 点击外部区域关闭搜索弹窗（不包括搜索框按钮本身）
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showSearch) return;
      
      const target = event.target as Node;
      
      // 如果点击的是搜索框按钮，不关闭弹窗
      if (searchButtonRef.current && searchButtonRef.current.contains(target)) {
        return;
      }
      
      // 如果点击的是搜索弹窗内部，不关闭
      if (searchContainerRef.current && searchContainerRef.current.contains(target)) {
        return;
      }
      
      // 点击外部区域，关闭弹窗
      setShowSearch(false);
    };

    if (showSearch) {
      // 使用 mousedown 而不是 click，避免与按钮的 onClick 冲突
      document.addEventListener('mousedown', handleClickOutside);
      // 阻止body滚动
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (showSearch) {
        document.body.style.overflow = '';
      }
    };
  }, [showSearch]);

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchButtonClick = (e: React.MouseEvent) => {
    // 如果弹窗已打开，点击搜索按钮不关闭，保持打开状态
    // 如果弹窗未打开，点击搜索按钮打开弹窗
    if (!showSearch) {
      setShowSearch(true);
    }
    // 阻止事件冒泡，避免触发外部点击关闭
    e.stopPropagation();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // 只有点击蒙层本身（不是搜索框区域）时关闭弹窗
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      setShowSearch(false);
    }
  };

  return (
    <div className="search">
      <button 
        ref={searchButtonRef}
        className="search-button search-box-button"
        onClick={handleSearchButtonClick}
        aria-label="搜索"
      >
        <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.9 19.7">
          <title>搜索</title>
          <g className="search-path" fill="none">
            <path strokeLinecap="square" d="M18.5 18.3l-5.4-5.4" />
            <circle cx="8" cy="8" r="7" />
          </g>
        </svg>
        <span className="search-text">搜索</span>
      </button>
      
      {showSearch && (
        <div 
          className="search-container" 
          ref={searchContainerRef}
          onClick={handleOverlayClick}
        >
          <div className="search-space">
            <div className="search-bar-wrapper">
              <input
                autoComplete="off"
                className="search-bar"
                name="search"
                type="text"
                aria-label="搜索文章"
                placeholder="搜索文章..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button 
                className="search-close-button"
                onClick={handleCloseSearch}
                aria-label="关闭搜索"
                title="关闭搜索"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className={`search-layout ${enablePreview ? 'preview-enabled' : ''}`}>
              {isSearching && <div className="search-loading">搜索中...</div>}
              
              {!isSearching && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((result) => (
                    <a
                      key={result.id}
                      href={`/articles/${result.id}`}
                      className="search-result-item"
                      onClick={() => setShowSearch(false)}
                    >
                      <h3>{result.title}</h3>
                      {enablePreview && result.excerpt && (
                        <p className="search-excerpt">{result.excerpt}</p>
                      )}
                    </a>
                  ))}
                </div>
              )}
              
              {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                <div className="search-no-results">未找到匹配的文章</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

