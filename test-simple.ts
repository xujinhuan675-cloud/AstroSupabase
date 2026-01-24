async function test() {
  console.log('测试线上搜索 API...\n');
  
  const url = 'https://openeducation.top/api/search?q=城市';
  console.log('URL:', url);
  
  const response = await fetch(url, {
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
  });
  
  console.log('状态:', response.status);
  
  const data = await response.json();
  console.log('结果:', JSON.stringify(data, null, 2));
  
  if (Array.isArray(data)) {
    console.log('结果数:', data.length);
  } else if (data.error) {
    console.log('错误:', data.error);
  }
}

test();
