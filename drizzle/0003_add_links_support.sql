-- 添加文章标签表
CREATE TABLE IF NOT EXISTS article_tags (
  id SERIAL PRIMARY KEY,
  article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(article_id, tag)
);

-- 添加文章链接关系表（双向链接）
CREATE TABLE IF NOT EXISTS article_links (
  id SERIAL PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  target_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  link_type VARCHAR(50) DEFAULT 'internal', -- internal, external, embed
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_id, target_id)
);

-- 创建索引提高查询性能
CREATE INDEX idx_article_tags_tag ON article_tags(tag);
CREATE INDEX idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX idx_article_links_source ON article_links(source_id);
CREATE INDEX idx_article_links_target ON article_links(target_id);

-- 添加全文搜索支持
ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS articles_search_idx ON articles USING gin(search_vector);

-- 创建触发器自动更新搜索向量
CREATE OR REPLACE FUNCTION articles_search_trigger() RETURNS trigger AS $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.content,'')), 'B');
  return new;
end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS articles_search_update ON articles;
CREATE TRIGGER articles_search_update BEFORE INSERT OR UPDATE
  ON articles FOR EACH ROW EXECUTE FUNCTION articles_search_trigger();

