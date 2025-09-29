// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Middleware to handle file uploads
const fileUpload = require('express-fileupload');

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'File routes working',
    timestamp: new Date().toISOString()
  });
});

// Upload file endpoint
router.post('/upload', (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files were uploaded.' 
      });
    }

    const uploadedFile = req.files.file;
    const uploadPath = path.join(__dirname, '../uploads/', uploadedFile.name);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '../uploads/');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Move the file to uploads directory
    uploadedFile.mv(uploadPath, (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'File upload failed',
          error: err.message 
        });
      }

      res.json({
        success: true,
        message: 'File uploaded successfully',
        filename: uploadedFile.name,
        path: uploadPath
      });
    });

  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during file upload',
      error: error.message 
    });
  }
});

// Download file endpoint
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, '../uploads/', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    // Send file
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('File download error:', err);
        res.status(500).json({ 
          success: false, 
          message: 'File download failed',
          error: err.message 
        });
      }
    });

  } catch (error) {
    console.error('Download route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during file download',
      error: error.message 
    });
  }
});

// List uploaded files
router.get('/list', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../uploads/');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      return res.json({ 
        success: true, 
        files: [] 
      });
    }

    // Read directory contents
    fs.readdir(uploadsDir, (err, files) => {
      if (err) {
        console.error('List files error:', err);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to list files',
          error: err.message 
        });
      }

      // Filter out directories, only return files
      const fileList = files.filter(file => {
        const filePath = path.join(uploadsDir, file);
        return fs.statSync(filePath).isFile();
      });

      res.json({ 
        success: true, 
        files: fileList 
      });
    });

  } catch (error) {
    console.error('List route error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while listing files',
      error: error.message 
    });
  }
});

module.exports = router;
