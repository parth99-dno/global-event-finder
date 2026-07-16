import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5001/api';
let token = '';

async function runTests() {
  console.log("--- 1. Generating Auth Token ---");
  const email = `testuser_${Date.now()}@example.com`;
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email, password: 'password123' })
  });
  const signupData = await signupRes.json();
  if (signupRes.status !== 201) throw new Error("Signup failed");
  token = signupData.token;

  console.log("\n--- 2. Testing Offline Argos Translations ---");
  
  // Hindi Search
  console.log("Testing Hindi: 'जलवायु शिखर सम्मेलन' (climate summit)");
  const hiRes = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ query: 'जलवायु शिखर सम्मेलन', sourceLang: 'hi' })
  });
  const hiData = await hiRes.json();
  console.log(`Translated Query (hi->en): ${hiData.translated_query}`);
  if (hiData.translation_failed) console.warn("WARNING: Translation failed flag is true!");

  // Spanish Search
  console.log("\nTesting Spanish: 'energía renovable' (renewable energy)");
  const esRes = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ query: 'energía renovable', sourceLang: 'es' })
  });
  const esData = await esRes.json();
  console.log(`Translated Query (es->en): ${esData.translated_query}`);
  if (esData.translation_failed) console.warn("WARNING: Translation failed flag is true!");
  
  // Fallback test
  console.log("\nTesting Fallback: 'somemysterylanguage' (fake lang 'xx')");
  const xxRes = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ query: 'somemysterylanguage', sourceLang: 'xx' })
  });
  const xxData = await xxRes.json();
  console.log(`Translated Query (xx->en): ${xxData.translated_query}`);
  if (xxData.translation_failed) console.log("SUCCESS: Translation failed flag is true as expected!");

  console.log("\n✅ Argos Translate Offline Tests Completed.");
}

runTests().catch(e => console.error("❌ TEST FAILED:", e.message));
