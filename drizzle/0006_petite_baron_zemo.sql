CREATE TABLE "article_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" serial NOT NULL,
	"target_id" serial NOT NULL,
	"link_type" text DEFAULT 'internal',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"article_id" serial NOT NULL,
	"tag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "html_content" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "reading_time" text;--> statement-breakpoint
ALTER TABLE "article_links" ADD CONSTRAINT "article_links_source_id_articles_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_links" ADD CONSTRAINT "article_links_target_id_articles_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;