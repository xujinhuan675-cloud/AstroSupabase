/**
 * 性能测试脚本
 * 测试页面响应时间，验证优化效果
 */

import * as https from 'https';
import * as http from 'http';

interface TestResult {
  url: string;
  status: number;
  responseTime: number;
  contentLength: number;
  success: boolean;
  error?: string;
}

// 测试单个 URL
async function testUrl(url: string): Promise<TestResult> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    protocol.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        resolve({
          url,
          status: res.statusCode || 0,
          responseTime,
          contentLength: Buffer.byteLength(data),
          success: res.statusCode === 200,
        });
      });
    }).on('error', (err) => {
      const responseTime = Date.now() - startTime;
      
      resolve({
        url,
        status: 0,
        responseTime,
        contentLength: 0,
        success: false,
        error: err.message,
      });
    });
  });
}

// 格式化输出
function formatResult(result: TestResult): string {
  const status = result.success ? '✅' : '❌';
  const time = result.responseTime.toString().padStart(6, ' ');
  const size = (result.contentLength / 1024).toFixed(2).padStart(8, ' ');
  
  return `${status} ${time}ms | ${size}KB | ${result.url}`;
}

// 主测试函数
async function main() {
  console.log('🚀 开始性能测试...\n');
  console.log('测试环境: 本地开发服务器 (http://localhost:4321)\n');
  console.log('提示: 请先运行 npm run dev 启动开发服务器\n');
  console.log('═'.repeat(70));
  console.log('状态 | 响应时间 | 文件大小 | URL');
  console.log('═'.repeat(70));
  
  const baseUrl = 'http://localhost:4321';
  
  // 测试页面列表
  const testUrls = [
    { path: '/', name: '首页' },
    { path: '/blog', name: '博客列表' },
    { path: '/articles/1', name: '文章详情 (ID: 1)' },
    { path: '/articles/2', name: '文章详情 (ID: 2)' },
    { path: '/tags', name: '标签索引' },
    { path: '/categories', name: '分类索引' },
  ];
  
  const results: TestResult[] = [];
  
  // 顺序测试每个 URL（避免并发影响结果）
  for (const { path, name } of testUrls) {
    const url = baseUrl + path;
    console.log(`\n测试: ${name}`);
    
    // 每个 URL 测试 3 次取平均值
    const attempts: TestResult[] = [];
    
    for (let i = 1; i <= 3; i++) {
      process.stdout.write(`  第 ${i} 次: `);
      const result = await testUrl(url);
      attempts.push(result);
      console.log(formatResult(result));
      
      // 等待 500ms 避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 计算平均响应时间
    const avgTime = Math.round(
      attempts.reduce((sum, r) => sum + r.responseTime, 0) / attempts.length
    );
    
    console.log(`  平均响应时间: ${avgTime}ms`);
    
    results.push({
      ...attempts[0],
      responseTime: avgTime,
    });
  }
  
  // 总结报告
  console.log('\n' + '═'.repeat(70));
  console.log('📊 性能测试总结\n');
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`✅ 成功: ${successCount}/${totalCount}`);
  
  if (successCount > 0) {
    const avgResponseTime = Math.round(
      results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.responseTime, 0) / successCount
    );
    
    console.log(`⏱️  平均响应时间: ${avgResponseTime}ms`);
    
    // 性能评级
    console.log('\n性能评级:');
    results.forEach(result => {
      if (!result.success) return;
      
      let grade = '⭐️⭐️⭐️⭐️⭐️'; // 优秀
      if (result.responseTime > 200) grade = '⭐️⭐️⭐️⭐️'; // 良好
      if (result.responseTime > 500) grade = '⭐️⭐️⭐️'; // 一般
      if (result.responseTime > 1000) grade = '⭐️⭐️'; // 较慢
      if (result.responseTime > 2000) grade = '⭐️'; // 慢
      
      console.log(`  ${grade} ${result.url} (${result.responseTime}ms)`);
    });
  }
  
  // 性能目标对比
  console.log('\n📈 性能目标对比:\n');
  console.log('  目标         | 实际');
  console.log('  --------------|-------------');
  console.log('  首页 < 100ms | ' + (results[0]?.responseTime || 'N/A') + 'ms');
  console.log('  列表 < 200ms | ' + (results[1]?.responseTime || 'N/A') + 'ms');
  console.log('  详情 < 300ms | ' + (results[2]?.responseTime || 'N/A') + 'ms');
  
  console.log('\n💡 提示:');
  console.log('  - 开发模式响应时间比生产环境慢 2-5 倍');
  console.log('  - 运行 npm run build && npm run preview 测试生产性能');
  console.log('  - 部署到 Vercel 后使用 Lighthouse 测试真实性能\n');
}

// 运行测试
main().catch(console.error);

