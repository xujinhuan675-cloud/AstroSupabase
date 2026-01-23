
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config();

const { db } = await import('../src/db/client');

async function verifySearchData() {
    console.log('🔍 Verifying production search data...');

    try {
        // Check 1: Count total articles
        const countResult = await db.execute(sql`SELECT COUNT(*) FROM articles WHERE is_deleted = false`);
        console.log(`Total active articles: ${countResult[0].count}`);

        // Check 2: Count articles with populated search_vector
        const populatedResult = await db.execute(sql`SELECT COUNT(*) FROM articles WHERE search_vector IS NOT NULL`);
        console.log(`Articles with search index: ${populatedResult[0].count}`);

        // Check 3: specifically check for a common term (modify '文章' to something you know exists)
        // trying a broad search
        const sampleSearch = await db.execute(sql`
      SELECT id, title, slug 
      FROM articles 
      WHERE search_vector @@ plainto_tsquery('simple', '文章') 
      LIMIT 3
    `);

        console.log('Sample search results for "文章":', sampleSearch);

    } catch (error) {
        console.error('❌ Verification failed:', error);
    }

    process.exit(0);
}

verifySearchData();
