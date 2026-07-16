const http = require('http');

async function testApi() {
  console.log("Starting Verification...");
  
  const req = async (url, options = {}) => {
    try {
      const fetch = (await import('node-fetch')).default;
      const res = await fetch(`http://localhost:5001/api${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
      const data = await res.json();
      console.log(`[${options.method || 'GET'}] ${url} -> Status: ${res.status}`);
      return { status: res.status, data };
    } catch (e) {
      console.log(`[ERROR] ${url} -> ${e.message}`);
      return { status: 500, error: e };
    }
  };

  // 1. Dashboard Events
  await req('/events?limit=6');
  
  // 2. Dashboard Trending (Proxy to AI)
  await req('/trending?top_n=6');
  
  // 3. Search (Proxy to AI)
  const searchRes = await req('/search', { 
    method: 'POST', 
    body: JSON.stringify({ query: 'Iran nuclear talks', top_n: 3 }) 
  });
  
  // 4. Similar Events (Proxy to AI)
  if (searchRes.data && searchRes.data.results && searchRes.data.results.length > 0) {
    const eventId = searchRes.data.results[0]._id;
    await req(`/similar/${eventId}?top_n=3`);
  } else {
    console.log("Skipping /similar test due to no search results.");
  }

  console.log("Verification Complete!");
}

testApi();
