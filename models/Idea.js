// backend/models/Idea.js
const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problem: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  ideaText: { type: String, required: true },
  implementationApproach: { type: String },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

ideaSchema.index({ student: 1, problem: 1 }, { unique: true });
ideaSchema.index({ problem: 1, createdAt: -1 });

module.exports = mongoose.model('Idea', ideaSchema);

