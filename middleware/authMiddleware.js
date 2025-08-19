// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) return res.status(401).json({ message: 'Not authorized, user not found' });
      return next();
    } catch (e) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  return res.status(401).json({ message: 'Not authorized, no token provided' });
};

const admin = (req, res, next) => req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Access denied. Not authorized as an admin.' });
const student = (req, res, next) => req.user?.role === 'student' ? next() : res.status(403).json({ message: 'Access denied. Not authorized as a student.' });
const company = (req, res, next) => req.user?.role === 'company' ? next() : res.status(403).json({ message: 'Access denied. Not authorized as a company.' });
const adminOrCompany = (req, res, next) => (req.user && (req.user.role === 'admin' || req.user.role === 'company')) ? next() : res.status(403).json({ message: 'Access denied. Not authorized as admin or company.' });

module.exports = { protect, admin, student, company, adminOrCompany };

