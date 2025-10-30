import { boolean, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Example table - modify according to your needs
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  isComplete: boolean('is_complete').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
});

export const articles = pgTable('articles', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  excerpt: text('excerpt'),
  content: text('content').notNull(),
  authorId: text('author_id').notNull(),
  featuredImage: text('featured_image'),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
  publishedAt: timestamp('published_at'),
});

// 文章标签表 - 支持多标签系统
export const articleTags = pgTable('article_tags', {
  id: serial('id').primaryKey(),
  articleId: serial('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  tag: text('tag').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 文章链接关系表 - 支持双向链接和知识图谱
export const articleLinks = pgTable('article_links', {
  id: serial('id').primaryKey(),
  sourceId: serial('source_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  targetId: serial('target_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  linkType: text('link_type', { enum: ['internal', 'external', 'embed'] }).default('internal'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;

export type ArticleTag = typeof articleTags.$inferSelect;
export type NewArticleTag = typeof articleTags.$inferInsert;

export type ArticleLink = typeof articleLinks.$inferSelect;
export type NewArticleLink = typeof articleLinks.$inferInsert;