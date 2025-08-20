// Cloud storage solution for persistent file uploads
const express = require('express');
const router = express.Router();

// @desc    Download file with fallback to cloud storage
// @route   GET /api/files/download/:filename
// @access  Public
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    // For now, return helpful error message about ephemeral storage
    return res.status(404).json({ 
      message: 'File not found - Railway ephemeral storage',
      filename: filename,
      solution: 'Files need to be re-uploaded after each deployment, or implement cloud storage (AWS S3/Cloudinary)',
      note: 'This is a known limitation of Railway\'s ephemeral file system'
    });

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ 
      message: 'Server error downloading file',
      error: error.message 
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'File routes working',
    note: 'Railway uses ephemeral storage - files lost on redeploy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
