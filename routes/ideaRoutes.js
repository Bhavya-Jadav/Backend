// backend/routes/ideaRoutes.js
const express = require('express');
const router = express.Router();
const Idea = require('../models/Idea');
const Problem = require('../models/Problem');
const { protect, student, admin, adminOrCompany } = require('../middleware/authMiddleware');

// Submit idea (student)
router.post('/', protect, student, async (req, res) => {
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

// List ideas for a problem (admin/company)
router.get('/problem/:problemId', protect, adminOrCompany, async (req, res) => {
  try {
    const ideas = await Idea.find({ problem: req.params.problemId }).select('ideaText implementationApproach student createdAt').sort({ createdAt: -1 });
    res.json(ideas);
  } catch (err) {
    console.error('Fetch ideas error:', err);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;

