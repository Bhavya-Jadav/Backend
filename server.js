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
const adminRoutes = require('./routes/adminRoutes');

// Debug: Log route imports
console.log('📁 Route imports:');
console.log('✅ userRoutes loaded:', typeof userRoutes);
console.log('✅ problemRoutes loaded:', typeof problemRoutes);
console.log('✅ ideaRoutes loaded:', typeof ideaRoutes);
console.log('✅ quizRoutes loaded:', typeof quizRoutes);
console.log('✅ fileRoutes loaded:', typeof fileRoutes);
console.log('✅ adminRoutes loaded:', typeof adminRoutes);

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
      'https://engineer-connect-app.vercel.app',
      'https://engineer-connect-app.vercel.app/',
      process.env.FRONTEND_URL,
      process.env.VERCEL_URL
    ].filter(Boolean);
    
    console.log('CORS check - Origin:', origin);
    console.log('CORS check - Allowed origins:', allowedOrigins);
    
    // Check exact match first, then partial match for vercel.app domains
    if (allowedOrigins.includes(origin) || (origin && origin.includes('vercel.app'))) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// Explicit headers to satisfy stricter proxies/CDNs
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies with increased limit
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Parse URL-encoded bodies
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // Increased to 10MB
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

// Debug: Log route registrations
console.log('🚀 Registering API routes...');

app.use('/api/users', userRoutes);
console.log('✅ Registered /api/users');

app.use('/api/problems', problemRoutes);
console.log('✅ Registered /api/problems');

app.use('/api/ideas', ideaRoutes);
console.log('✅ Registered /api/ideas');

app.use('/api/quiz', quizRoutes);
console.log('✅ Registered /api/quiz');

app.use('/api/files', fileRoutes);
console.log('✅ Registered /api/files');

app.use('/api/admin', adminRoutes);
console.log('✅ Registered /api/admin');

// Legacy routes without /api prefix for backward compatibility
app.use('/problems', problemRoutes);
app.use('/users', userRoutes);
app.use('/ideas', ideaRoutes);
app.use('/quiz', quizRoutes);
app.use('/files', fileRoutes);
app.use('/admin', adminRoutes); // Add admin routes without /api prefix
console.log('✅ Registered legacy routes without /api prefix');
app.get('/api/leaderboard', (req, res) => {
  res.redirect('/api/users/leaderboard');
});
app.get('/api/test-server', (req, res) => {
  res.json({ message: 'Server test endpoint works!', timestamp: new Date().toISOString() });
});


// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend server is running!', 
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/test',
      'GET /api/ideas',
      'POST /api/ideas',
      'GET /api/users',
      'GET /api/problems'
    ]
  });
});

// --- Listen on all interfaces for Railway ---
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`🌐 CORS enabled for: ${corsOptions.origin}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔧 VERCEL_URL: ${process.env.VERCEL_URL}`);
    console.log(`🔗 Test the server: http://localhost:${PORT}/api/test`);
    console.log(`🔗 Test ideas endpoint: http://localhost:${PORT}/api/ideas`);
  });
}

module.exports = app;
