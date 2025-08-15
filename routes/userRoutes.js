// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
const dotenv = require('dotenv');
dotenv.config();

// @desc    Register a new user (Student or Admin signup)
// @route   POST /api/users/register
// @access  Public
router.post('/register', async (req, res) => {
  const { username, password, role, university } = req.body;

  try {
    console.log('📝 REGISTER DEBUG - Registration attempt:', {
      username,
      role,
      university,
      hasPassword: !!password
    });

    // 1. Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      console.log('❌ REGISTER DEBUG - User already exists:', username);
      return res.status(400).json({ message: 'User already exists' });
    }

    // 2. Basic validation (add more as needed)
    if (!username || !password) {
       return res.status(400).json({ message: 'Username and password are required' });
    }
    
    if (role === 'student' && !university) {
       return res.status(400).json({ message: 'University is required for students' });
    }
    
    // For company users, we don't require additional fields beyond username and password

    // 3. Create user (password hashing happens in the User model pre-save hook)
    const user = new User({
      username,
      password, // Plain text, will be hashed by User model
      role: role || 'student', // Default to student if not provided
      university: role === 'student' ? university : undefined // Only store for students
    });

    const createdUser = await user.save();

    if (createdUser) {
      console.log('✅ REGISTER DEBUG - User created successfully:', {
        id: createdUser._id,
        username: createdUser.username,
        role: createdUser.role
      });
      
      // 4. Generate JWT token upon successful creation
      const token = jwt.sign({ id: createdUser._id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      res.status(201).json({
        _id: createdUser._id,
        username: createdUser.username,
        role: createdUser.role,
        university: createdUser.university,
        token: token,
        message: 'User registered successfully'
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error("User registration error:", error);
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server Error during registration' });
  }
});

// @desc    Authenticate user & get token (Login)
// @route   POST /api/users/login
// @access  Public
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log('🔐 LOGIN DEBUG - Attempting login for username:', username);
    
    // 1. Find user by username
    const user = await User.findOne({ username });
    console.log('🔐 LOGIN DEBUG - User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('🔐 LOGIN DEBUG - User details:', {
        id: user._id,
        username: user.username,
        role: user.role,
        hasPassword: !!user.password
      });
    }

    // 2. Check if user exists and password matches
    if (user && (await user.matchPassword(password))) { // Use method from User model
      console.log('🔐 LOGIN DEBUG - Password match: SUCCESS');
      // 3. Generate JWT token
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
      });

      // 4. Send successful response with complete user data and token
      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        university: user.university,
        course: user.course,
        year: user.year,
        skills: user.skills,
        profilePicture: user.profilePicture,
        role: user.role,
        token: token,
        message: 'Login successful'
      });
    } else {
      console.log('🔐 LOGIN DEBUG - Login FAILED - Invalid credentials');
      // 5. Invalid credentials
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('🔐 LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server Error during login' });
  }
});

