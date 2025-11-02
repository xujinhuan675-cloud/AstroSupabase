/**
 * 数据库迁移脚本：修复外键字段类型
 * 
 * 将 article_tags.article_id, article_links.source_id, article_links.target_id
 * 从 SERIAL 改为 INTEGER（这些是外键，不应该使用 SERIAL）
 * 
 * 使用方法：
 * 1. 确保 .env 文件中配置了 DATABASE_URL
 * 2. 运行: npx tsx scripts/migrate-fix-foreign-keys.ts
 */

import postgres from 'postgres';
import { config } from 'dotenv';

// 加载环境变量
config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ 错误: DATABASE_URL 未在 .env 文件中设置');
  console.error('请确保 .env 文件存在并包含 DATABASE_URL');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false });

async function migrate() {
  try {
    console.log('🔄 开始执行迁移：修复外键字段类型...\n');

    // 检查当前列的类型
    console.log('📊 检查当前列类型...');
    const articleTagsColumn = await sql`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'article_tags' AND column_name = 'article_id'
    `;
    
    const articleLinksSource = await sql`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'article_links' AND column_name = 'source_id'
    `;
    
    const articleLinksTarget = await sql`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'article_links' AND column_name = 'target_id'
    `;

    console.log('   当前 article_tags.article_id:', articleTagsColumn[0] || '未找到');
    console.log('   当前 article_links.source_id:', articleLinksSource[0] || '未找到');
    console.log('   当前 article_links.target_id:', articleLinksTarget[0] || '未找到');
    console.log('');

    // 检查是否有序列需要删除
    const checkSequence = async (tableName: string, columnName: string) => {
      const seqName = `${tableName}_${columnName}_seq`;
      const seqExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = ${seqName}
        ) as exists
      `;
      return seqExists[0]?.exists || false;
    };

    // 1. 修复 article_tags.article_id
    if (articleTagsColumn.length > 0) {
      const col = articleTagsColumn[0];
      const hasSeq = await checkSequence('article_tags', 'article_id');
      
      if (col.data_type === 'integer' && !hasSeq) {
        console.log('   ℹ️  article_tags.article_id 已经是 integer 类型，无需修改\n');
      } else {
        console.log('1. 修复 article_tags.article_id...');
        
        // 如果列是 serial，需要移除默认值和序列
        if (hasSeq || col.column_default?.includes('nextval')) {
          console.log('   移除默认值和序列...');
          await sql`
            ALTER TABLE article_tags 
            ALTER COLUMN article_id DROP DEFAULT
          `;
          
          if (hasSeq) {
            const seqName = 'article_tags_article_id_seq';
            await sql.unsafe(`DROP SEQUENCE IF EXISTS ${seqName}`);
            console.log(`   ✅ 序列 ${seqName} 已删除`);
          }
        }
        
        // 确保列类型是 integer
        if (col.data_type !== 'integer') {
          await sql`
            ALTER TABLE article_tags 
            ALTER COLUMN article_id TYPE INTEGER USING article_id::integer
          `;
          console.log('   ✅ 列类型已改为 INTEGER');
        }
        
        // 重新添加 NOT NULL 约束（如果丢失）
        if (col.is_nullable === 'YES') {
          await sql`
            ALTER TABLE article_tags 
            ALTER COLUMN article_id SET NOT NULL
          `;
          console.log('   ✅ NOT NULL 约束已添加');
        }
        
        console.log('   ✅ article_tags.article_id 修复完成\n');
      }
    }

    // 2. 修复 article_links.source_id
    if (articleLinksSource.length > 0) {
      const col = articleLinksSource[0];
      const hasSeq = await checkSequence('article_links', 'source_id');
      
      if (col.data_type === 'integer' && !hasSeq) {
        console.log('   ℹ️  article_links.source_id 已经是 integer 类型，无需修改\n');
      } else {
        console.log('2. 修复 article_links.source_id...');
        
        if (hasSeq || col.column_default?.includes('nextval')) {
          console.log('   移除默认值和序列...');
          await sql`
            ALTER TABLE article_links 
            ALTER COLUMN source_id DROP DEFAULT
          `;
          
          if (hasSeq) {
            const seqName = 'article_links_source_id_seq';
            await sql.unsafe(`DROP SEQUENCE IF EXISTS ${seqName}`);
            console.log(`   ✅ 序列 ${seqName} 已删除`);
          }
        }
        
        if (col.data_type !== 'integer') {
          await sql`
            ALTER TABLE article_links 
            ALTER COLUMN source_id TYPE INTEGER USING source_id::integer
          `;
          console.log('   ✅ 列类型已改为 INTEGER');
        }
        
        if (col.is_nullable === 'YES') {
          await sql`
            ALTER TABLE article_links 
            ALTER COLUMN source_id SET NOT NULL
          `;
          console.log('   ✅ NOT NULL 约束已添加');
        }
        
        console.log('   ✅ article_links.source_id 修复完成\n');
      }
    }

    // 3. 修复 article_links.target_id
    if (articleLinksTarget.length > 0) {
      const col = articleLinksTarget[0];
      const hasSeq = await checkSequence('article_links', 'target_id');
      
      if (col.data_type === 'integer' && !hasSeq) {
        console.log('   ℹ️  article_links.target_id 已经是 integer 类型，无需修改\n');
      } else {
        console.log('3. 修复 article_links.target_id...');
        
        if (hasSeq || col.column_default?.includes('nextval')) {
          console.log('   移除默认值和序列...');
          await sql`
            ALTER TABLE article_links 
            ALTER COLUMN target_id DROP DEFAULT
          `;
          
          if (hasSeq) {
            const seqName = 'article_links_target_id_seq';
            await sql.unsafe(`DROP SEQUENCE IF EXISTS ${seqName}`);
            console.log(`   ✅ 序列 ${seqName} 已删除`);
          }
        }
        
        if (col.data_type !== 'integer') {
          await sql`
            ALTER TABLE article_links 
            ALTER COLUMN target_id TYPE INTEGER USING target_id::integer
          `;
          console.log('   ✅ 列类型已改为 INTEGER');
        }
        
        if (col.is_nullable === 'YES') {
          await sql`
            ALTER TABLE article_links 
            ALTER COLUMN target_id SET NOT NULL
          `;
          console.log('   ✅ NOT NULL 约束已添加');
        }
        
        console.log('   ✅ article_links.target_id 修复完成\n');
      }
    }

    console.log('✅ 迁移完成！外键字段类型已修复。\n');
    
    // 验证结果
    console.log('📊 验证结果:');
    const verifyTags = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'article_tags' AND column_name = 'article_id'
    `;
    
    const verifySource = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'article_links' AND column_name = 'source_id'
    `;
    
    const verifyTarget = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'article_links' AND column_name = 'target_id'
    `;
    
    if (verifyTags.length > 0) {
      console.log('   ✅ article_tags.article_id:', verifyTags[0]);
    }
    if (verifySource.length > 0) {
      console.log('   ✅ article_links.source_id:', verifySource[0]);
    }
    if (verifyTarget.length > 0) {
      console.log('   ✅ article_links.target_id:', verifyTarget[0]);
    }

    // 验证外键约束
    console.log('\n📋 外键约束验证:');
    const fkCheck = await sql`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (tc.table_name = 'article_tags' OR tc.table_name = 'article_links')
      ORDER BY tc.table_name, kcu.column_name
    `;
    
    if (fkCheck.length > 0) {
      console.log('   ✅ 外键约束存在:');
      fkCheck.forEach((fk: any) => {
        console.log(`      ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('   ⚠️  未找到外键约束');
    }

  } catch (error) {
    console.error('❌ 迁移失败:', error);
    if (error instanceof Error) {
      console.error('   错误信息:', error.message);
      console.error('   堆栈:', error.stack);
    }
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();

