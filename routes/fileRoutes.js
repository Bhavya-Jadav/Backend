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

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

module.exports = router;

