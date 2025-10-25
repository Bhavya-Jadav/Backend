// server/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
const dotenv = require('dotenv');
dotenv.config();

// @desc    Google OAuth callback
// @route   POST /api/users/google-auth
// @access  Public
router.post('/google-auth', async (req, res) => {
  try {
    console.log('🔍 Google auth request received:', req.body);
    const { googleId, email, name, picture } = req.body;

    if (!googleId || !email) {
      console.log('❌ Missing required fields:', { googleId: !!googleId, email: !!email });
      return res.status(400).json({ message: 'Google ID and email are required' });
    }

    console.log('🔍 Checking for existing user with Google ID:', googleId);
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId });

    if (!user) {
      console.log('🔍 No user found with Google ID, checking email:', email);
      // Check if user exists with this email (for linking accounts)
      user = await User.findOne({ email });
      
      if (user) {
        console.log('🔍 Linking existing account with Google');
        // Link existing account with Google
        user.googleId = googleId;
        user.googleEmail = email;
        user.googleName = name;
        user.googlePicture = picture;
        user.authMethod = 'google';
        user.profilePicture = picture; // Use Google profile picture
        await user.save();
        console.log('✅ Account linked successfully');
      } else {
        console.log('🔍 Creating new user with Google data');
        // Create new user with Google data
        user = new User({
          googleId,
          googleEmail: email,
          googleName: name,
          googlePicture: picture,
          email,
          name,
          profilePicture: picture,
          authMethod: 'google',
          role: 'student', // Default role for Google users
          username: `google_${googleId.slice(-8)}` // Generate unique username
        });
        await user.save();
        console.log('✅ New user created successfully');
      }
    } else {
      console.log('✅ Existing Google user found');
    }

    console.log('🔍 Generating JWT token');
    // Generate JWT token
    const token = user.generateToken();
    console.log('✅ JWT token generated successfully');

    const response = {
      _id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      university: user.university,
      course: user.course,
      year: user.year,
      branch: user.branch,
      companyName: user.companyName,
      profilePicture: user.profilePicture,
      phone: user.phone,
      bio: user.bio,
      skills: user.skills || [],
      authMethod: user.authMethod,
      // Extended resume fields
      education: user.education || [],
      courses: user.courses || [],
      languages: user.languages || [],
      achievements: user.achievements || [],
      projects: user.projects || [],
      token: token,
      message: 'Google authentication successful'
    };

    console.log('✅ Google auth successful, sending response');
    res.json(response);

  } catch (error) {
    console.error('❌ Google auth error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: 'Server Error during Google authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

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
      university: role === 'student' ? university : undefined, // Only store for students
      authMethod: 'local'
    });

    const createdUser = await user.save();

    if (createdUser) {
      console.log('✅ REGISTER DEBUG - User created successfully:', {
        id: createdUser._id,
        username: createdUser.username,
        role: createdUser.role
      });
      
      // 4. Generate JWT token upon successful creation
      const token = createdUser.generateToken();

      res.status(201).json({
        _id: createdUser._id,
        username: createdUser.username,
        role: createdUser.role,
        university: createdUser.university,
        authMethod: createdUser.authMethod,
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
        hasPassword: !!user.password,
        authMethod: user.authMethod
      });
    }

    // 2. Check if user exists and password matches
    if (user && (await user.matchPassword(password))) { // Use method from User model
      console.log('🔐 LOGIN DEBUG - Password match: SUCCESS');
      // 3. Generate JWT token
      const token = user.generateToken();

      // 4. Send successful response with complete user data and token (including all extended fields)
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
        branch: user.branch,
        skills: user.skills || [],
        profilePicture: user.profilePicture,
        role: user.role,
        companyName: user.companyName,
        authMethod: user.authMethod,
        // Extended resume fields
        education: user.education || [],
        courses: user.courses || [],
        languages: user.languages || [],
        achievements: user.achievements || [],
        projects: user.projects || [],
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
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { 
      name, email, bio, phone, university, course, year, skills, role, companyName,
      education, courses, languages, achievements, projects, branch
    } = req.body;
    
    console.log('📝 PROFILE UPDATE - Received data:', {
      hasEducation: !!education,
      hasCourses: !!courses,
      hasLanguages: !!languages,
      hasAchievements: !!achievements,
      hasProjects: !!projects,
      educationCount: education?.length,
      coursesCount: courses?.length,
      languagesCount: languages?.length,
      achievementsCount: achievements?.length,
      projectsCount: projects?.length
    });
    
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone;
    if (university !== undefined) user.university = university;
    if (course !== undefined) user.course = course;
    if (year !== undefined) user.year = year;
    if (branch !== undefined) user.branch = branch;
    if (skills !== undefined) user.skills = skills;
    if (companyName !== undefined) user.companyName = companyName;
    
    // Update extended resume fields
    if (education !== undefined) {
      user.education = education;
      console.log('✅ Updated education:', education.length, 'entries');
    }
    if (courses !== undefined) {
      user.courses = courses;
      console.log('✅ Updated courses:', courses.length, 'entries');
    }
    if (languages !== undefined) {
      user.languages = languages;
      console.log('✅ Updated languages:', languages.length, 'entries');
    }
    if (achievements !== undefined) {
      user.achievements = achievements;
      console.log('✅ Updated achievements:', achievements.length, 'entries');
    }
    if (projects !== undefined) {
      user.projects = projects;
      console.log('✅ Updated projects:', projects.length, 'entries');
    }
    
    // Allow role to be set only once, and only student/company
    if (!user.role && (role === 'student' || role === 'company')) {
      user.role = role;
    }

    const updatedUser = await user.save();
    
    console.log('✅ PROFILE UPDATE - Profile saved to database successfully');

    // Return complete user data with all extended fields
    res.json({
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        university: updatedUser.university,
        course: updatedUser.course,
        year: updatedUser.year,
        branch: updatedUser.branch,
        skills: updatedUser.skills || [],
        profilePicture: updatedUser.profilePicture,
        role: updatedUser.role,
        companyName: updatedUser.companyName,
        authMethod: updatedUser.authMethod,
        // Extended resume fields
        education: updatedUser.education || [],
        courses: updatedUser.courses || [],
        languages: updatedUser.languages || [],
        achievements: updatedUser.achievements || [],
        projects: updatedUser.projects || []
      },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server Error during profile update' });
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

    // Return complete user profile with all extended fields
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
      branch: user.branch,
      skills: user.skills || [],
      profilePicture: user.profilePicture,
      role: user.role,
      companyName: user.companyName,
      authMethod: user.authMethod,
      // Extended resume fields
      education: user.education || [],
      courses: user.courses || [],
      languages: user.languages || [],
      achievements: user.achievements || [],
      projects: user.projects || [],
      // Settings
      emailNotifications: user.emailNotifications,
      profileVisibility: user.profileVisibility,
      darkMode: user.darkMode,
      // Timestamps
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: 'Server Error fetching profile' });
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

