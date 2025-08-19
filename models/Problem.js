// backend/models/Problem.js
const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  branch: { type: String, required: true, enum: ['computer', 'mechanical', 'electrical', 'civil', 'chemical', 'aerospace'] },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  videoUrl: { type: String, default: null },
  attachments: [{
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true, enum: ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'other'] },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  difficulty: { type: String, required: true, enum: ['beginner', 'intermediate', 'advanced'] },
  tags: [{ type: String, trim: true }],
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postedAt: { type: Date, default: Date.now },
  views: { type: Number, default: 0 },
  quiz: {
    enabled: { type: Boolean, default: false },
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    questions: [{
      question: { type: String, required: true, trim: true },
      type: { type: String, required: true, enum: ['multiple-choice', 'text', 'boolean'] },
      options: [{ text: { type: String, required: true }, isCorrect: { type: Boolean, default: false } }],
      correctAnswer: { type: String },
      points: { type: Number, default: 1 }
    }],
    timeLimit: { type: Number, default: 30 },
    passingScore: { type: Number, default: 70 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Problem', problemSchema);

