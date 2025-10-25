// backend/routes/studentProjectRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const StudentProject = require('../models/StudentProject');
const File = require('../models/File');
const { protect } = require('../middleware/authMiddleware');

// Create upload directories if they don't exist
const uploadsDir = path.join(__dirname, '../uploads/projects');
const videosDir = path.join(uploadsDir, 'videos');
const filesDir = path.join(uploadsDir, 'files');

[uploadsDir, videosDir, filesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Helper function to save uploaded files
const saveUploadedFile = async (file, destinationDir) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.name);
  const uploadPath = path.join(destinationDir, filename);

  await file.mv(uploadPath);

  return {
    filename: filename,
    originalName: file.name,
    mimetype: file.mimetype,
    size: file.size
  };
};

// Create new student project
router.post('/', protect, async (req, res) => {
  try {
    // Only students can create projects
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create projects' });
    }

    console.log('📝 Creating project - Request body:', Object.keys(req.body));
    console.log('📎 Files received:', req.files ? Object.keys(req.files) : 'none');

    const { 
      title, description, technologies, learningTags, videoUrl, 
      githubLink, liveDemo, category, difficulty, duration, 
      teamSize, collaborators, status, visibility 
    } = req.body;

    // Validate required fields (check for empty strings too)
    if (!title || title.trim() === '') {
      console.log('❌ Validation failed: Title is required');
      return res.status(400).json({ 
        success: false,
        message: 'Title is required' 
      });
    }

    if (!description || description.trim() === '') {
      console.log('❌ Validation failed: Description is required');
      return res.status(400).json({ 
        success: false,
        message: 'Description is required' 
      });
    }

    // Parse arrays from form data with error handling
    let techArray = [];
    let tagsArray = [];
    let collabArray = [];

    try {
      techArray = technologies ? JSON.parse(technologies) : [];
      console.log('✅ Parsed technologies:', techArray);
    } catch (parseError) {
      console.error('❌ JSON parse error for technologies:', parseError);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid format for technologies field'
      });
    }

    try {
      tagsArray = learningTags ? JSON.parse(learningTags) : [];
      console.log('✅ Parsed learning tags:', tagsArray);
    } catch (parseError) {
      console.error('❌ JSON parse error for learningTags:', parseError);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid format for learning tags field'
      });
    }

    try {
      collabArray = collaborators ? JSON.parse(collaborators) : [];
      console.log('✅ Parsed collaborators:', collabArray);
    } catch (parseError) {
      console.error('❌ JSON parse error for collaborators:', parseError);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid format for collaborators field' 
      });
    }

    // Process uploaded files and save to MongoDB
    let videoFileId = null;
    let attachmentIds = [];

    if (req.files) {
      // Process video file - Save to MongoDB
      if (req.files.videoFile) {
        try {
          const videoFile = Array.isArray(req.files.videoFile) ? req.files.videoFile[0] : req.files.videoFile;
          
          // Check file size (MongoDB 16MB limit)
          if (videoFile.size > 16 * 1024 * 1024) {
            return res.status(400).json({
              success: false,
              message: 'Video file too large. Maximum size is 16MB. Please compress the video.'
            });
          }
          
          // Convert to Base64 and save to MongoDB
          const fileData = videoFile.data.toString('base64');
          
          const savedVideoFile = await File.create({
            fileName: `video_${Date.now()}_${videoFile.name}`,
            originalName: videoFile.name,
            fileType: videoFile.name.split('.').pop()?.toLowerCase() || 'mp4',
            fileSize: videoFile.size,
            mimeType: videoFile.mimetype,
            fileData: fileData,
            category: 'video',
            uploadedBy: req.user._id,
            visibility: 'public'
          });
          
          videoFileId = savedVideoFile._id;
          console.log('✅ Video file saved to MongoDB:', savedVideoFile._id);
        } catch (error) {
          console.error('❌ Error saving video file to MongoDB:', error);
          return res.status(500).json({
            success: false,
            message: 'Error saving video file: ' + error.message
          });
        }
      }

      // Process attachments - Save to MongoDB
      if (req.files.attachments) {
        try {
          const attachmentFiles = Array.isArray(req.files.attachments) ? req.files.attachments : [req.files.attachments];
          
          for (const file of attachmentFiles) {
            // Check file size
            if (file.size > 16 * 1024 * 1024) {
              return res.status(400).json({
                success: false,
                message: `File "${file.name}" is too large. Maximum size is 16MB.`
              });
            }
            
            // Convert to Base64 and save to MongoDB
            const fileData = file.data.toString('base64');
            
            const savedFile = await File.create({
              fileName: `attachment_${Date.now()}_${file.name}`,
              originalName: file.name,
              fileType: file.name.split('.').pop()?.toLowerCase() || 'file',
              fileSize: file.size,
              mimeType: file.mimetype,
              fileData: fileData,
              category: 'document',
              uploadedBy: req.user._id,
              visibility: 'public'
            });
            
            attachmentIds.push(savedFile._id);
          }
          console.log('✅ Attachments saved to MongoDB:', attachmentIds.length);
        } catch (error) {
          console.error('❌ Error saving attachments to MongoDB:', error);
          return res.status(500).json({
            success: false,
            message: 'Error saving attachments: ' + error.message
          });
        }
      }
    }

    const project = new StudentProject({
      title,
      description,
      technologies: techArray,
      learningTags: tagsArray,
      videoUrl: videoUrl || null,
      videoFileId: videoFileId, // NEW: MongoDB File reference
      attachmentIds: attachmentIds, // NEW: MongoDB File references
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
    
    console.log('✅ Project created successfully with MongoDB files:', savedProject._id);
    
    res.status(201).json({
      success: true,
      message: 'Project created successfully with files in MongoDB',
      project: savedProject
    });
  } catch (err) {
    console.error('❌ Create project error:', err);
    console.error('Error stack:', err.stack);
    res.status(500).json({ 
      success: false,
      message: 'Server Error creating project',
      error: err.message 
    });
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
      .populate('videoFileId') // NEW: Populate video file from File collection
      .populate('attachmentIds') // NEW: Populate attachments from File collection
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
      .populate('videoFileId') // NEW: Populate video file from File collection
      .populate('attachmentIds') // NEW: Populate attachments from File collection
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    console.error('Fetch my projects error:', err);
    res.status(500).json({ message: 'Server Error fetching your projects' });
  }
});