// @desc    Get leaderboard (top users by submission count)
// @route   GET /api/users/leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    // For now, return a simple leaderboard based on user count
    // In a real app, this would be based on submissions, points, etc.
    const users = await User.find({ role: 'student' })
                           .select('username university createdAt')
                           .sort({ createdAt: -1 })
                           .limit(10);
    
    // Create simple leaderboard data
    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      username: user.username,
      university: user.university,
      points: Math.floor(Math.random() * 1000) + 100, // Placeholder points
      submissions: Math.floor(Math.random() * 20) + 1 // Placeholder submissions
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: 'Server Error fetching leaderboard' });
  }
});

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    console.log('👤 PROFILE DEBUG - Current user role:', req.user.role);
    console.log('👤 PROFILE DEBUG - Current user info:', {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    });

    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.bio,
      university: user.university,
      course: user.course,
      year: user.year,
      skills: user.skills,
      profilePicture: user.profilePicture,
      role: user.role
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: 'Server Error fetching profile' });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const { name, email, bio, phone, university, course, year, skills, profilePicture } = req.body;

    console.log('📝 Profile update request:', {
      userId,
      course,
      skills,
      skillsLength: skills?.length || 0
    });

    // Find user and update
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (bio) user.bio = bio;
    if (phone) user.phone = phone;
    if (university) user.university = university;
    if (course) user.course = course;
    if (year) user.year = year;
    if (skills) user.skills = skills;
    
    // Handle profile picture update
    if (profilePicture) {
      // Ensure it's in the correct base64 format
      if (profilePicture.startsWith('data:image')) {
        user.profilePicture = profilePicture;
      } else {
        // If it's raw base64, add the data URL prefix
        user.profilePicture = `data:image/jpeg;base64,${profilePicture}`;
      }
    }

    const updatedUser = await user.save();

    console.log('✅ Profile updated successfully:', {
      userId: updatedUser._id,
      name: updatedUser.name,
      course: updatedUser.course,
      skills: updatedUser.skills,
      skillsLength: updatedUser.skills?.length || 0
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        bio: updatedUser.bio,
        phone: updatedUser.phone,
        university: updatedUser.university,
        course: updatedUser.course,
        year: updatedUser.year,
        skills: updatedUser.skills,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 PASSWORD CHANGE DEBUG - Starting password change for user:', userId);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('🔐 PASSWORD CHANGE DEBUG - User found:', user.username);

    // Check current password using the same method as login
    const isCurrentPasswordValid = await user.matchPassword(currentPassword);
    console.log('🔐 PASSWORD CHANGE DEBUG - Current password valid:', isCurrentPasswordValid);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    console.log('🔐 PASSWORD CHANGE DEBUG - Hashing new password with bcrypt');
    
    // Hash the new password manually (same method as User model)
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    
    console.log('🔐 PASSWORD CHANGE DEBUG - Updating password directly in database');
    
    // Update password directly in database
    const updateResult = await User.updateOne(
      { _id: userId },
      { $set: { password: hashedNewPassword } }
    );

    console.log('🔐 PASSWORD CHANGE DEBUG - Update result:', updateResult);

    // Verify the password was updated correctly
    const updatedUser = await User.findById(userId);
    const verifyNewPassword = await updatedUser.matchPassword(newPassword);
    console.log('🔐 PASSWORD CHANGE DEBUG - New password verification:', verifyNewPassword);

    if (verifyNewPassword) {
      console.log('🔐 PASSWORD CHANGE DEBUG - Password change successful');
      res.json({ message: 'Password changed successfully' });
    } else {
      console.log('🔐 PASSWORD CHANGE DEBUG - Password change failed verification');
      res.status(500).json({ message: 'Password change failed - please try again' });
    }
    
  } catch (error) {
    console.error('🔐 PASSWORD CHANGE ERROR:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

// TEST ENDPOINT - to verify server is using updated code
router.get('/test-update', (req, res) => {
  res.json({ message: 'Server is using updated code!', timestamp: new Date().toISOString() });
});

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
router.post('/profile-picture', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.files || !req.files.profilePicture) {
      return res.status(400).json({ message: 'No profile picture file uploaded' });
    }

    const file = req.files.profilePicture;
    
    // Basic file validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Please upload a valid image.' });
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return res.status(400).json({ message: 'File size too large. Please upload an image under 5MB.' });
    }

    // Convert file buffer to base64
    const base64Image = `data:${file.mimetype};base64,${file.data.toString('base64')}`;

    // Update user with profile picture base64 data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePicture = base64Image;
    const updatedUser = await user.save();

    res.json({
      message: 'Profile picture uploaded successfully',
      profilePicture: base64Image,
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        bio: updatedUser.bio,
        phone: updatedUser.phone,
        university: updatedUser.university,
        course: updatedUser.course,
        year: updatedUser.year,
        skills: updatedUser.skills,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture
      }
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ message: 'Server error uploading profile picture' });
  }
});

// @desc    Delete user account
// @route   DELETE /api/users/delete-account
// @access  Private
router.delete('/delete-account', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find and delete user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ message: 'Server error deleting account' });
  }
});

module.exports = router;