// @desc    Search users by various criteria
// @route   GET /api/users/search
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { query, role, limit = 20, page = 1 } = req.query;
    
    console.log('🔍 User search request:', { query, role, limit, page });
    
    // Build search criteria
    let searchCriteria = {};
    
    // Role filter (if specified)
    if (role && role !== 'all') {
      searchCriteria.role = role;
    }
    
    // Text search across multiple fields
    if (query && query.trim()) {
      const searchRegex = new RegExp(query.trim(), 'i');
      
      searchCriteria.$or = [
        { username: searchRegex },
        { name: searchRegex },
        { email: searchRegex },
        { university: searchRegex },
        { course: searchRegex },
        { branch: searchRegex },
        { companyName: searchRegex },
        { bio: searchRegex },
        { 'skills': { $in: [searchRegex] } },
        { 'tags': { $in: [searchRegex] } },
        { 'projects.title': searchRegex },
        { 'projects.description': searchRegex },
        { 'projects.technologies': { $in: [searchRegex] } }
      ];
    }
    
    console.log('🔍 Search criteria:', JSON.stringify(searchCriteria, null, 2));
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute search
    const users = await User.find(searchCriteria)
      .select('-password -googleId') // Exclude sensitive fields
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ createdAt: -1 });
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchCriteria);
    
    console.log(`🔍 Found ${users.length} users out of ${totalUsers} total`);
    
    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / parseInt(limit)),
        totalUsers,
        hasMore: skip + users.length < totalUsers
      }
    });
    
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

// @desc    Get user profile by ID
// @route   GET /api/users/profile/:userId
// @access  Private
router.get('/profile/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Fetching user profile for ID:', userId);
    
    const user = await User.findById(userId)
      .select('-password -googleId'); // Exclude sensitive fields
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('✅ User profile found:', user.username);
    
    res.json(user);
    
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

module.exports = router;