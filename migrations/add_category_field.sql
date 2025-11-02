-- Migration: Add category field to articles table
-- Created: 2024
-- Description: Adds a category enum field to the articles table for content organization

-- Add category column (nullable, so existing articles won't break)
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS category TEXT 
CHECK (category IN ('math', 'physics', 'chemistry', 'biology', 'computer', 'literature') OR category IS NULL);

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category) WHERE category IS NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN articles.category IS 'Article category: math, physics, chemistry, biology, computer, or literature';