// Get showcase projects by user ID (for viewing other users' projects)
router.get('/user/:userId', async (req, res) => {
  try {
    console.log('📊 Fetching showcase projects for user:', req.params.userId);
    
    // Check if viewing own profile (if authenticated)
    const isOwnProfile = req.user && req.user._id.toString() === req.params.userId;
    
    // If viewing own profile, show all projects. Otherwise, only public ones
    const visibilityFilter = isOwnProfile ? {} : { visibility: 'Public' };
    
    console.log('Is own profile?', isOwnProfile);
    console.log('Visibility filter:', visibilityFilter);
    
    const projects = await StudentProject.find({ 
      postedBy: req.params.userId,
      ...visibilityFilter
    })
      .populate('postedBy', 'name username profilePicture')
      .populate('videoFileId') // NEW: Populate video file from File collection
      .populate('attachmentIds') // NEW: Populate attachments from File collection
      .sort({ createdAt: -1 });

    console.log('✅ Found', projects.length, 'showcase projects for user');
    if (projects.length > 0) {
      console.log('First project:', projects[0].title);
    }
    
    res.json(projects);
  } catch (err) {
    console.error('❌ Fetch user projects error:', err);
    res.status(500).json({ message: 'Server Error fetching user projects' });
  }
});

// Get single project by ID
router.get('/:id', async (req, res) => {
  try {
    const project = await StudentProject.findById(req.params.id)
      .populate('postedBy', 'name username profilePicture university course year')
      .populate('comments.user', 'name username profilePicture')
      .populate('videoFileId') // NEW: Populate video file from File collection
      .populate('attachmentIds'); // NEW: Populate attachments from File collection

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
