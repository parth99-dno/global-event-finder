import express from 'express';
import { runPipeline, runStatus } from '../scheduler.js';

const router = express.Router();

// Middleware: You can add an auth middleware here if needed.
// For now, it will be open or you can reuse your existing JWT auth middleware by importing it.
// e.g., import { protect } from '../middleware/auth.js';
// router.use(protect); // if admin routes should be protected

router.post('/refresh-news', (req, res) => {
  if (runStatus.status === 'running') {
    return res.status(409).json({ status: 'running', message: 'A pipeline run is already in progress.' });
  }
  
  // Kick off background job without awaiting it
  runPipeline().catch(err => {
    console.error('Background pipeline error:', err);
  });
  
  res.json({ status: 'started', message: 'Pipeline refresh started in the background.' });
});

router.get('/refresh-status', (req, res) => {
  res.json(runStatus);
});

export default router;
