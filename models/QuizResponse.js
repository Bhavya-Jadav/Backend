// backend/models/QuizResponse.js
const mongoose = require('mongoose');

const quizResponseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  answers: [{
    questionIndex: { type: Number, required: true },
    answer: { type: String, required: true }
  }],
  score: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('QuizResponse', quizResponseSchema);

