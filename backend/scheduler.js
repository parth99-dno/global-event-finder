import cron from 'node-cron';

// ── Config ────────────────────────────────────────────────────────────────────
const AI_BASE = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Global status object — mirrors what /pipeline-status returns from the AI service.
// Used by GET /api/admin/refresh-status so the frontend can poll it.
export const runStatus = {
  status: 'idle',         // 'idle' | 'running' | 'error'
  lastRunStart: null,
  lastRunEnd: null,
  lastRunSuccess: false,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Trigger the pipeline on the AI service (fire-and-forget POST).
 * The AI service runs everything in a FastAPI BackgroundTask and returns
 * immediately, so we never block past Render's 30-second timeout.
 */
async function triggerAIPipeline() {
  const res = await fetch(`${AI_BASE}/run-pipeline`, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI service /run-pipeline returned HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Poll the AI service's /pipeline-status endpoint until it transitions out
 * of 'running' (i.e. to 'idle' or 'error'). Updates the local runStatus
 * object so the frontend's polling of /api/admin/refresh-status stays in sync.
 */
async function pollUntilDone(intervalMs = 15000, maxWaitMs = 30 * 60 * 1000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`${AI_BASE}/pipeline-status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // Mirror remote status locally
        runStatus.lastRunStart = data.lastRunStart ?? runStatus.lastRunStart;
        runStatus.lastRunEnd   = data.lastRunEnd   ?? runStatus.lastRunEnd;
        runStatus.lastRunSuccess = data.lastRunSuccess ?? false;

        if (data.status === 'idle') {
          runStatus.status = 'idle';
          console.log('[scheduler] Pipeline completed successfully.');
          resolve(data);
        } else if (data.status === 'error') {
          runStatus.status = 'error';
          console.error(`[scheduler] Pipeline reported error: ${data.detail}`);
          reject(new Error(data.detail || 'Pipeline error'));
        } else if (Date.now() - start > maxWaitMs) {
          runStatus.status = 'error';
          reject(new Error('Pipeline polling timed out after 30 minutes.'));
        } else {
          // Still running — check again after intervalMs
          setTimeout(tick, intervalMs);
        }
      } catch (err) {
        // Network error while polling — retry rather than fail immediately
        console.warn(`[scheduler] Poll error (retrying): ${err.message}`);
        if (Date.now() - start > maxWaitMs) {
          runStatus.status = 'error';
          reject(err);
        } else {
          setTimeout(tick, intervalMs);
        }
      }
    };
    tick();
  });
}

// ── Main exported function ────────────────────────────────────────────────────

export async function runPipeline() {
  if (runStatus.status === 'running') {
    console.log('[scheduler] Pipeline already running, skipping.');
    return;
  }

  runStatus.status = 'running';
  runStatus.lastRunStart = new Date().toISOString();
  console.log('[scheduler] === TRIGGERING PIPELINE ON AI SERVICE ===');

  try {
    const startResult = await triggerAIPipeline();
    console.log(`[scheduler] AI service acknowledged: ${JSON.stringify(startResult)}`);

    // Poll in the background — don't block the HTTP response
    pollUntilDone().catch(err => {
      console.error(`[scheduler] Pipeline polling ended with error: ${err.message}`);
      runStatus.status = 'error';
      runStatus.lastRunEnd = new Date().toISOString();
      runStatus.lastRunSuccess = false;
    });

  } catch (err) {
    console.error(`[scheduler] Failed to trigger AI pipeline: ${err.message}`);
    runStatus.status = 'error';
    runStatus.lastRunEnd = new Date().toISOString();
    runStatus.lastRunSuccess = false;
    throw err;
  }
}

// ── Daily cron ────────────────────────────────────────────────────────────────

const job = cron.schedule('0 0 * * *', () => {
  console.log('[scheduler] Cron triggered runPipeline()');
  runPipeline().catch(err => console.error('[scheduler] Cron pipeline error:', err.message));
});

export function initScheduler() {
  job.start();
  console.log('[scheduler] Initialized: cron job running at 0 0 * * *');
}
