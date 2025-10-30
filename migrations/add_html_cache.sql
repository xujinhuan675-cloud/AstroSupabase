-- 添加 HTML 缓存字段和阅读时间字段到 articles 表
-- 这将显著提升页面加载性能

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS html_content TEXT,
ADD COLUMN IF NOT EXISTS reading_time TEXT;

-- 添加注释
COMMENT ON COLUMN articles.html_content IS '缓存的 HTML 内容，避免每次都处理 Markdown';
COMMENT ON COLUMN articles.reading_time IS '缓存的阅读时间，如 "5 min read"';

