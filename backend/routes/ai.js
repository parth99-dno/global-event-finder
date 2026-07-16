/**
 * routes/ai.js
 * Proxy forwarding to the FastAPI AI Service.
 */
import express from 'express';
import fetch from 'node-fetch';
import auth from '../middleware/auth.js';
import SearchHistory from '../models/SearchHistory.js';

const router = express.Router();
const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ── helpers ───────────────────────────────────────────────────────────────────
async function proxyPost(aiPath, req, res, overrideBody = null) {
  try {
    const body = overrideBody || req.body;
    const upstream = await fetch(`${AI_BASE}${aiPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ status: 'error', message: 'AI Service unreachable', detail: err.message });
  }
}

async function proxyGet(aiPath, res) {
  try {
    const upstream = await fetch(`${AI_BASE}${aiPath}`);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ status: 'error', message: 'AI Service unreachable', detail: err.message });
  }
}

// Background history logger
const logHistory = async (userId, query) => {
  if (!userId || !query || !query.trim()) return;
  try {
    await SearchHistory.create({ userId, query: query.trim() });
  } catch (e) {
    console.error("Failed to log search history:", e);
  }
};

// ── routes ────────────────────────────────────────────────────────────────────

// POST /api/search  { query, top_n }
// Added auth to track user search history
router.post('/search', auth, (req, res) => {
  logHistory(req.user.id, req.body.query);
  proxyPost('/search', req, res);
});

// POST /api/translate  { query, sourceLang }
router.post('/translate', auth, async (req, res) => {
  const { query, sourceLang } = req.body;
  if (!query) return res.status(400).json({ status: 'error', message: 'Query required' });
  
  // Always log the original query first
  logHistory(req.user.id, query);

  if (sourceLang === 'en' || !sourceLang) {
    // English is default, bypass translation, query AI search directly
    const top_n = req.body.top_n || 20;
    try {
      const upstream = await fetch(`${AI_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_n }),
      });
      const results = await upstream.json();
      return res.status(upstream.status).json({
        ...results,
        original_query: query,
        translated_query: query
      });
    } catch(err) {
      return res.status(502).json({ status: 'error', message: 'AI Service unreachable' });
    }
  }

  // Translation required
  try {
    const translateRes = await fetch(`${AI_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        sourceLang: sourceLang
      })
    });
    
    let translatedQuery = query;
    let translationFailed = false;

    if (!translateRes.ok) {
       translationFailed = true;
    } else {
       const translateData = await translateRes.json();
       if (!translateData.success) {
           translationFailed = true;
       } else {
           translatedQuery = translateData.translatedQuery;
       }
    }

    // Now search with whatever query we ended up with
    const top_n = req.body.top_n || 20;
    const upstream = await fetch(`${AI_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: translatedQuery, top_n }),
    });
    
    const results = await upstream.json();
    
    return res.status(upstream.status).json({
      ...results,
      original_query: query,
      translated_query: translatedQuery,
      ...(translationFailed && { translation_failed: true })
    });
  } catch (err) {
    // If anything throws, fallback to searching original query
    const top_n = req.body.top_n || 20;
    try {
      const upstream = await fetch(`${AI_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, top_n }),
      });
      const results = await upstream.json();
      return res.status(upstream.status).json({
        ...results,
        original_query: query,
        translated_query: query,
        translation_failed: true
      });
    } catch(fallbackErr) {
      return res.status(500).json({ status: 'error', message: 'Translation and fallback failed', detail: fallbackErr.message });
    }
  }
});

// POST /api/classify  { text }
router.post('/classify', (req, res) => proxyPost('/classify', req, res));

// GET /api/similar/:id?top_n=5
router.get('/similar/:id', (req, res) => {
  const top_n = req.query.top_n || 5;
  proxyGet(`/similar/${req.params.id}?top_n=${top_n}`, res);
});

// GET /api/trending?top_n=10
router.get('/trending', (req, res) => {
  const top_n = req.query.top_n || 10;
  proxyGet(`/trending?top_n=${top_n}`, res);
});

// GET /api/recommendations
// Uses auth to pull user ID, proxies to AI Service
router.get('/recommendations', auth, (req, res) => {
  const top_n = req.query.top_n || 6;
  proxyGet(`/recommendations/${req.user.id}?top_n=${top_n}`, res);
});

export default router;
