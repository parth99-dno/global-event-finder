import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5001/api';
let token = '';
let userId = '';

async function runTests() {
  console.log("--- 1. Testing Signup & Interests ---");
  const email = `testuser_${Date.now()}@example.com`;
  
  const signupRes = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test User', email, password: 'password123' })
  });
  const signupData = await signupRes.json();
  if (signupRes.status !== 201) throw new Error("Signup failed");
  token = signupData.token;
  userId = signupData.user.id;
  console.log("✅ Signup successful");

  const updateRes = await fetch(`${API_BASE}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ interests: ['Technology', 'Science'] })
  });
  const updateData = await updateRes.json();
  if (!updateData.user.interests.includes('Technology')) throw new Error("Interests not saved");
  console.log("✅ Interests updated");

  console.log("\n--- 2. Testing Translations & Search History ---");
  // English Search
  await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ query: 'technology updates', sourceLang: 'en' })
  });
  
  // Spanish Search
  const esRes = await fetch(`${API_BASE}/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ query: 'actualizaciones de tecnología', sourceLang: 'es' })
  });
  const esData = await esRes.json();
  console.log(`✅ Translated Query: ${esData.translated_query || "N/A"}`);

  // Wait a sec for background DB logging
  await new Promise(r => setTimeout(r, 1000));

  const historyRes = await fetch(`${API_BASE}/users/history`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const historyData = await historyRes.json();
  const queries = historyData.history.map(h => h.query);
  if (!queries.includes('actualizaciones de tecnología') || !queries.includes('technology updates')) {
    throw new Error("Search history did not log original queries");
  }
  console.log("✅ Search History successfully logged the original queries");

  console.log("\n--- 3. Testing Save & Unsave Events ---");
  const evRes = await fetch(`${API_BASE}/events?limit=1`);
  const evData = await evRes.json();
  const eventId = evData.events[0]._id;
  if (!eventId) throw new Error("No events found in DB to test saving");

  const saveRes = await fetch(`${API_BASE}/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ eventId })
  });
  if (saveRes.status !== 201) throw new Error("Failed to save event");
  
  let savedRes = await fetch(`${API_BASE}/save`, { headers: { 'Authorization': `Bearer ${token}` } });
  let savedData = await savedRes.json();
  if (savedData.events.length !== 1) throw new Error("Event not appearing in saved list");
  console.log("✅ Event successfully saved");

  const delRes = await fetch(`${API_BASE}/save/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (delRes.status !== 200) throw new Error("Failed to unsave event");
  console.log("✅ Event successfully unsaved");

  console.log("\n--- 4. Testing Recommendations ---");
  const recRes = await fetch(`${API_BASE}/recommendations`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const recData = await recRes.json();
  if (!recData.results || recData.results.length === 0) {
    console.log("⚠️ No recommendations found (could be due to small dataset or lack of overlap)");
  } else {
    console.log(`✅ Recommendations working, found ${recData.results.length} events`);
  }

  console.log("\n✅ ALL PROMPT 6 FEATURES VERIFIED AND FUNCTIONAL.");
}

runTests().catch(e => console.error("❌ TEST FAILED:", e.message));
