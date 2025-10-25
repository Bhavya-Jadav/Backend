// models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  // Store file as Base64 string for small files (< 16MB)
  fileData: {
    type: String,
    required: true
  },
  // For videos and large files, we'll use Buffer
  // fileBuffer: {
  //   type: Buffer,
  //   required: false
  // },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  // Additional metadata
  category: {
    type: String,
    enum: ['document', 'video', 'image', 'other'],
    default: 'other'
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  }
}, {
  timestamps: true
});

// Virtual for file URL (will be generated on-the-fly)
fileSchema.virtual('fileUrl').get(function() {
  return `/api/files/view/${this._id}`;
});

fileSchema.virtual('downloadUrl').get(function() {
  return `/api/files/download/${this._id}`;
});

// Ensure virtuals are included in JSON
fileSchema.set('toJSON', { virtuals: true });
fileSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('File', fileSchema);
