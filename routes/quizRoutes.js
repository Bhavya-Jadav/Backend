
const express = require('express');
const router = express.Router();

// Example quiz route
router.get('/', (req, res) => {
  res.json({ message: 'Quiz route works!' });
});

// Quiz submission route
router.post('/submit', async (req, res) => {
  // Quiz submission logic
  const { problemId, answers } = req.body;
  if (!problemId || !answers) {
    return res.status(400).json({ success: false, message: 'Missing problemId or answers.' });
  }

  const Problem = require('../models/Problem');
  const problem = await Problem.findById(problemId);
  if (!problem || !problem.quiz || !problem.quiz.enabled) {
    return res.status(404).json({ success: false, message: 'Quiz not found for this problem.' });
  }

  const questions = problem.quiz.questions;
  let score = 0;
  let results = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const userAnswer = answers[i];
    let correct = false;
    if (q.type === 'multiple-choice') {
      // Find the correct option
      const correctOption = q.options.find(opt => opt.isCorrect);
      correct = correctOption && userAnswer === correctOption.text;
    } else if (q.type === 'text') {
      correct = userAnswer && q.correctAnswer && userAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
    } else if (q.type === 'boolean') {
      correct = userAnswer === q.correctAnswer;
    }
    if (correct) score += q.points || 1;
    results.push({ question: q.question, correct });
  }

  // Calculate percentage score
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0);
  const percentScore = totalPoints ? Math.round((score / totalPoints) * 100) : 0;
  const passed = percentScore >= (problem.quiz.passingScore || 70);

  // Save user response
  try {
    const QuizResponse = require('../models/QuizResponse');
    // You may need to get user ID from authentication middleware (e.g., req.user._id)
    const studentId = req.user?._id || req.body.studentId; // fallback for demo
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Missing student/user ID.' });
    }
    // Upsert response (one per student/problem)
    await QuizResponse.findOneAndUpdate(
      { problem: problemId, student: studentId },
      {
        problem: problemId,
        student: studentId,
        answers: results.map((r, idx) => ({
          questionIndex: idx,
          answer: answers[idx],
          isCorrect: r.correct,
          points: r.correct ? (questions[idx].points || 1) : 0
        })),
        totalScore: score,
        maxScore: totalPoints,
        percentage: percentScore,
        passed
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, score, percentScore, passed, results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error saving quiz response', error: err.message });
  }
});


// Get quiz response by ID
router.get('/response/:id', async (req, res) => {
  // TODO: Add logic to fetch quiz response by ID
  res.json({ success: true, message: 'Quiz response fetched!', id: req.params.id });
});

// Delete quiz response by ID
router.delete('/response/:id', async (req, res) => {
  // TODO: Add logic to delete quiz response by ID
  res.json({ success: true, message: 'Quiz response deleted!', id: req.params.id });
});

module.exports = router;
