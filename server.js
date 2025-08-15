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
  origin: process.env.NODE_ENV === 'production' 
    ? function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.includes('vercel.app')) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      }
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
app.use('/api/users', userRoutes);
app.use('/api/problems', problemRoutes);
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
  });
}

module.exports = app;
