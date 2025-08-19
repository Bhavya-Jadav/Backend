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

module.exports = router;

