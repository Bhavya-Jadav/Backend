// Script to migrate a user from local to production database
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const migrateUser = async () => {
  try {
    // Connect to production MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to production database');

    // Create your user account manually
    // Replace these with your actual credentials
    const userData = {
      username: 'your_username_here', // Replace with your username
      password: 'your_password_here', // Replace with your password
      email: 'your_email_here',       // Replace with your email
      role: 'student',                // or 'company' if you're a company user
      authMethod: 'local'
    };

    // Check if user already exists
    const existingUser = await User.findOne({ username: userData.username });
    if (existingUser) {
      console.log('❌ User already exists in production database');
      process.exit(1);
    }

    // Create new user (password will be hashed automatically by User model)
    const newUser = new User(userData);
    await newUser.save();

    console.log('✅ User migrated successfully to production database');
    console.log('📧 Username:', userData.username);
    console.log('🔑 You can now login with your old credentials on production');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    mongoose.disconnect();
  }
};

migrateUser();
