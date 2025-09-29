// backend/routes/problemRoutes.js
const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const { protect, admin, adminOrCompany } = require('../middleware/authMiddleware');

// Create problem (admin/company)
router.post('/', protect, adminOrCompany, async (req, res) => {
  try {
    const { company, branch, title, description, videoUrl, difficulty, tags, quiz, attachments } = req.body;
    if (!company || !branch || !title || !description || !difficulty) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const problem = new Problem({
      company, branch, title, description,
      videoUrl: videoUrl || null,
      difficulty,
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      postedBy: req.user._id,
      quiz: quiz || { enabled: false, questions: [] },
      attachments: Array.isArray(attachments) ? attachments : []
    });
    const created = await problem.save();
    res.status(201).json(created);
  } catch (err) {
    console.error('Create problem error:', err);
    res.status(500).json({ message: 'Server Error creating problem' });
  }
});

// Get all problems
router.get('/', async (_req, res) => {
  try {
    const problems = await Problem.find({}).sort({ createdAt: -1 });
    res.json(problems);
  } catch (err) {
    console.error('Fetch problems error:', err);
    res.status(500).json({ message: 'Server Error fetching problems' });
  }
});

// Get problems posted by current user (companies see only their problems)
router.get('/my-problems', protect, async (req, res) => {
  try {
    const problems = await Problem.find({ postedBy: req.user._id }).sort({ createdAt: -1 });
    res.json(problems);
  } catch (err) {
    console.error('Fetch my problems error:', err);
    res.status(500).json({ message: 'Server Error fetching your problems' });
  }
});

// Get single problem
router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: 'Problem not found' });
    res.json(problem);
  } catch (err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Problem not found' });
    console.error('Fetch problem error:', err);
    res.status(500).json({ message: 'Server Error fetching problem' });
  }
});

// Update problem (admin/company)
router.put('/:id', protect, adminOrCompany, async (req, res) => {
  try {
    const { company, branch, title, description, videoUrl, difficulty, tags, quiz, attachments } = req.body;
    
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Check if user has permission to update this problem
    if (req.user.role !== 'admin' && problem.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this problem' });
    }

    // Update fields
    if (company !== undefined) problem.company = company;
    if (branch !== undefined) problem.branch = branch;
    if (title !== undefined) problem.title = title;
    if (description !== undefined) problem.description = description;
    if (videoUrl !== undefined) problem.videoUrl = videoUrl || null;
    if (difficulty !== undefined) problem.difficulty = difficulty;
    if (tags !== undefined) {
      problem.tags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);
    }
    if (quiz !== undefined) problem.quiz = quiz;
    if (attachments !== undefined) problem.attachments = Array.isArray(attachments) ? attachments : [];

    const updatedProblem = await problem.save();
    res.json(updatedProblem);

  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Problem not found' });
    }
    console.error('Update problem error:', err);
    res.status(500).json({ message: 'Server Error updating problem' });
  }
});

// Delete problem (admin or problem owner)
router.delete('/:id', protect, async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Check if user has permission to delete this problem
    if (req.user.role !== 'admin' && problem.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this problem' });
    }

    await Problem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Problem deleted successfully' });

  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Problem not found' });
    }
    console.error('Delete problem error:', err);
    res.status(500).json({ message: 'Server Error deleting problem' });
  }
});

module.exports = router;

