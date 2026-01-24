async function testLocal() {
  console.log('🔍 测试本地 API...\n');

  // 等待服务器完全启动
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试1: 搜索"城市"
  console.log('1️⃣ 测试本地搜索"城市":');
  try {
    const response = await fetch('http://localhost:4321/api/search?q=城市');
    const data = await response.json();
    console.log(`   状态: ${response.status}`);
    console.log(`   版本: ${response.headers.get('x-search-version')}`);
    console.log(`   结果数: ${Array.isArray(data) ? data.length : 'N/A'}`);
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('   ✅ 搜索成功！');
      console.log('   结果:');
      data.forEach((item: any) => {
        console.log(`     - [${item.id}] ${item.title}`);
      });
    } else if (data.error) {
      console.log(`   ❌ 错误: ${data.error}`);
      if (data.message) console.log(`      ${data.message}`);
      if (data.stack) console.log(`      ${data.stack}`);
    } else {
      console.log('   ⚠️ 返回空数组');
    }
  } catch (error) {
    console.error('   ❌ 请求失败:', error);
  }

  // 测试2: 搜索"经济"
  console.log('\n2️⃣ 测试本地搜索"经济":');
  try {
    const response = await fetch('http://localhost:4321/api/search?q=经济');
    const data = await response.json();
    console.log(`   结果数: ${Array.isArray(data) ? data.length : 'N/A'}`);
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('   ✅ 搜索成功！');
      data.slice(0, 3).forEach((item: any) => {
        console.log(`     - [${item.id}] ${item.title}`);
      });
    }
  } catch (error) {
    console.error('   ❌ 请求失败:', error);
  }

  // 测试3: debug-search
  console.log('\n3️⃣ 测试本地 debug-search:');
  try {
    const response = await fetch('http://localhost:4321/api/debug-search?q=城市');
    const data = await response.json();
    console.log(`   debug-search 结果数: ${data.searchResults?.count || 0}`);
  } catch (error) {
    console.error('   ❌ 请求失败:', error);
  }
}

testLocal();
