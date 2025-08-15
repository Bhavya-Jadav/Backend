const mongoose = require('mongoose');

const ideaSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User (student) who submitted it
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem', // Reference to the Problem it belongs to
    required: true
  },
  ideaText: {
    type: String,
    required: true
  },
  implementationApproach: {
    type: String
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
  // Add fields like status (pending, reviewed, accepted) if needed
}, {
  timestamps: true // Adds createdAt, updatedAt
});

// Optional: Compound index to ensure a student can only submit one idea per problem
// Remove or adjust if multiple submissions per problem are allowed
ideaSchema.index({ student: 1, problem: 1 }, { unique: true });

// Index for faster queries when fetching ideas by problem (used in company dashboard)
ideaSchema.index({ problem: 1, createdAt: -1 });

module.exports = mongoose.model('Idea', ideaSchema);
