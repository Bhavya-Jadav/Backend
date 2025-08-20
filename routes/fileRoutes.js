// backend/routes/fileRoutes.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// @desc    Download file
// @route   GET /api/files/download/:filename
// @access  Public (for now, can add auth later)
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    // Security: Prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    
    // For Railway deployment, files are stored in /tmp or uploads directory
    const possiblePaths = [
      path.join(__dirname, '..', 'uploads', 'attachments', sanitizedFilename),
      path.join(__dirname, '..', '..', 'server', 'uploads', 'attachments', sanitizedFilename),
      path.join(__dirname, '..', '..', 'uploads', 'attachments', sanitizedFilename),
      path.join(process.cwd(), 'uploads', 'attachments', sanitizedFilename),
      path.join('/tmp', 'uploads', sanitizedFilename),
      path.join('/app', 'uploads', 'attachments', sanitizedFilename), // Railway path
      path.join('/opt', 'render', 'project', 'src', 'uploads', 'attachments', sanitizedFilename) // Alternative path
    ];

    let filePath = null;
    let fileExists = false;

    // Check which path exists
    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          filePath = testPath;
          fileExists = true;
          break;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    if (!fileExists || !filePath) {
      console.log('File not found:', sanitizedFilename);
      console.log('Searched paths:', possiblePaths);
      
      // Log current working directory and list files
      console.log('Current working directory:', process.cwd());
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (fs.existsSync(uploadsDir)) {
          console.log('Files in uploads directory:', fs.readdirSync(uploadsDir, { recursive: true }));
        } else {
          console.log('Uploads directory does not exist');
        }
      } catch (err) {
        console.log('Error listing uploads directory:', err.message);
      }
      
      return res.status(404).json({ 
        message: 'File not found - files may not persist on Railway deployment',
        filename: sanitizedFilename,
        note: 'Files uploaded to Railway are ephemeral and lost on redeploy'
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileExtension = path.extname(sanitizedFilename).toLowerCase();
    
    // Set appropriate content type
    let contentType = 'application/octet-stream';
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif'
    };
    
    if (mimeTypes[fileExtension]) {
      contentType = mimeTypes[fileExtension];
    }

    // Set headers for file download
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading file' });
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ 
      message: 'Server error downloading file',
      error: error.message 
    });
  }
});

// @desc    Upload file
// @route   POST /api/files/upload
// @access  Private
router.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.files.file;
    
    // Basic file validation
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.' });
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return res.status(400).json({ message: 'File size too large. Please upload a file under 10MB.' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000000);
    const fileExtension = path.extname(file.name);
    const fileName = `attachment-${timestamp}-${randomNum}${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'attachments');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Save file path
    const filePath = path.join(uploadsDir, fileName);

    // Move file to uploads directory
    await file.mv(filePath);

    // Return file info
    res.json({
      message: 'File uploaded successfully',
      file: {
        fileName: fileName,
        originalName: file.name,
        fileType: path.extname(file.name).substring(1).toLowerCase(),
        fileSize: file.size,
        filePath: filePath,
        uploadedAt: new Date()
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      message: 'Server error uploading file',
      error: error.message 
    });
  }
});

router.get('/health', (req, res) => {
  res.json({ 
    status: 'File routes working',
    note: 'Railway uses ephemeral storage - files lost on redeploy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
