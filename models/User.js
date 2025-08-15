// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Ensure usernames are unique
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 3 // Enforce minimum password length
  },
  role: {
    type: String,
    required: true,
    enum: ['student', 'admin', 'company'], // Added company role
    default: 'student'
  },
  university: {
    type: String,
    required: function() { return this.role === 'student'; } // Required only for students
  },
  // Extended profile fields
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  bio: {
    type: String,
    maxlength: 500
  },
  phone: {
    type: String,
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  year: {
    type: String,
    trim: true
  },
  skills: [{
    type: String,
    trim: true
  }],
  profilePicture: {
    type: String, // URL to profile picture
    default: null
  },
  // Settings
  emailNotifications: {
    type: Boolean,
    default: true
  },
  profileVisibility: {
    type: Boolean,
    default: true
  },
  darkMode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash the password if it's new or has been modified
  if (!this.isModified('password')) return next();
  try {
    // Salt rounds determine how complex the hash will be (higher = more secure but slower)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
