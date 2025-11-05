/**
 * 构建时生成知识图谱静态数据
 * 替代动态 API，提升性能
 */

import fs from 'fs';
import path from 'path';
import { convertToQuartzFormatOptimized } from '../src/lib/graph-data-adapter.js';

async function generateGraphData() {
  console.log('🌐 开始生成知识图谱静态数据...\n');
  
  try {
    // 使用现有的转换函数生成数据
    const graphData = await convertToQuartzFormatOptimized();
    
    // 确保 public 目录存在
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // 写入静态 JSON 文件
    const outputPath = path.join(publicDir, 'content-index.json');
    fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));
    
    const nodeCount = Object.keys(graphData).length;
    console.log(`✅ 知识图谱数据生成成功！`);
    console.log(`   - 节点数量: ${nodeCount}`);
    console.log(`   - 输出路径: ${outputPath}\n`);
    
  } catch (error) {
    console.error('❌ 生成知识图谱数据失败:', error);
    process.exit(1);
  }
}

// 运行
generateGraphData()
  .then(() => {
    console.log('✅ 知识图谱数据生成完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

