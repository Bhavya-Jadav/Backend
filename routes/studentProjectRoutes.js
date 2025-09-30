// backend/routes/studentProjectRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const StudentProject = require('../models/StudentProject');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create different folders for different file types
    if (file.mimetype.startsWith('video/')) {
      cb(null, 'uploads/projects/videos/');
    } else {
      cb(null, 'uploads/projects/files/');
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow videos, images, documents, and code files
  const allowedTypes = [
    // Videos
    'video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm',
    // Images  
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Code files
    'text/plain', 'application/json', 'text/javascript', 'text/html', 'text/css',
    // Archives
    'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Please upload videos, images, documents, or code files.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Create new student project
router.post('/', protect, upload.fields([
  { name: 'videoFile', maxCount: 1 },
  { name: 'attachments', maxCount: 10 }
]), async (req, res) => {
  try {
    // Only students can create projects
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create projects' });
    }

    const { 
      title, description, technologies, learningTags, videoUrl, 
      githubLink, liveDemo, category, difficulty, duration, 
      teamSize, collaborators, status, visibility 
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Parse arrays from form data
    const techArray = technologies ? JSON.parse(technologies) : [];
    const tagsArray = learningTags ? JSON.parse(learningTags) : [];
    const collabArray = collaborators ? JSON.parse(collaborators) : [];

    // Process uploaded files
    let videoFileData = null;
    let attachmentsData = [];

    if (req.files) {
      // Process video file
      if (req.files.videoFile && req.files.videoFile[0]) {
        const videoFile = req.files.videoFile[0];
        videoFileData = {
          filename: videoFile.filename,
          originalName: videoFile.originalname,
          mimetype: videoFile.mimetype,
          size: videoFile.size
        };
      }

      // Process attachments
      if (req.files.attachments) {
        attachmentsData = req.files.attachments.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }));
      }
    }

    const project = new StudentProject({
      title,
      description,
      technologies: techArray,
      learningTags: tagsArray,
      videoUrl: videoUrl || null,
      videoFile: videoFileData,
      attachments: attachmentsData,
      githubLink: githubLink || null,
      liveDemo: liveDemo || null,
      category: category || 'Other',
      difficulty: difficulty || 'Beginner',
      duration: duration || null,
      teamSize: parseInt(teamSize) || 1,
      collaborators: collabArray,
      status: status || 'Completed',
      visibility: visibility || 'Public',
      postedBy: req.user._id
    });

    const savedProject = await project.save();
    await savedProject.populate('postedBy', 'name username profilePicture');
    
    res.status(201).json(savedProject);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ message: 'Server Error creating project' });
  }
});

// Get all public projects with pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    let filter = { visibility: 'Public' };

    // Add category filter
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }

    // Add difficulty filter
    if (req.query.difficulty && req.query.difficulty !== 'All') {
      filter.difficulty = req.query.difficulty;
    }

    // Add search filter
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Add technology filter
    if (req.query.technology) {
      filter.technologies = { $in: [req.query.technology] };
    }

    // Sort options
    let sortOption = { createdAt: -1 }; // Default: newest first
    if (req.query.sort === 'popular') {
      sortOption = { 'likes': -1, views: -1 };
    } else if (req.query.sort === 'views') {
      sortOption = { views: -1 };
    }

    const projects = await StudentProject.find(filter)
      .populate('postedBy', 'name username profilePicture university course year')
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    const total = await StudentProject.countDocuments(filter);

    res.json({
      projects,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalProjects: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('Fetch projects error:', err);
    res.status(500).json({ message: 'Server Error fetching projects' });
  }
});

// Get projects by current user
router.get('/my-projects', protect, async (req, res) => {
  try {
    const projects = await StudentProject.find({ postedBy: req.user._id })
      .populate('postedBy', 'name username profilePicture')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    console.error('Fetch my projects error:', err);
    res.status(500).json({ message: 'Server Error fetching your projects' });
  }
});

// Get single project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await StudentProject.findById(req.params.id)
      .populate('postedBy', 'name username profilePicture university course year')
      .populate('comments.user', 'name username profilePicture');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check visibility
    if (project.visibility === 'Private' && (!req.user || project.postedBy._id.toString() !== req.user._id.toString())) {
      return res.status(403).json({ message: 'This project is private' });
    }

    // Increment view count if not the owner
    if (!req.user || project.postedBy._id.toString() !== req.user._id.toString()) {
      project.views += 1;
      await project.save();
    }

    res.json(project);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Project not found' });
    }
    console.error('Fetch project error:', err);
    res.status(500).json({ message: 'Server Error fetching project' });
  }
});

