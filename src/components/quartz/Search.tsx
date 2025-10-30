/**
 * Search 组件
 * 从 Quartz 迁移并适配 AstroSupabase
 * 
 * 功能：全文搜索
 */

import React, { useState, useEffect } from 'react';
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

  return (
    <div className="search">
      <button 
        className="search-button"
        onClick={() => setShowSearch(!showSearch)}
        aria-label="搜索"
      >
        <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.9 19.7">
          <title>搜索</title>
          <g className="search-path" fill="none">
            <path strokeLinecap="square" d="M18.5 18.3l-5.4-5.4" />
            <circle cx="8" cy="8" r="7" />
          </g>
        </svg>
        <p>搜索</p>
      </button>
      
      {showSearch && (
        <div className="search-container">
          <div className="search-space">
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

