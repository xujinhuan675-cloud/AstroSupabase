async function testDeployment() {
  console.log('🔍 测试部署状态...\n');

  // 测试1: 检查版本
  console.log('1️⃣ 测试版本端点:');
  try {
    const response1 = await fetch('https://openeducation.top/api/search?q=test123', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    const data1 = await response1.json();
    console.log(`   状态: ${response1.status}`);
    console.log(`   版本: ${response1.headers.get('x-search-version')}`);
    console.log(`   数据:`, JSON.stringify(data1));
    
    if (data1.test === 'deployment-working') {
      console.log('   ✅ 新版本已部署！\n');
    } else {
      console.log('   ⚠️ 还是旧版本或缓存问题\n');
    }
  } catch (error) {
    console.error('   ❌ 请求失败:', error);
    return;
  }

  // 测试2: 搜索"城市"
  console.log('2️⃣ 测试搜索"城市":');
  try {
    const response2 = await fetch('https://openeducation.top/api/search?q=城市', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    const data2 = await response2.json();
    console.log(`   状态: ${response2.status}`);
    console.log(`   版本: ${response2.headers.get('x-search-version')}`);
    console.log(`   结果数: ${Array.isArray(data2) ? data2.length : 'N/A'}`);
    
    if (Array.isArray(data2) && data2.length > 0) {
      console.log('   ✅ 搜索成功！');
      console.log('   结果:');
      data2.forEach((item: any) => {
        console.log(`     - [${item.id}] ${item.title}`);
      });
    } else if (data2.error) {
      console.log(`   ❌ 错误: ${data2.error}`);
      if (data2.message) console.log(`      ${data2.message}`);
    } else {
      console.log('   ⚠️ 返回空数组');
    }
  } catch (error) {
    console.error('   ❌ 请求失败:', error);
  }

  // 测试3: 搜索"经济"
  console.log('\n3️⃣ 测试搜索"经济":');
  try {
    const response3 = await fetch('https://openeducation.top/api/search?q=经济', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    const data3 = await response3.json();
    console.log(`   结果数: ${Array.isArray(data3) ? data3.length : 'N/A'}`);
    
    if (Array.isArray(data3) && data3.length > 0) {
      console.log('   ✅ 搜索成功！');
      data3.slice(0, 3).forEach((item: any) => {
        console.log(`     - [${item.id}] ${item.title}`);
      });
    }
  } catch (error) {
    console.error('   ❌ 请求失败:', error);
  }

  // 测试4: 对比 debug-search
  console.log('\n4️⃣ 对比 debug-search 端点:');
  try {
    const response4 = await fetch('https://openeducation.top/api/debug-search?q=城市', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    const data4 = await response4.json();
    console.log(`   debug-search 结果数: ${data4.searchResults?.count || 0}`);
    console.log(`   数据库已发布文章: ${data4.database?.publishedArticles || 0}`);
  } catch (error) {
    console.error('   ❌ 请求失败:', error);
  }
}

testDeployment();
