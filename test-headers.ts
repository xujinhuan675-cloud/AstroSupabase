async function testHeaders() {
  console.log('🔍 检查响应头...\n');

  try {
    const response = await fetch('https://openeducation.top/api/search?q=城市', {
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    console.log('状态:', response.status);
    console.log('响应头:');
    console.log('  X-Search-Version:', response.headers.get('x-search-version'));
    console.log('  X-Total-Published:', response.headers.get('x-total-published'));
    console.log('  X-Results-Count:', response.headers.get('x-results-count'));
    console.log('  Cache-Control:', response.headers.get('cache-control'));
    
    const data = await response.json();
    console.log('\n数据:', JSON.stringify(data, null, 2));
    
    if (data.error) {
      console.log('\n❌ 错误信息:');
      console.log('  message:', data.message);
      if (data.stack) console.log('  stack:', data.stack);
    }
  } catch (error) {
    console.error('❌ 请求失败:', error);
  }
}

testHeaders();
