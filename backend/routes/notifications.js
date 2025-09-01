const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

//@route   GET /api/notifications
//@desc    Get user notifications
//@access  Private
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      recipient: req.user._id,
      isDeleted: false 
    })
    .sort({ createdAt: -1 })
    .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
      isDeleted: false
    });

    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
});

//@route   PUT /api/notifications/:id/read
//@desc    Mark notification as read
//@access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ message: 'Server error while marking notification as read' });
  }
});

//@route   PUT /api/notifications/mark-all-read
//@desc    Mark all notifications as read
//@access  Private
router.put('/mark-all-read', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    res.status(500).json({ message: 'Server error while updating notifications' });
  }
});

module.exports = router;