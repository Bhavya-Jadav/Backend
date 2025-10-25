// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const File = require('../models/File');

// Middleware to handle file uploads
const fileUpload = require('express-fileupload');

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'File routes working',
    timestamp: new Date().toISOString()
  });
});

// Upload file endpoint - Store in MongoDB
router.post('/upload', async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No files were uploaded.' 
      });
    }

    const uploadedFile = req.files.file;
    
    // Check file size (MongoDB has 16MB limit for documents)
    // For files > 16MB, you might want to split or use GridFS
    if (uploadedFile.size > 16 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 16MB. For larger files, please compress or use cloud storage.'
      });
    }

    // Convert file to Base64
    const fileData = uploadedFile.data.toString('base64');
    
    // Determine file category
    const fileType = uploadedFile.name.split('.').pop()?.toLowerCase() || 'file';
    let category = 'other';
    if (['pdf', 'doc', 'docx', 'txt'].includes(fileType)) category = 'document';
    else if (['mp4', 'avi', 'mov', 'wmv'].includes(fileType)) category = 'video';
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) category = 'image';

    // Create file document in MongoDB
    const file = new File({
      fileName: `${Date.now()}_${uploadedFile.name}`,
      originalName: uploadedFile.name,
      fileType: fileType,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
      fileData: fileData,
      category: category,
      uploadedBy: req.user?._id || null, // If user authentication exists
      visibility: 'public'
    });

    // Save to MongoDB
    await file.save();

    console.log('✅ File saved to MongoDB:', {
      id: file._id,
      name: file.originalName,
      size: file.fileSize,
      category: file.category
    });

    // Return file metadata in the format expected by frontend
    const fileMetadata = {
      id: file._id,
      fileName: file.fileName,
      originalName: file.originalName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      filePath: `/api/files/view/${file._id}`, // URL to view/download file
      fileUrl: file.fileUrl,
      downloadUrl: file.downloadUrl,
      category: file.category,
      uploadDate: file.uploadDate
    };

    res.json({
      success: true,
      message: 'File uploaded successfully to MongoDB',
      file: fileMetadata  // CompanyDashboard expects 'file' property
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

// View/Stream file endpoint - Retrieve from MongoDB
router.get('/view/:fileId', async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    // Convert Base64 back to Buffer
    const fileBuffer = Buffer.from(file.fileData, 'base64');

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);

    // Send file
    res.send(fileBuffer);

  } catch (error) {
    console.error('View file error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error retrieving file',
      error: error.message 
    });
  }
});

// Download file endpoint - Retrieve from MongoDB
router.get('/download/:fileId', async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }

    // Convert Base64 back to Buffer
    const fileBuffer = Buffer.from(file.fileData, 'base64');

    // Set headers for download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);

    // Send file
    res.send(fileBuffer);

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error downloading file',
      error: error.message 
    });
  }
});

// List uploaded files from MongoDB
router.get('/list', async (req, res) => {
  try {
    // Get all files from MongoDB
    const files = await File.find()
      .select('-fileData') // Exclude file data for performance
      .sort({ uploadDate: -1 }) // Newest first
      .limit(100); // Limit to 100 files

    const fileList = files.map(file => ({
      id: file._id,
      fileName: file.fileName,
      originalName: file.originalName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      category: file.category,
      uploadDate: file.uploadDate,
      fileUrl: file.fileUrl,
      downloadUrl: file.downloadUrl
    }));

    res.json({ 
      success: true, 
      count: fileList.length,
      files: fileList 
    });

  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error listing files',
      error: error.message 
    });
  }
});

// Get file metadata by ID
router.get('/metadata/:fileId', async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId).select('-fileData');

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.json({
      success: true,
      file: {
        id: file._id,
        fileName: file.fileName,
        originalName: file.originalName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        category: file.category,
        uploadDate: file.uploadDate,
        fileUrl: file.fileUrl,
        downloadUrl: file.downloadUrl
      }
    });

  } catch (error) {
    console.error('Get metadata error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving file metadata',
      error: error.message
    });
  }
});

// Delete file from MongoDB
router.delete('/delete/:fileId', async (req, res) => {
  try {
    const file = await File.findByIdAndDelete(req.params.fileId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    console.log('✅ File deleted from MongoDB:', file.originalName);

    res.json({
      success: true,
      message: 'File deleted successfully',
      deletedFile: {
        id: file._id,
        originalName: file.originalName
      }
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message
    });
  }
});

module.exports = router;
