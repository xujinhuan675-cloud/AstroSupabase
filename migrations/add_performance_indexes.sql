-- 性能优化：添加数据库索引
-- 这些索引将显著提升查询性能
-- 执行日期：2025-10-31

-- ============================================
-- Articles 表索引
-- ============================================

-- 1. 状态和发布日期组合索引（最重要）
-- 用于：getArticles() 查询已发布文章并按日期排序
CREATE INDEX IF NOT EXISTS idx_articles_status_published_date 
  ON articles(status, is_deleted, published_at DESC)
  WHERE status = 'published' AND is_deleted = false;

-- 2. Slug 索引（用于链接解析）
-- 用于：根据 slug 查找文章
CREATE INDEX IF NOT EXISTS idx_articles_slug 
  ON articles(slug) 
  WHERE status = 'published';

-- 3. 发布日期索引（用于排序）
CREATE INDEX IF NOT EXISTS idx_articles_published_at 
  ON articles(published_at DESC NULLS LAST);

-- 4. Author 索引（如果需要按作者查询）
CREATE INDEX IF NOT EXISTS idx_articles_author 
  ON articles(author_id) 
  WHERE is_deleted = false;

-- ============================================
-- ArticleTags 表索引
-- ============================================

-- 5. Article ID 索引（用于获取文章标签）
-- 用于：getArticleTags(articleId)
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id 
  ON article_tags(article_id);

-- 6. Tag 索引（用于按标签查询文章）
-- 用于：getArticlesByTag(tag)
CREATE INDEX IF NOT EXISTS idx_article_tags_tag 
  ON article_tags(tag);

-- 7. 组合索引（用于标签统计）
-- 用于：getAllTags() 和 JOIN 查询
CREATE INDEX IF NOT EXISTS idx_article_tags_composite 
  ON article_tags(tag, article_id);

-- ============================================
-- ArticleLinks 表索引
-- ============================================

-- 8. Source ID 索引（用于获取前向链接）
-- 用于：getForwardLinks(articleId)
CREATE INDEX IF NOT EXISTS idx_article_links_source 
  ON article_links(source_id);

-- 9. Target ID 索引（用于获取反向链接）
-- 用于：getBacklinks(articleId)
CREATE INDEX IF NOT EXISTS idx_article_links_target 
  ON article_links(target_id);

-- 10. 组合索引（用于双向链接查询）
-- 用于：防止重复链接和快速查找
CREATE INDEX IF NOT EXISTS idx_article_links_source_target 
  ON article_links(source_id, target_id);

-- 11. 反向组合索引（用于另一方向的查询）
CREATE INDEX IF NOT EXISTS idx_article_links_target_source 
  ON article_links(target_id, source_id);

-- ============================================
-- 性能统计
-- ============================================

-- 分析表统计信息（PostgreSQL）
ANALYZE articles;
ANALYZE article_tags;
ANALYZE article_links;

-- ============================================
-- 索引使用说明
-- ============================================

-- 查看索引是否被使用：
-- EXPLAIN ANALYZE SELECT * FROM articles WHERE status = 'published' ORDER BY published_at DESC;

-- 查看所有索引：
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- 查看索引大小：
-- SELECT 
--   schemaname, 
--   tablename, 
--   indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;

