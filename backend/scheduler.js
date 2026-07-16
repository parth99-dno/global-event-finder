import cron from 'node-cron';
import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const VENV_PYTHON = '/Users/parthkaushik/Documents/GLOBAL EVENT CONNECTION FINDER/ai-service/venv/bin/python';
const AI_SERVICE_DIR = path.join(__dirname, '..', 'ai-service');
const LOG_DIR = path.join(__dirname, 'logs');
const LOG_FILE = path.join(LOG_DIR, 'pipeline-runs.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Global state for status endpoint
export const runStatus = {
  status: 'idle', // 'idle' | 'running' | 'error'
  lastRunStart: null,
  lastRunEnd: null,
  lastRunSuccess: false,
};

function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(logMessage.trim());
  fs.appendFileSync(LOG_FILE, logMessage);
}

function runCommand(script, cwd) {
  return new Promise((resolve, reject) => {
    writeLog(`Starting script: ${script}`);
    
    const child = execFile(VENV_PYTHON, [script], { cwd, maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer just in case
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data;
      fs.appendFileSync(LOG_FILE, data);
    });
    
    child.stderr.on('data', (data) => {
      stderr += data;
      fs.appendFileSync(LOG_FILE, data);
    });
    
    child.on('close', (code) => {
      if (code !== 0) {
        writeLog(`Script ${script} failed with exit code ${code}`);
        reject(new Error(`Script failed with code ${code}`));
      } else {
        writeLog(`Script ${script} completed successfully.`);
        resolve({ stdout, stderr });
      }
    });
    
    child.on('error', (err) => {
      writeLog(`Failed to start script ${script}: ${err.message}`);
      reject(err);
    });
  });
}

export async function runPipeline() {
  if (runStatus.status === 'running') {
    writeLog('Pipeline is already running, skipping new execution.');
    return;
  }
  
  runStatus.status = 'running';
  runStatus.lastRunStart = new Date().toISOString();
  writeLog('=== STARTING DAILY PIPELINE ===');
  
  try {
    // Step 1: Fetch and insert new events
    await runCommand('pipeline.py', AI_SERVICE_DIR);
    
    // Step 2: Reclassify uncategorized events
    await runCommand('scripts/reclassify_uncategorized.py', AI_SERVICE_DIR);
    
    // Step 3: Hit the reindex endpoint to update the AI cache
    writeLog('Hitting POST /reindex to update AI service cache...');
    try {
      const response = await fetch('http://localhost:8000/reindex', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      writeLog(`Reindex success: ${JSON.stringify(data)}`);
    } catch (err) {
      writeLog(`Reindex network call failed: ${err.message}`);
      // Don't throw here, we don't want to mark the whole pipeline as failed if just the reindex failed
      // (although it means cache is stale until manually fixed or next restart).
      // The user requested to log it and continue gracefully.
    }
    
    runStatus.status = 'idle';
    runStatus.lastRunEnd = new Date().toISOString();
    runStatus.lastRunSuccess = true;
    writeLog('=== PIPELINE COMPLETED SUCCESSFULLY ===\n');
    
  } catch (error) {
    writeLog(`=== PIPELINE FAILED: ${error.message} ===\n`);
    runStatus.status = 'error';
    runStatus.lastRunEnd = new Date().toISOString();
    runStatus.lastRunSuccess = false;
  }
}

// Schedule daily at midnight
const job = cron.schedule('0 0 * * *', () => {
  writeLog('Cron triggered runPipeline()');
  runPipeline();
});

export function initScheduler() {
  job.start();
  writeLog('Scheduler initialized: Cron job started for 0 0 * * *');
}
