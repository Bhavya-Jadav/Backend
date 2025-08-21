// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: function() { return !this.googleId; }, // Required only if not Google user
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: function() { return !this.googleId; }, // Required only if not Google user
    minlength: 3
  },
  // Google OAuth fields
  googleId: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  googleEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  googleName: {
    type: String,
    trim: true
  },
  googlePicture: {
    type: String
  },
  // Authentication method
  authMethod: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  role: {
    type: String,
    required: true,
    enum: ['student', 'admin', 'company'],
    default: 'student'
  },
  university: {
    type: String,
    required: function() { 
      return this.role === 'student' && this.authMethod !== 'google'; 
    }
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
    type: mongoose.Schema.Types.Mixed, // Allow both strings and objects
    trim: true
  }],
  profilePicture: {
    type: String,
    default: null
  },
  // Company field
  companyName: {
    type: String,
    trim: true
  },
  // Extended resume fields
  education: [{
    id: Number,
    degree: String,
    institute: String,
    startDate: String,
    endDate: String,
    description: String
  }],
  courses: [{
    id: Number,
    name: String,
    provider: String,
    completionDate: String,
    certificateLink: String
  }],
  languages: [{
    id: Number,
    name: String,
    proficiency: String
  }],
  achievements: [{
    id: Number,
    title: String,
    description: String,
    date: String
  }],
  projects: [{
    id: Number,
    title: String,
    description: String,
    technologies: String,
    link: String
  }],
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
  timestamps: true
});

// Hash password before saving (only for local authentication)
userSchema.pre('save', async function (next) {
  // Only hash the password if it's new or has been modified and not a Google user
  if (!this.isModified('password') || this.authMethod === 'google') return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (this.authMethod === 'google') return false; // Google users can't use password login
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateToken = function() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  return jwt.sign(
    { 
      id: this._id, 
      username: this.username, 
      email: this.email, 
      role: this.role,
      authMethod: this.authMethod 
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

module.exports = mongoose.model('User', userSchema);
