// server/routes/problemRoutes.js
const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const { protect, admin, adminOrCompany } = require('../middleware/authMiddleware'); // Import auth middleware

// @desc    Create a new problem
// @route   POST /api/problems
// @access  Private/Admin or Company
router.post('/', protect, adminOrCompany, async (req, res) => {
  const { company, branch, title, description, videoUrl, difficulty, tags, quiz, attachments } = req.body;

  try {
    console.log('🚀 PROBLEM POST DEBUG - Starting problem creation');
    console.log('👤 User creating problem:', {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    });
    console.log('📝 Problem data received:', {
      company,
      branch,
      title,
      description: description?.substring(0, 50) + '...',
      difficulty,
      tags
    });

    // 1. Basic validation (add more as needed)
    if (!company || !branch || !title || !description || !difficulty) {
       console.log('❌ VALIDATION FAILED - Missing required fields');
       return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // 2. Validate quiz if provided
    let quizData = {
      enabled: false,
      questions: []
    };

    if (quiz && quiz.enabled) {
      // Validate quiz questions
      if (!quiz.questions || quiz.questions.length === 0) {
        return res.status(400).json({ message: 'Quiz is enabled but no questions provided' });
      }

      // Validate each question
      for (let question of quiz.questions) {
        if (!question.question || !question.type) {
          return res.status(400).json({ message: 'Each quiz question must have a question text and type' });
        }

        if (question.type === 'multiple-choice') {
          if (!question.options || question.options.length < 2) {
            return res.status(400).json({ message: 'Multiple choice questions must have at least 2 options' });
          }
          
          const correctOptions = question.options.filter(opt => opt.isCorrect);
          if (correctOptions.length !== 1) {
            return res.status(400).json({ message: 'Multiple choice questions must have exactly one correct answer' });
          }
        } else if (question.type === 'text' || question.type === 'boolean') {
          if (!question.correctAnswer) {
            return res.status(400).json({ message: `${question.type} questions must have a correct answer` });
          }
        }
      }

      quizData = {
        enabled: true,
        title: quiz.title || `${title} Quiz`,
        description: quiz.description || 'Complete this quiz to submit your idea',
        questions: quiz.questions,
        timeLimit: quiz.timeLimit || 30,
        passingScore: quiz.passingScore || 70
      };
    }

    // 3. Create problem object
    const problem = new Problem({
      company,
      branch,
      title,
      description,
      videoUrl: videoUrl || null, // Only set video URL if provided
      difficulty,
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []),
      postedBy: req.user._id, // Get user ID from protect middleware (req.user is set by it)
      quiz: quizData,
      attachments: Array.isArray(attachments) ? attachments : [] // Handle file attachments
    });

    // 4. Save problem to database
    const createdProblem = await problem.save();

    // 5. Send successful response
    res.status(201).json(createdProblem);
  } catch (error) {
    console.error("Create problem error:", error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({ message: messages.join(', ') });
    }
    res.status(500).json({ message: 'Server Error creating problem' });
  }
});

// @desc    Get all problems (optionally filtered by branch)
// @route   GET /api/problems
// @access  Public
router.get('/', async (req, res) => {
  try {
    // 1. Get branch filter from query parameters (e.g., ?branch=computer)
    const branch = req.query.branch;

    // 2. Build filter object
    const filter = branch ? { branch } : {};

    // 3. Fetch problems from database, sorted by newest first
    const problems = await Problem.find(filter)
                                 // .populate('postedBy', 'username') // Uncomment if you want company name
                                 .sort({ createdAt: -1 }); // Sort by newest first

    // 4. Send successful response
    res.json(problems);
  } catch (error) {
    console.error("Fetch problems error:", error);
    res.status(500).json({ message: 'Server Error fetching problems' });
  }
});

// @desc    Get a single problem by ID
// @route   GET /api/problems/:id
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    // 1. Find problem by ID
    const problem = await Problem.findById(req.params.id)
                                 // .populate('postedBy', 'username'); // Uncomment if needed

    // 2. Check if problem exists
    if (problem) {
      res.json(problem);
    } else {
      res.status(404).json({ message: 'Problem not found' });
    }
  } catch (error) {
    console.error("Fetch problem by ID error:", error);
    // Handle case where ID is not a valid ObjectId format
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Problem not found (Invalid ID format)' });
    }
    res.status(500).json({ message: 'Server Error fetching problem' });
  }
});

