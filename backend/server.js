import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from './db.js';
import authRouter from './routes/auth.js';
import eventsRouter from './routes/events.js';
import aiRouter from './routes/ai.js';
import savedRouter from './routes/saved.js';
import usersRouter from './routes/users.js';
import adminRouter from './routes/admin.js';
import { initScheduler } from './scheduler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Connect to MongoDB Atlas
connectDB();

// Initialize the daily background scheduler
initScheduler();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/events', eventsRouter);
app.use('/api/save', savedRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);
app.use('/api', aiRouter); // Proxies /api/search, /api/similar, /api/trending, /api/classify, /api/translate, /api/recommendations → AI Service

// Hello World Route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Hello World from the Backend API!',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', async (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbStatus = dbStates[mongoose.connection.readyState] || 'unknown';

  let aiStatus = 'disconnected';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const aiRes = await fetch(`${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    if (aiRes.ok) aiStatus = 'connected';
  } catch {
    aiStatus = 'disconnected';
  }

  res.json({
    status: 'UP',
    services: {
      backend: 'healthy',
      database: dbStatus,
      aiService: aiStatus
    }
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});


