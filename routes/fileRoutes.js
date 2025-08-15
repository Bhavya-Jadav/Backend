// server/routes/fileRoutes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// @desc    Upload files
// @route   POST /api/files/upload
// @access  Private (authenticated users)
router.post('/upload', protect, async (req, res) => {
  try {
    console.log('File upload request received');
    console.log('Request files:', req.files);
    console.log('User:', req.user?.username);

    if (!req.files || !req.files.attachments) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Handle both single file and multiple files
    const files = Array.isArray(req.files.attachments) 
      ? req.files.attachments 
      : [req.files.attachments];

    console.log('Processing', files.length, 'files');

    // Create upload directory if it doesn't exist
    const uploadPath = path.join(__dirname, '../uploads/attachments/');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const fileData = [];

    for (const file of files) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        console.log('Invalid file type:', file.mimetype);
        return res.status(400).json({ 
          message: `Invalid file type: ${file.mimetype}. Only PDF, Word, PowerPoint, Excel, and Text files are allowed.` 
        });
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        console.log('File too large:', file.size);
        return res.status(400).json({ 
          message: `File ${file.name} is too large. Maximum size is 10MB.` 
        });
      }

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.name);
      const fileName = 'attachment-' + uniqueSuffix + fileExtension;
      const filePath = path.join(uploadPath, fileName);

      console.log('Saving file:', fileName, 'Type detected:', file.mimetype);

      // Move file to upload directory
      try {
        await file.mv(filePath);
      } catch (moveError) {
        console.error('File move error:', moveError);
        return res.status(500).json({ message: 'Failed to save file' });
      }

      // Determine file type from mime type
      let fileType = 'other';
      switch (file.mimetype) {
        case 'application/pdf':
          fileType = 'pdf';
          break;
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          fileType = file.mimetype.includes('openxml') ? 'docx' : 'doc';
          break;
        case 'application/vnd.ms-powerpoint':
        case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          fileType = file.mimetype.includes('openxml') ? 'pptx' : 'ppt';
          break;
        case 'application/vnd.ms-excel':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          fileType = file.mimetype.includes('openxml') ? 'xlsx' : 'xls';
          break;
        case 'text/plain':
          fileType = 'txt';
          break;
      }

      console.log('Final file type assigned:', fileType);

      fileData.push({
        fileName: fileName,
        originalName: file.name,
        fileType: fileType,
        fileSize: file.size,
        filePath: filePath,
        uploadedAt: new Date()
      });
    }

    console.log('Upload successful:', fileData.length, 'files processed');
    res.status(200).json({
      message: 'Files uploaded successfully',
      files: fileData
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      message: 'File upload failed', 
      error: error.message 
    });
  }
});

// @desc    Test route
// @route   GET /api/files/test
// @access  Public
router.get('/test', (req, res) => {
  res.json({ message: 'File routes are working!' });
});

// @desc    Download files with force download
// @route   GET /api/files/download/:filename
// @access  Public (for students to download company files)
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/attachments/', filename);
    
    console.log('Download request for:', filename);
    console.log('Full file path:', filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log('File not found:', filePath);
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set appropriate headers for forced download
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.ppt':
        contentType = 'application/vnd.ms-powerpoint';
        break;
      case '.pptx':
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
      case '.xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`); // Force download
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

    console.log('Sending file with headers:', {
      contentType,
      contentLength: stats.size,
      filename: filename
    });

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ message: 'Error downloading file', error: error.message });
  }
});

// @desc    Serve/download files
// @route   GET /api/files/:filename
// @access  Public (you might want to protect this)
router.get('/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/attachments/', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Set appropriate headers based on file extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.doc':
        contentType = 'application/msword';
        break;
      case '.docx':
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
      case '.ppt':
        contentType = 'application/vnd.ms-powerpoint';
        break;
      case '.pptx':
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        break;
      case '.xls':
        contentType = 'application/vnd.ms-excel';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.txt':
        contentType = 'text/plain';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ message: 'Error serving file', error: error.message });
  }
});

// @desc    Delete file
// @route   DELETE /api/files/:filename
// @access  Private/Admin
router.delete('/:filename', protect, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/attachments/', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
});

module.exports = router;
