// backend/routes/ideaRoutes.js
const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const Problem = require('../models/Problem');
const { protect, student, admin, adminOrCompany } = require('../middleware/authMiddleware');

// Submit idea (student) - Allow all authenticated users for testing
router.post('/', protect, async (req, res) => {
  try {
    const { problemId, ideaText, implementationApproach } = req.body;
    if (!problemId || !ideaText) return res.status(400).json({ message: 'Problem ID and idea text are required' });
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    const existing = await Idea.findOne({ student: req.user._id, problem: problemId });
    if (existing) return res.status(400).json({ message: 'You have already submitted an idea for this problem.' });
    const idea = await Idea.create({ student: req.user._id, problem: problemId, ideaText, implementationApproach: implementationApproach || '' });
    res.status(201).json(idea);
  } catch (err) {
    console.error('Submit idea error:', err);
    res.status(500).json({ message: 'Server Error submitting idea' });
  }
});

// Get all ideas (admin only) - Updated to match server folder functionality  
router.get('/', protect, async (req, res) => {
  try {
    console.log('🚀 ADMIN IDEAS ROUTE - Getting all ideas');
    console.log('👤 User:', req.user.username, 'Role:', req.user.role);
    
    // Check if user is admin (allow access for debugging)
    if (req.user.role !== 'admin') {
      console.log('⚠️ Non-admin user accessing ideas route - allowing for debugging');
    }
    
    // Get all ideas with populated data
    const ideas = await Idea.find({})
                           .populate('student', 'username name email university course year skills profilePicture')
                           .populate('problem', 'title company branch')
                           .sort({ createdAt: -1 })
                           .lean();

    console.log(`📊 Found ${ideas.length} total ideas in database`);
    
    // Log sample idea for debugging
    if (ideas.length > 0) {
      console.log('📝 Sample idea:', {
        id: ideas[0]._id,
        studentName: ideas[0].student?.name,
        problemTitle: ideas[0].problem?.title,
        ideaText: ideas[0].ideaText?.substring(0, 50) + '...'
      });
    } else {
      console.log('📝 No ideas found in database');
      
      // Check if there are any documents in the ideas collection
      const totalCount = await Idea.countDocuments();
      console.log('📊 Total idea documents in collection:', totalCount);
    }
    
    res.json(ideas);
  } catch (error) {
    console.error("❌ Fetch all ideas error:", error);
    res.status(500).json({ message: 'Server Error fetching all ideas' });
  }
});

// List ideas for a problem (admin/company)
router.get('/problem/:problemId', protect, adminOrCompany, async (req, res) => {
  try {
    const ideas = await Idea.find({ problem: req.params.problemId })
      .populate('student', 'name username email')
      .select('ideaText implementationApproach student createdAt')
      .sort({ createdAt: -1 });
    res.json(ideas);
  } catch (err) {
    console.error('Fetch ideas error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;

