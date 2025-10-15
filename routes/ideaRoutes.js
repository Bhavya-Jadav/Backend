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
    const { problemId } = req.query;
    
    console.log('🚀 IDEAS ROUTE - Getting ideas');
    console.log('👤 User:', req.user.username, 'Role:', req.user.role);
    console.log('🔍 Problem ID filter:', problemId || 'None (all ideas)');
    
    // Build query filter
    let filter = {};
    
    // If problemId is provided, filter by that specific problem
    if (problemId) {
      filter.problem = problemId;
      console.log('🎯 Filtering ideas for specific problem:', problemId);
    } else {
      // If no problemId, only admins can see all ideas
      if (req.user.role !== 'admin') {
        console.log('⚠️ Non-admin user trying to access all ideas - forbidden');
        return res.status(403).json({ message: 'Access denied. Only admins can view all ideas.' });
      }
      console.log('👑 Admin accessing all ideas');
    }
    
    // Get ideas with filter
    const ideas = await Idea.find(filter)
                           .populate('student', 'username name email university course year skills profilePicture')
                           .populate('problem', 'title company branch')
                           .sort({ createdAt: -1 })
                           .lean();

    console.log(`📊 Found ${ideas.length} ideas matching filter`);
    
    // Log sample idea for debugging
    if (ideas.length > 0) {
      console.log('📝 Sample idea:', {
        id: ideas[0]._id,
        studentName: ideas[0].student?.name,
        problemTitle: ideas[0].problem?.title,
        company: ideas[0].problem?.company,
        ideaText: ideas[0].ideaText?.substring(0, 50) + '...'
      });
    } else {
      console.log('📝 No ideas found matching filter');
      
      if (problemId) {
        // Check if the problem exists
        const problem = await Problem.findById(problemId);
        if (!problem) {
          console.log('❌ Problem not found:', problemId);
          return res.status(404).json({ message: 'Problem not found' });
        }
        console.log('✅ Problem exists but no ideas submitted yet:', problem.title);
      }
    }
    
    res.json(ideas);
  } catch (error) {
    console.error("❌ Fetch ideas error:", error);
    res.status(500).json({ message: 'Server Error fetching ideas' });
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

