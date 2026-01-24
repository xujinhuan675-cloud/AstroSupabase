async function test() {
  const url = 'https://openeducation.top/api/search?q=城市';
  console.log('测试:', url);
  
  const response = await fetch(url, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  
  console.log('状态:', response.status);
  console.log('版本:', response.headers.get('x-search-version'));
  console.log('Cache-Control:', response.headers.get('cache-control'));
  
  const data = await response.json();
  console.log('结果数:', Array.isArray(data) ? data.length : 'N/A');
  console.log('数据:', JSON.stringify(data, null, 2));
}

test();
