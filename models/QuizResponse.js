// backend/models/QuizResponse.js
const mongoose = require('mongoose');

const quizResponseSchema = new mongoose.Schema({
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: [{
    questionIndex: {
      type: Number,
      required: true
    },
    answer: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    points: {
      type: Number,
      default: 0
    }
  }],
  totalScore: {
    type: Number,
    required: true,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  timeSpent: {
    type: Number, // in seconds
    default: 0
  }
}, { timestamps: true });

// Compound index to ensure one response per student per problem
quizResponseSchema.index({ problem: 1, student: 1 }, { unique: true });

// Index for leaderboard queries
quizResponseSchema.index({ percentage: -1 });
quizResponseSchema.index({ totalScore: -1 });

module.exports = mongoose.model('QuizResponse', quizResponseSchema);

