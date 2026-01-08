// Vercel serverless function wrapper for Express app
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('../backend/config/database');

// Import routes
const chatRoutes = require('../backend/routes/chat');
const notesRoutes = require('../backend/routes/notes');
const feedbackRoutes = require('../backend/routes/feedback');

const app = express();
app.set('trust proxy', 1);

// Connect to MongoDB (will reuse connection in serverless)
let dbConnected = false;
const connectDBOnce = async () => {
  if (!dbConnected) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (error) {
      console.error('Database connection error:', error);
    }
  }
};

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration - allow all origins in production (or set via env)
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API routes - frontend sends requests to /api/*, so match that
app.use('/api/chat', chatRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/feedback', feedbackRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Connect to DB if not already connected
  await connectDBOnce();
  
  // Handle the request
  return app(req, res);
};
