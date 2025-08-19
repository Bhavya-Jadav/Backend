// server.js (backend)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Import Route Files
const userRoutes = require('./routes/userRoutes');
const problemRoutes = require('./routes/problemRoutes');
const ideaRoutes = require('./routes/ideaRoutes');
const quizRoutes = require('./routes/quizRoutes');
const fileRoutes = require('./routes/fileRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://esume.vercel.app',
      'https://esume.vercel.app/',
      process.env.FRONTEND_URL,
      process.env.VERCEL_URL
    ].filter(Boolean);
    
    console.log('CORS check - Origin:', origin);
    console.log('CORS check - Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 },
  abortOnLimit: true,
  responseOnLimit: "File size limit has been reached"
}));

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI, {
  bufferCommands: false,
  maxPoolSize: 1,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// --- Define API Routes ---
app.get('/', (req, res) => {
  res.send('🚀 EngineerConnect Backend API is running...');
});

// Debug endpoint to check environment variables
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'Debug info',
    environment: process.env.NODE_ENV,
    vercelUrl: process.env.VERCEL_URL,
    frontendUrl: process.env.FRONTEND_URL,
    googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not set',
    jwtSecret: process.env.JWT_SECRET ? 'Set' : 'Not set',
    corsOrigins: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://esume.vercel.app',
      process.env.FRONTEND_URL,
      process.env.VERCEL_URL
    ].filter(Boolean)
  });
});

app.use('/api/users', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/problems', problemRoutes); // Recommended for frontend requests; /api/problems for API convention
app.use('/users', userRoutes);      // Supports /users/login, /users/register, etc.
app.use('/ideas', ideaRoutes);
app.use('/quiz', quizRoutes);
app.use('/files', fileRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/files', fileRoutes);
app.get('/api/leaderboard', (req, res) => {
  res.redirect('/api/users/leaderboard');
});
app.get('/api/test-server', (req, res) => {
  res.json({ message: 'Server test endpoint works!', timestamp: new Date().toISOString() });
});


// --- Listen on all interfaces for Railway ---
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`🌐 CORS enabled for: ${corsOptions.origin}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔧 VERCEL_URL: ${process.env.VERCEL_URL}`);
  });
}

module.exports = app;
