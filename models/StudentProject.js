// backend/models/StudentProject.js
const mongoose = require('mongoose');

const studentProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  technologies: [{
    type: String,
    trim: true
  }],
  learningTags: [{
    type: String,
    trim: true
  }],
  videoUrl: {
    type: String,
    trim: true
  },
  videoFile: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
  },
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: { type: Date, default: Date.now }
  }],
  githubLink: {
    type: String,
    trim: true
  },
  liveDemo: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['Web Development', 'Mobile App', 'Data Science', 'Machine Learning', 'AI', 'IoT', 'Game Development', 'Desktop Application', 'API/Backend', 'DevOps', 'Cybersecurity', 'Other'],
    default: 'Other'
  },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  duration: {
    type: String,
    trim: true // e.g., "2 weeks", "1 month"
  },
  teamSize: {
    type: Number,
    default: 1
  },
  collaborators: [{
    name: String,
    role: String,
    contact: String
  }],
  status: {
    type: String,
    enum: ['In Progress', 'Completed', 'On Hold', 'Cancelled'],
    default: 'Completed'
  },
  visibility: {
    type: String,
    enum: ['Public', 'Private', 'Friends Only'],
    default: 'Public'
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better search performance
studentProjectSchema.index({ title: 'text', description: 'text', technologies: 'text', learningTags: 'text' });
studentProjectSchema.index({ postedBy: 1, createdAt: -1 });
studentProjectSchema.index({ category: 1, difficulty: 1 });
studentProjectSchema.index({ visibility: 1, featured: 1 });

// Virtual for like count
studentProjectSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// Virtual for comment count
studentProjectSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Ensure virtuals are included in JSON output
studentProjectSchema.set('toJSON', { virtuals: true });
studentProjectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('StudentProject', studentProjectSchema);
