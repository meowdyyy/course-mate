const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

//Helper function to get document type labels
const getDocumentTypeLabel = (type) => {
  const labels = {
    degree_certificate: 'Degree Certificate',
    teaching_certificate: 'Teaching Certificate',
    id_proof: 'ID Proof',
    experience_letter: 'Experience Letter',
    other: 'Other Document'
  };
  return labels[type] || type;
};

//@route   GET /api/users
//@desc    Get all users (Admin only)
//@access  Private (Admin)
router.get('/', [auth, authorize('admin')], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const role = req.query.role;

    let filter = {};
  if (role && ['student', 'admin'].includes(role)) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

//@route   PUT /api/users/:id/approve
//@desc    Approve user account
//@access  Private (Admin)
router.put('/:id/approve', [auth, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    //Create approval notification for the user
    const Notification = require('../models/Notification');
    await Notification.createNotification({
      recipient: user._id,
      title: 'Account Approved',
      message: `Your ${user.role} account has been approved by an administrator. You can now access all features.`,
      type: 'user_approved',
      targetUrl: '/dashboard',
      actionRequired: false
    });

    res.json({
      message: 'User approved successfully',
      user
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: 'Server error while approving user' });
  }
});

//@route   PUT /api/users/:id/deactivate
//@desc    Deactivate user account
//@access  Private (Admin)
router.put('/:id/deactivate', [auth, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deactivated successfully',
      user
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Server error while deactivating user' });
  }
});

//@route   GET /api/users/pending-approval
//@desc    Get users pending approval
//@access  Private (Admin)

//@route   GET /api/users/:id/profile
//@desc    Get detailed user profile for admin review
//@access  Private (Admin only)
router.get('/:id/profile', [auth, authorize('admin')], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error while fetching user profile' });
  }
});

// @route   GET /api/users/pending-verification
// @desc    Get instructors pending document verification
// @access  Private (Admin only)

// @route   PUT /api/users/reset-documents
// @desc    Reset document verification status for reupload
// @access  Private (Instructor only)

module.exports = router;
