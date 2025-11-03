/**
 * 批量为 API 路由添加 export const prerender = false;
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiDir = path.join(__dirname, '../src/pages/api');

// 需要添加 prerender: false 的文件列表
const filesToUpdate = [
  'content-index.json.ts',
  'tasks.ts',
  'tasks/[id].ts',
  'auth/callback.ts',
  'auth/github.ts',
  'auth/google.ts',
  'auth/signin.ts',
  'auth/signout.ts',
  'auth/signup.ts',
  'tags/index.ts',
  'tags/[tag].ts',
];

function addPrerenderFalse(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已经有 prerender
  if (content.includes('export const prerender')) {
    console.log(`✓ Skip: ${path.relative(apiDir, filePath)} (already has prerender)`);
    return;
  }
  
  // 在第一个 import 之后添加
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // 找到最后一个 import 语句的位置
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
      insertIndex = i + 1;
    }
    if (lines[i].trim() && !lines[i].trim().startsWith('import') && !lines[i].trim().startsWith('//')) {
      break;
    }
  }
  
  // 插入 prerender: false
  lines.splice(insertIndex, 0, '', 'export const prerender = false;');
  
  const newContent = lines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf-8');
  
  console.log(`✓ Updated: ${path.relative(apiDir, filePath)}`);
}

console.log('🚀 Adding prerender: false to API routes...\n');

let updated = 0;
let skipped = 0;

for (const file of filesToUpdate) {
  const filePath = path.join(apiDir, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠ Warning: File not found: ${file}`);
    continue;
  }
  
  try {
    if (fs.readFileSync(filePath, 'utf-8').includes('export const prerender')) {
      skipped++;
    } else {
      updated++;
    }
    addPrerenderFalse(filePath);
  } catch (error) {
    console.error(`✗ Error updating ${file}:`, error.message);
  }
}

console.log(`\n✅ Done! Updated: ${updated}, Skipped: ${skipped}`);

