// backend/routes/quizRoutes.js
const express = require('express');
const router = express.Router();
const Problem = require('../models/Problem');
const QuizResponse = require('../models/QuizResponse');
const { protect } = require('../middleware/authMiddleware');

// @desc    Submit quiz response
// @route   POST /api/quiz/submit
// @access  Private/Student
router.post('/submit', protect, async (req, res) => {
  const { problemId, answers, timeSpent } = req.body;

  try {
    // 1. Find the problem with quiz
    const problem = await Problem.findById(problemId);
    if (!problem || !problem.quiz.enabled) {
      return res.status(404).json({ message: 'Quiz not found or not enabled' });
    }

    // 2. Check if student already submitted
    const existingResponse = await QuizResponse.findOne({
      problem: problemId,
      student: req.user._id
    });

    if (existingResponse) {
      return res.status(400).json({ message: 'You have already submitted this quiz' });
    }

    // 3. Calculate score
    let totalScore = 0;
    let maxScore = 0;
    const gradedAnswers = [];

    problem.quiz.questions.forEach((question, index) => {
      const studentAnswer = answers.find(a => a.questionIndex === index);
      maxScore += question.points;
      
      let isCorrect = false;
      let points = 0;

      if (studentAnswer) {
        if (question.type === 'multiple-choice') {
          // Find the correct option
          const correctOption = question.options.find(opt => opt.isCorrect);
          isCorrect = correctOption && studentAnswer.answer === correctOption.text;
        } else if (question.type === 'boolean') {
          isCorrect = studentAnswer.answer.toLowerCase() === question.correctAnswer.toLowerCase();
        } else if (question.type === 'text') {
          // Simple text matching (can be enhanced with fuzzy matching)
          isCorrect = studentAnswer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
        }

        if (isCorrect) {
          points = question.points;
          totalScore += points;
        }
      }

      gradedAnswers.push({
        questionIndex: index,
        answer: studentAnswer ? studentAnswer.answer : '',
        isCorrect,
        points
      });
    });

    // 4. Calculate percentage and pass/fail
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= problem.quiz.passingScore;

    // 5. Save quiz response
    const quizResponse = new QuizResponse({
      problem: problemId,
      student: req.user._id,
      answers: gradedAnswers,
      totalScore,
      maxScore,
      percentage,
      passed,
      timeSpent: timeSpent || 0
    });

    await quizResponse.save();

    // 6. Send response
    res.status(201).json({
      message: 'Quiz submitted successfully',
      result: {
        totalScore,
        maxScore,
        percentage,
        passed,
        timeSpent
      }
    });

  } catch (error) {
    console.error("❌ Quiz submission error:", error);
    res.status(500).json({ message: 'Server Error submitting quiz' });
  }
});

// @desc    Get quiz response for a student
// @route   GET /api/quiz/response/:problemId
// @access  Private/Student
router.get('/response/:problemId', protect, async (req, res) => {
  try {
    const response = await QuizResponse.findOne({
      problem: req.params.problemId,
      student: req.user._id
    }).populate('problem', 'title company');

    if (!response) {
      return res.status(404).json({ message: 'Quiz response not found' });
    }

    res.json(response);
  } catch (error) {
    console.error("❌ Get quiz response error:", error);
    res.status(500).json({ message: 'Server Error fetching quiz response' });
  }
});

// @desc    Get all quiz responses for a problem (Admin only)
// @route   GET /api/quiz/responses/:problemId
// @access  Private/Admin
router.get('/responses/:problemId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const responses = await QuizResponse.find({
      problem: req.params.problemId
    }).populate('student', 'username university')
      .sort({ percentage: -1 }); // Sort by highest score first

    res.json(responses);
  } catch (error) {
    console.error("❌ Get quiz responses error:", error);
    res.status(500).json({ message: 'Server Error fetching quiz responses' });
  }
});

// @desc    Delete quiz response for retaking (Development/Testing)
// @route   DELETE /api/quiz/response/:problemId
// @access  Private/Student
router.delete('/response/:problemId', protect, async (req, res) => {
  try {
    const response = await QuizResponse.findOneAndDelete({
      problem: req.params.problemId,
      student: req.user._id
    });

    if (!response) {
      return res.status(404).json({ message: 'Quiz response not found' });
    }

    res.json({ message: 'Quiz response deleted successfully. You can now retake the quiz.' });
  } catch (error) {
    console.error("❌ Delete quiz response error:", error);
    res.status(500).json({ message: 'Server Error deleting quiz response' });
  }
});

// Test endpoint to verify quiz routes are working
router.get('/health', (req, res) => {
  res.json({ 
    status: 'Quiz routes are working',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/quiz/submit',
      'GET /api/quiz/response/:problemId',
      'GET /api/quiz/responses/:problemId',
      'DELETE /api/quiz/response/:problemId'
    ]
  });
});

module.exports = router;

