// backend/routes/connectionRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');

// Connection Schema
const connectionSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  requestMessage: {
    type: String,
    maxlength: 300,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate connection requests
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const Connection = mongoose.models.Connection || mongoose.model('Connection', connectionSchema);

// POST /api/connections - Send connection request
router.post('/', protect, async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const userId = req.user._id; // Fix: use _id instead of userId

    console.log('📤 Connection request - Requester:', userId);
    console.log('📤 Connection request - Recipient:', recipientId);
    console.log('📤 Connection request - Message:', message);

    if (!recipientId) {
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    if (recipientId === userId.toString()) {
      return res.status(400).json({ error: 'Cannot send connection request to yourself' });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: userId, recipient: recipientId },
        { requester: recipientId, recipient: userId }
      ]
    });

    if (existingConnection) {
      return res.status(400).json({ error: 'Connection request already exists' });
    }

    // Create new connection request
    const connection = new Connection({
      requester: userId,
      recipient: recipientId,
      requestMessage: message || ''
    });

    await connection.save();

    // Populate user details for response
    await connection.populate([
      { path: 'requester', select: 'name username profilePicture' },
      { path: 'recipient', select: 'name username profilePicture' }
    ]);

    res.status(201).json({
      message: 'Connection request sent successfully',
      connection
    });
  } catch (error) {
    console.error('❌ Error sending connection request:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/connections - Update connection request (accept/reject)
router.put('/', protect, async (req, res) => {
  try {
    const { connectionId, action } = req.body;
    const userId = req.user._id; // Fix: use _id instead of userId

    console.log('🔄 Update connection - User:', userId);
    console.log('🔄 Update connection - Connection ID:', connectionId);
    console.log('🔄 Update connection - Action:', action);

    if (!connectionId || !action) {
      return res.status(400).json({ error: 'Connection ID and action are required' });
    }

    if (!['accepted', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "accepted" or "rejected"' });
    }

    // Find the connection request
    const connection = await Connection.findOne({
      _id: connectionId,
      recipient: userId,
      status: 'pending'
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    // Update the connection status
    connection.status = action;
    connection.updatedAt = new Date();
    await connection.save();

    // Populate user details for response
    await connection.populate([
      { path: 'requester', select: 'name username profilePicture' },
      { path: 'recipient', select: 'name username profilePicture' }
    ]);

    res.json({
      message: `Connection request ${action} successfully`,
      connection
    });
  } catch (error) {
    console.error('Error updating connection request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/connections - Get connections and connection requests
router.get('/', protect, async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const userId = req.user._id; // Fix: use _id instead of userId

    console.log('📋 Get connections - User:', userId);
    console.log('📋 Get connections - Type:', type);

    let query = {};

    switch (type) {
      case 'sent':
        query = { requester: userId };
        break;
      case 'received':
        query = { recipient: userId, status: 'pending' };
        break;
      case 'accepted':
        query = {
          $or: [
            { requester: userId, status: 'accepted' },
            { recipient: userId, status: 'accepted' }
          ]
        };
        break;
      case 'pending':
        query = {
          $or: [
            { requester: userId, status: 'pending' },
            { recipient: userId, status: 'pending' }
          ]
        };
        break;
      default:
        query = {
          $or: [
            { requester: userId },
            { recipient: userId }
          ]
        };
    }

    const connections = await Connection.find(query)
      .populate('requester', 'name username profilePicture university course year skills')
      .populate('recipient', 'name username profilePicture university course year skills')
      .sort({ createdAt: -1 });

    res.json({
      connections,
      count: connections.length
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
