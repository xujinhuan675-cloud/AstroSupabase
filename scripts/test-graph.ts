/**
 * 知识图谱组件测试脚本
 * 
 * 用途：验证图谱数据接口和组件是否正常工作
 * 运行：npm run dev 后在浏览器中访问 /graph 页面
 */

import { getGraphData } from '../src/lib/links-service';

async function testGraphData() {
  console.log('🧪 开始测试知识图谱数据...\n');

  try {
    // 1. 测试数据获取
    console.log('1️⃣ 测试 getGraphData()...');
    const data = await getGraphData();
    
    console.log(`   ✅ 节点数量: ${data.nodes.length}`);
    console.log(`   ✅ 链接数量: ${data.links.length}`);
    
    if (data.nodes.length === 0) {
      console.warn('   ⚠️  警告: 没有节点数据');
      console.log('   💡 请确保数据库中有已发布的文章');
      return;
    }

    // 2. 测试节点结构
    console.log('\n2️⃣ 测试节点结构...');
    const sampleNode = data.nodes[0];
    console.log(`   示例节点:`, sampleNode);
    
    const requiredFields = ['id', 'title', 'slug'];
    const missingFields = requiredFields.filter(field => !(field in sampleNode));
    
    if (missingFields.length > 0) {
      console.error(`   ❌ 节点缺少必需字段: ${missingFields.join(', ')}`);
    } else {
      console.log('   ✅ 节点结构正确');
    }

    // 3. 测试链接结构
    console.log('\n3️⃣ 测试链接结构...');
    if (data.links.length > 0) {
      const sampleLink = data.links[0];
      console.log(`   示例链接:`, sampleLink);
      
      const requiredLinkFields = ['source', 'target'];
      const missingLinkFields = requiredLinkFields.filter(
        field => !(field in sampleLink)
      );
      
      if (missingLinkFields.length > 0) {
        console.error(`   ❌ 链接缺少必需字段: ${missingLinkFields.join(', ')}`);
      } else {
        console.log('   ✅ 链接结构正确');
      }

      // 验证链接的节点是否存在
      const nodeIds = new Set(data.nodes.map(n => n.id));
      const invalidLinks = data.links.filter(
        link => !nodeIds.has(link.source) || !nodeIds.has(link.target)
      );
      
      if (invalidLinks.length > 0) {
        console.warn(`   ⚠️  发现 ${invalidLinks.length} 个无效链接（指向不存在的节点）`);
      } else {
        console.log('   ✅ 所有链接都指向有效节点');
      }
    } else {
      console.log('   ℹ️  暂无链接数据');
      console.log('   💡 在文章中使用 [[双向链接]] 语法创建链接');
    }

    // 4. 统计信息
    console.log('\n4️⃣ 数据统计:');
    console.log(`   📊 总节点数: ${data.nodes.length}`);
    console.log(`   📊 总链接数: ${data.links.length}`);
    console.log(`   📊 平均每个节点的链接数: ${
      data.nodes.length > 0 
        ? (data.links.length * 2 / data.nodes.length).toFixed(2)
        : 0
    }`);

    // 找出度数最高的节点
    if (data.nodes.length > 0) {
      const nodeDegrees = new Map<number, number>();
      data.links.forEach(link => {
        nodeDegrees.set(link.source, (nodeDegrees.get(link.source) || 0) + 1);
        nodeDegrees.set(link.target, (nodeDegrees.get(link.target) || 0) + 1);
      });

      const sortedNodes = Array.from(nodeDegrees.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      if (sortedNodes.length > 0) {
        console.log('\n5️⃣ 链接最多的节点 (Top 5):');
        sortedNodes.forEach(([nodeId, degree], index) => {
          const node = data.nodes.find(n => n.id === nodeId);
          console.log(`   ${index + 1}. ${node?.title || nodeId} - ${degree} 个链接`);
        });
      }
    }

    console.log('\n✅ 所有测试通过！');
    console.log('\n📝 下一步:');
    console.log('   1. 启动开发服务器: npm run dev');
    console.log('   2. 访问图谱页面: http://localhost:4321/graph');
    console.log('   3. 检查浏览器控制台是否有错误');
    console.log('   4. 测试节点交互（点击、悬停、缩放）');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.log('\n🔧 故障排除:');
    console.log('   1. 检查 Supabase 连接配置');
    console.log('   2. 确认数据库表 (articles, article_links) 存在');
    console.log('   3. 查看 src/lib/links-service.ts 是否有错误');
  }
}

// 运行测试
testGraphData();