// Update project (only owner)
router.put('/:id', protect, upload.fields([
  { name: 'videoFile', maxCount: 1 },
  { name: 'attachments', maxCount: 10 }
]), async (req, res) => {
  try {
    const project = await StudentProject.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user owns the project
    if (project.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const { 
      title, description, technologies, learningTags, videoUrl, 
      githubLink, liveDemo, category, difficulty, duration, 
      teamSize, collaborators, status, visibility 
    } = req.body;

    // Update basic fields
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (technologies !== undefined) project.technologies = JSON.parse(technologies);
    if (learningTags !== undefined) project.learningTags = JSON.parse(learningTags);
    if (videoUrl !== undefined) project.videoUrl = videoUrl || null;
    if (githubLink !== undefined) project.githubLink = githubLink || null;
    if (liveDemo !== undefined) project.liveDemo = liveDemo || null;
    if (category !== undefined) project.category = category;
    if (difficulty !== undefined) project.difficulty = difficulty;
    if (duration !== undefined) project.duration = duration || null;
    if (teamSize !== undefined) project.teamSize = parseInt(teamSize);
    if (collaborators !== undefined) project.collaborators = JSON.parse(collaborators);
    if (status !== undefined) project.status = status;
    if (visibility !== undefined) project.visibility = visibility;

    // Handle file updates
    if (req.files) {
      // Update video file
      if (req.files.videoFile && req.files.videoFile[0]) {
        const videoFile = req.files.videoFile[0];
        project.videoFile = {
          filename: videoFile.filename,
          originalName: videoFile.originalname,
          mimetype: videoFile.mimetype,
          size: videoFile.size
        };
      }

      // Update attachments (add new ones)
      if (req.files.attachments) {
        const newAttachments = req.files.attachments.map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }));
        project.attachments = [...project.attachments, ...newAttachments];
      }
    }

    const updatedProject = await project.save();
    await updatedProject.populate('postedBy', 'name username profilePicture');

    res.json(updatedProject);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Project not found' });
    }
    console.error('Update project error:', err);
    res.status(500).json({ message: 'Server Error updating project' });
  }
});

// Delete project (only owner)
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await StudentProject.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user owns the project
    if (project.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    await StudentProject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Project not found' });
    }
    console.error('Delete project error:', err);
    res.status(500).json({ message: 'Server Error deleting project' });
  }
});

// Like/Unlike project
router.post('/:id/like', protect, async (req, res) => {
  try {
    const project = await StudentProject.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const userId = req.user._id;
    const likeIndex = project.likes.findIndex(like => like.user.toString() === userId.toString());

    if (likeIndex > -1) {
      // Unlike
      project.likes.splice(likeIndex, 1);
    } else {
      // Like
      project.likes.push({ user: userId });
    }

    await project.save();
    res.json({ liked: likeIndex === -1, likeCount: project.likes.length });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Project not found' });
    }
    console.error('Like project error:', err);
    res.status(500).json({ message: 'Server Error liking project' });
  }
});

// Add comment to project
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const project = await StudentProject.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const newComment = {
      user: req.user._id,
      text: text.trim()
    };

    project.comments.push(newComment);
    await project.save();

    // Populate the new comment
    await project.populate('comments.user', 'name username profilePicture');
    
    const addedComment = project.comments[project.comments.length - 1];
    res.status(201).json(addedComment);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Project not found' });
    }
    console.error('Add comment error:', err);
    res.status(500).json({ message: 'Server Error adding comment' });
  }
});

// Get trending projects
router.get('/trending/all', async (req, res) => {
  try {
    const projects = await StudentProject.find({ visibility: 'Public' })
      .populate('postedBy', 'name username profilePicture university course year')
      .sort({ views: -1, 'likes': -1 })
      .limit(10);

    res.json(projects);
  } catch (err) {
    console.error('Fetch trending projects error:', err);
    res.status(500).json({ message: 'Server Error fetching trending projects' });
  }
});

module.exports = router;
