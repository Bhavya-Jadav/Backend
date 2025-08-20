// Simple script to create your user account in production database
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createUser = async () => {
  try {
    console.log('🔗 Connecting to production database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to production database');

    // YOUR CREDENTIALS - Replace these with your actual login details
    const username = 'jadav';          // Replace with your actual username
    const password = 'your_password';  // Replace with your actual password
    const email = 'jadav@example.com'; // Replace with your actual email
    const role = 'student';            // Change to 'company' if needed

    console.log(`🔍 Checking if user '${username}' exists...`);
    
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('✅ User already exists in production database');
      console.log('🎯 You can now login with your credentials on production');
      process.exit(0);
    }

    console.log('👤 Creating new user...');
    
    // Create user (password will be hashed automatically)
    const newUser = new User({
      username,
      password,
      email,
      role,
      authMethod: 'local'
    });

    await newUser.save();
    console.log('✅ User created successfully in production database!');
    console.log(`📧 Username: ${username}`);
    console.log(`🔑 Role: ${role}`);
    console.log('🎯 You can now login with your credentials on the production site');

  } catch (error) {
    console.error('❌ Error creating user:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
};

createUser();