// @desc    Update a problem
// @route   PUT /api/problems/:id
// @access  Private/Admin or Company (own problems only)
router.put('/:id', protect, adminOrCompany, async (req, res) => {
  const { company, branch, title, description, videoUrl, difficulty, tags, quiz, attachments } = req.body;

  try {
    // 1. Find the existing problem
    const problem = await Problem.findById(req.params.id);
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // 2. Check if the user owns this problem (companies can only edit their own problems)
    if (req.user.role === 'company' && problem.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this problem. You can only edit problems you posted.' });
    }
    
    // Students cannot edit any problems
    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Students cannot edit problems' });
    }

    // 3. Basic validation
    if (!company || !branch || !title || !description || !difficulty) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // 4. Validate quiz if provided (same logic as create)
    let quizData = {
      enabled: false,
      questions: []
    };

    if (quiz && quiz.enabled) {
      // Validate quiz questions
      if (!quiz.questions || quiz.questions.length === 0) {
        return res.status(400).json({ message: 'Quiz is enabled but no questions provided' });
      }

      // Validate each question
      for (let question of quiz.questions) {
        if (!question.question || !question.type) {
          return res.status(400).json({ message: 'Each quiz question must have a question text and type' });
        }

        if (question.type === 'multiple-choice') {
          if (!question.options || question.options.length < 2) {
            return res.status(400).json({ message: 'Multiple choice questions must have at least 2 options' });
          }
          
          const correctOptions = question.options.filter(opt => opt.isCorrect);
          if (correctOptions.length !== 1) {
            return res.status(400).json({ message: 'Multiple choice questions must have exactly one correct answer' });
          }
        } else if (question.type === 'text' || question.type === 'boolean') {
          if (!question.correctAnswer) {
            return res.status(400).json({ message: `${question.type} questions must have a correct answer` });
          }
        }
      }

      quizData = {
        enabled: true,
        title: quiz.title || `${title} Quiz`,
        description: quiz.description || 'Complete this quiz to submit your idea',
        questions: quiz.questions,
        timeLimit: quiz.timeLimit || 30,
        passingScore: quiz.passingScore || 70
      };
    }

    // 5. Update the problem
    const updatedProblem = await Problem.findByIdAndUpdate(
      req.params.id,
      {
        company,
        branch,
        title,
        description,
        videoUrl: videoUrl || null,
        difficulty,
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []),
        quiz: quizData,
        attachments: Array.isArray(attachments) ? attachments : [],
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    // 6. Send successful response
    res.json(updatedProblem);
  } catch (error) {
    console.error("Update problem error:", error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Problem not found (Invalid ID format)' });
    }
    res.status(500).json({ message: 'Server Error updating problem' });
  }
});

// @desc    Delete a problem
// @route   DELETE /api/problems/:id
// @access  Private/Admin or Company (own problems only)
router.delete('/:id', protect, adminOrCompany, async (req, res) => {
  try {
    // 1. Find problem by ID
    const problem = await Problem.findById(req.params.id);

    // 2. Check if problem exists
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // 3. Check permissions (companies can only delete their own problems)
    if (req.user.role === 'company' && problem.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this problem. You can only delete problems you posted.' });
    }
    
    // Students cannot delete any problems
    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Students cannot delete problems' });
    }

    // 4. Delete the problem
    await Problem.findByIdAndDelete(req.params.id);
    
    // 4. Send successful response
    res.json({ 
      message: 'Problem deleted successfully',
      deletedProblem: {
        id: problem._id,
        title: problem.title,
        company: problem.company
      }
    });
  } catch (error) {
    console.error("❌ Delete problem error:", error);
    // Handle case where ID is not a valid ObjectId format
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Problem not found (Invalid ID format)' });
    }
    res.status(500).json({ message: 'Server Error deleting problem' });
  }
});

module.exports = router;
