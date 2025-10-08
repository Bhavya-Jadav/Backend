// backend/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');

// Notification Schema
const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['connection_request', 'connection_accepted', 'connection_rejected'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  data: {
    connectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Connection'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

// GET /api/notifications - Get notifications for user
router.get('/', protect, async (req, res) => {
  try {
    const { unreadOnly = false, limit = 50 } = req.query;
    const userId = req.user.userId;

    let query = { recipient: userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('sender', 'name username profilePicture')
      .populate('data.connectionId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      read: false
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/notifications - Mark notification as read
router.put('/', protect, async (req, res) => {
  try {
    const { notificationId, markAllAsRead } = req.body;
    const userId = req.user.userId;

    if (markAllAsRead) {
      await Notification.updateMany(
        { recipient: userId, read: false },
        { read: true }
      );
      res.json({ message: 'All notifications marked as read' });
    } else if (notificationId) {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { read: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ message: 'Notification marked as read', notification });
    } else {
      res.status(400).json({ error: 'Notification ID or markAllAsRead flag required' });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/notifications - Create notification
router.post('/', protect, async (req, res) => {
  try {
    const { recipientId, type, title, message, data } = req.body;
    const userId = req.user.userId;

    const notification = new Notification({
      recipient: recipientId,
      sender: userId,
      type,
      title,
      message,
      data
    });

    await notification.save();
    await notification.populate('sender', 'name username profilePicture');

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
