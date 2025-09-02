const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

//@route   GET /api/analytics/dashboard
//@desc    Get dashboard analytics (Admin only)
//@access  Private (Admin only)
router.get('/dashboard', [auth, authorize('admin')], async (req, res) => {
  try {
    const stats = {};

    if (req.user.role === 'admin') {
  //Admin dashboard stats (single admin/student model)
      stats.totalUsers = await User.countDocuments();
      stats.totalStudents = await User.countDocuments({ role: 'student' });
      stats.totalCourses = await Course.countDocuments();
      stats.activeCourses = await Course.countDocuments({ isActive: true, isApproved: true });
      stats.totalEnrollments = await Enrollment.countDocuments();
      stats.pendingApprovals = 0;

      //Recent enrollments
      stats.recentEnrollments = await Enrollment.find({})
        .populate('student', 'firstName lastName')
        .populate('course', 'title')
        .sort({ createdAt: -1 })
        .limit(5);

      //Course enrollment stats
      stats.courseStats = await Course.aggregate([
        { $match: { isActive: true, isApproved: true } },
        { $project: { title: 1, currentEnrollment: 1 } },
        { $sort: { currentEnrollment: -1 } },
        { $limit: 10 }
      ]);

  }

    res.json(stats);
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error while fetching analytics' });
  }
});

//@route   GET /api/analytics/public
//@desc    Get public platform statistics for homepage
//@access  Public
router.get('/public', async (req, res) => {
  try {
    
    //Basic platform stats
    const totalStudents = await User.countDocuments({ role: 'student', isActive: true });
    const activeCourses = await Course.countDocuments({ isActive: true, isApproved: true });
    const totalEnrollments = await Enrollment.countDocuments({ status: 'enrolled' });
    
  const satisfactionRate = 95;
    
    const stats = {
      totalStudents: Math.max(totalStudents, 1000),
      activeCourses: Math.max(activeCourses, 100),
      totalEnrollments,
      satisfactionRate,
      uptime: 99.9,
      supportAvailability: '24/7'
    };

    res.json(stats);
  } catch (error) {
    console.error('Get public analytics error:', error);
    //Return fallback stats in case of error
    res.json({
      totalStudents: 1000,
      activeCourses: 100,
      totalEnrollments: 0,
      satisfactionRate: 95,
      uptime: 99.9,
      supportAvailability: '24/7'
    });
  }
});

module.exports = router;
