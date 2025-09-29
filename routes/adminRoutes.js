const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Problem = require('../models/Problem');
const Idea = require('../models/Idea');
const { protect, admin } = require('../middleware/authMiddleware');

// Get user statistics for admin dashboard
router.get('/stats', protect, admin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const students = await User.countDocuments({ role: 'student' });
    const companies = await User.countDocuments({ role: 'company' });
    const admins = await User.countDocuments({ role: 'admin' });

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRegistrations = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    res.json({
      totalUsers,
      students,
      companies,
      admins,
      recentRegistrations
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users with pagination and filtering
router.get('/users', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role;
    const search = req.query.search;

    let query = {};
    
    // Filter by role if specified
    if (role && role !== 'all') {
      query.role = role;
    }

    // Search by name, email, or username
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change user role
router.put('/users/:userId/role', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ['student', 'company', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    // Prevent admin from changing their own role
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: `User role updated to ${role}`,
      user
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user details
router.get('/users/:userId', protect, admin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all problems for admin management
router.get('/problems', protect, admin, async (req, res) => {
  try {
    const problems = await Problem.find()
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    // Add idea count for each problem
    const problemsWithStats = await Promise.all(
      problems.map(async (problem) => {
        const ideaCount = await Idea.countDocuments({ problem: problem._id });
        return {
          ...problem.toObject(),
          ideaCount
        };
      })
    );

    res.json(problemsWithStats);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update problem by admin
router.put('/problems/:problemId', protect, admin, async (req, res) => {
  try {
    const { problemId } = req.params;
    const { title, description, branch, difficulty, videoUrl, tags } = req.body;

    // Validate required fields
    if (!title || !description || !branch || !difficulty) {
      return res.status(400).json({ 
        message: 'Title, description, branch, and difficulty are required' 
      });
    }

    // Validate branch
    const validBranches = ['computer', 'mechanical', 'electrical', 'civil', 'chemical', 'aerospace'];
    if (!validBranches.includes(branch)) {
      return res.status(400).json({ message: 'Invalid branch specified' });
    }

    // Validate difficulty
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({ message: 'Invalid difficulty specified' });
    }

    const problem = await Problem.findByIdAndUpdate(
      problemId,
      {
        title: title.trim(),
        description: description.trim(),
        branch,
        difficulty,
        videoUrl: videoUrl || null,
        tags: tags || []
      },
      { new: true, runValidators: true }
    ).populate('postedBy', 'name email');

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    res.json({
      message: 'Problem updated successfully',
      problem
    });
  } catch (error) {
    console.error('Error updating problem:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error', 
        details: error.message 
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete problem by admin
router.delete('/problems/:problemId', protect, admin, async (req, res) => {
  try {
    const { problemId } = req.params;

    // Check if problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Delete all associated ideas first
    const deletedIdeas = await Idea.deleteMany({ problem: problemId });
    console.log(`Deleted ${deletedIdeas.deletedCount} ideas associated with problem ${problemId}`);

    // Delete the problem
    await Problem.findByIdAndDelete(problemId);

    res.json({ 
      message: 'Problem and associated data deleted successfully',
      deletedIdeas: deletedIdeas.deletedCount
    });
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all ideas for admin review
router.get('/ideas', protect, admin, async (req, res) => {
  try {
    const ideas = await Idea.find()
      .populate('student', 'name email')
      .populate('problem', 'title company')
      .sort({ createdAt: -1 });

    res.json(ideas);
  } catch (error) {
    console.error('Error fetching ideas:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
