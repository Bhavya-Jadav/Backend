// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');
dotenv.config();

// Middleware to protect routes (check if user is logged in)
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer Token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1]; // Split "Bearer <token>"
      console.log('🔑 Token received:', token.substring(0, 20) + '...');

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔓 Token decoded - User ID:', decoded.id);

      // Get user from the token (exclude password)
      // req.user will be available in the route handler
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        console.log('❌ User not found in database');
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      console.log('👤 User found:', {
        id: req.user._id,
        username: req.user.username,
        role: req.user.role
      });

      next(); // Proceed to the route handler
    } catch (error) {
      console.error("❌ Token verification error:", error.message);
      // Specific checks can be added for different jwt errors (expired, invalid signature etc.)
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    console.log('❌ No token provided');
    res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

// Middleware to check for admin role
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next(); // User is an admin, proceed
  } else {
    res.status(403).json({ message: 'Access denied. Not authorized as an admin.' }); // Forbidden
  }
};

// Middleware to check for student role
const student = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next(); // User is a student, proceed
  } else {
    res.status(403).json({ message: 'Access denied. Not authorized as a student.' }); // Forbidden
  }
};

// Middleware to check for company role
const company = (req, res, next) => {
  if (req.user && req.user.role === 'company') {
    next(); // User is a company, proceed
  } else {
    res.status(403).json({ message: 'Access denied. Not authorized as a company.' }); // Forbidden
  }
};

// Middleware to check for admin or company role
const adminOrCompany = (req, res, next) => {
  console.log('🔐 adminOrCompany middleware - Starting check');
  console.log('🔐 adminOrCompany middleware - User exists:', !!req.user);
  console.log('🔐 adminOrCompany middleware - User role:', req.user?.role);
  console.log('🔐 adminOrCompany middleware - User ID:', req.user?._id);
  console.log('🔐 adminOrCompany middleware - Full user:', req.user);
  
  if (req.user && (req.user.role === 'admin' || req.user.role === 'company')) {
    console.log('✅ Access granted - User has admin or company role');
    next(); // User is an admin or company, proceed
  } else {
    console.log('❌ Access denied - User role:', req.user?.role);
    console.log('❌ Access denied - Role check failed, user:', req.user);
    res.status(403).json({ message: 'Access denied. Not authorized as admin or company.' }); // Forbidden
  }
};

module.exports = { protect, admin, student, company, adminOrCompany };
