
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

// Load environment variables FIRST
dotenv.config();

// Dynamically import db client after env vars are loaded to avoid "DATABASE_URL not set" error
// because static imports are hoisted in ESM
const { db } = await import('../src/db/client');


async function rebuildSearchIndex() {
  console.log('🔄 Starting search index rebuild...');

  try {
    // We execute a raw SQL update to force recalculation of the search_vector
    // This matches the logic in the postgres trigger
    await db.execute(sql`
      UPDATE articles 
      SET search_vector = 
        setweight(to_tsvector('simple', coalesce(title,'')), 'A') || 
        setweight(to_tsvector('simple', coalesce(content,'')), 'B')
    `);

    console.log('✅ Search index rebuild completed successfully!');
    console.log('Check your database or search API to verify results.');

  } catch (error) {
    console.error('❌ Error rebuilding index:', error);
  }

  process.exit(0);
}

rebuildSearchIndex();
