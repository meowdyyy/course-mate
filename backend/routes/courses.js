const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { auth, authorize } = require('../middleware/auth');
const { applyRewards, expRequiredForLevel } = require('./gamification');

const router = express.Router();

//@route   GET /api/courses
//@desc    Get all courses with filtering and pagination
//@access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().trim(),
  query('level').optional().isIn(['Beginner', 'Intermediate', 'Advanced']),
  query('search').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    //Build filter object
    let filter = { isActive: true };
    
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    if (req.query.level) {
      filter.level = req.query.level;
    }
    
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { courseCode: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    //Get courses with pagination
    const courses = await Course.find(filter)
      .populate('owner', 'firstName lastName email')
      .select('-materials')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(filter);

    console.log(`Found ${courses.length} courses out of ${total} total`); // Debug log

    res.json({
      courses,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ message: 'Server error while fetching courses' });
  }
});

//@route   GET /api/courses/resources
//@desc    Browse all approved student resources across courses with filters
//@access  Private (logged in)
router.get('/resources', auth, async (req, res) => {
  try {
    const { q, courseCode, semester, minRating, sort = 'recent', page = 1, limit = 12 } = req.query;
    const pg = Math.max(parseInt(page) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit) || 12, 1), 50);
    //Build course match
    const courseMatch = {};
    if (courseCode) courseMatch.courseCode = { $regex: courseCode, $options: 'i' };
    if (q) {
      courseMatch.$or = [
        { title: { $regex: q, $options: 'i' } },
        { courseCode: { $regex: q, $options: 'i' } }
      ];
    }

  //Aggregate approved student resources from courses
  const pipeline = [
  { $match: courseMatch },
  { $project: { courseCode: 1, title: 1, semester: 1, studentResources: 1 } },
  { $unwind: '$studentResources' },
  { $match: { 'studentResources.isApproved': true } },
  ...(semester ? [{ $match: { 'studentResources.semester': { $regex: semester, $options: 'i' } } }] : []),
      //Compute rating stats
      { $addFields: {
        'studentResources.averageRating': { $cond: [ { $gt: [ { $size: { $ifNull: ['$studentResources.ratings', []] } }, 0 ] }, { $round: [ { $divide: [ { $sum: '$studentResources.ratings.value' }, { $size: '$studentResources.ratings' } ] }, 2 ] }, null ] },
        'studentResources.ratingsCount': { $size: { $ifNull: ['$studentResources.ratings', []] } }
      } },
    ];

    if (minRating) {
      pipeline.push({ $match: { 'studentResources.averageRating': { $gte: parseFloat(minRating) } } });
    }

    //Sorting
    const sortStage = (() => {
      switch (sort) {
        case 'rating': return { 'studentResources.averageRating': -1, 'studentResources.ratingsCount': -1 };
        case 'oldest': return { 'studentResources.uploadDate': 1 };
        default: return { 'studentResources.uploadDate': -1 }; // recent
      }
    })();
    pipeline.push({ $sort: sortStage });

    //Facet for pagination
    pipeline.push({ $facet: {
      metadata: [ { $count: 'total' } ],
      data: [ { $skip: (pg - 1) * lim }, { $limit: lim } ]
    }});

    const results = await Course.aggregate(pipeline);
    const total = results[0]?.metadata[0]?.total || 0;
    const data = (results[0]?.data || []).map(r => ({
      courseTitle: r.title,
      courseCode: r.courseCode,
      semester: r.semester,
      ...r.studentResources,
    }));
    //Fetch verified (admin) materials for same course match (not paginated)
    const verifiedCourses = await Course.find(courseMatch).select('title courseCode materials');
    const verifiedResources = [];
    verifiedCourses.forEach(c => {
      (c.materials || []).forEach(m => {
        verifiedResources.push({
          _id: m._id,
          title: m.title,
          type: m.type,
          url: m.url,
          filename: m.filename,
          description: m.description,
          isFree: m.isFree,
          uploadDate: m.uploadDate,
          courseTitle: c.title,
          courseCode: c.courseCode,
          isVerified: true
        });
      });
    });
    verifiedResources.sort((a,b)=> new Date(b.uploadDate||0) - new Date(a.uploadDate||0));
    //Distinct semesters across all approved resources (not limited by pagination)
    const semestersAgg = await Course.aggregate([
      { $unwind: '$studentResources' },
      { $match: { 'studentResources.isApproved': true, 'studentResources.semester': { $exists: true, $ne: '' } } },
      { $group: { _id: '$studentResources.semester' } },
      { $sort: { _id: 1 } }
    ]);
    const semesters = semestersAgg.map(s => s._id);
  res.json({ verifiedResources, resources: data, semesters, pagination: { page: pg, limit: lim, total, pages: Math.ceil(total/lim) } });
  } catch (e) {
    console.error('Browse resources error:', e.message);
    res.status(500).json({ message: 'Server error browsing resources' });
  }
});

//@route   GET /api/courses/:id
//@desc    Get single course by ID
//@access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('owner', 'firstName lastName email profileImage');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json(course);
  } catch (error) {
    console.error('Get course error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Course not found' });
    }
    res.status(500).json({ message: 'Server error while fetching course' });
  }
});

//@route   POST /api/courses
//@desc    Create a new course
//@access  Private (Admin only)
router.post('/', [
  auth,
  authorize('admin'),
  body('title').trim().notEmpty().withMessage('Course title is required'),
  body('description').trim().notEmpty().withMessage('Course description is required'),
  body('courseCode').trim().notEmpty().withMessage('Course code is required'),
  body('credits').isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10'),
  body('category').notEmpty().withMessage('Category is required'),
  body('level').isIn(['Beginner', 'Intermediate', 'Advanced']).withMessage('Invalid level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

  const existingCourse = await Course.findOne({ courseCode: req.body.courseCode.toUpperCase() });
    
    if (existingCourse) {
      return res.status(400).json({ message: 'Course code already exists' });
    }

    //Create course
    const courseData = {
      ...req.body,
  owner: req.user._id,
      courseCode: req.body.courseCode.toUpperCase(),
      isApproved: true
    };

    const course = new Course(courseData);
    await course.save();

  await course.populate('owner', 'firstName lastName email');

    res.status(201).json({
  message: 'Course created successfully.',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ message: 'Server error while creating course' });
  }
});

//@route   POST /api/courses/:id/material
//@desc    Add material to a course
//@access  Private
router.post('/:id/material', [
  auth,
  authorize('admin'),
  body('title').notEmpty().withMessage('Title is required'),
  body('type').isIn(['pdf', 'video', 'link', 'document', 'note']).withMessage('Invalid material type'),
  body('url').notEmpty().withMessage('URL is required'),
  body('isFree').optional().isBoolean().withMessage('isFree must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { title, type, url, filename, description, isFree = false } = req.body;

    //Find the course by ID
    let course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Not authorized' });

    //Add the new material to the course
    const material = {
      title,
      type,
      url,
      filename,
      description,
      isFree,
      uploadDate: new Date()
    };

    course.materials.push(material);

    //Save the updated course
    await course.save();

    //Notify enrolled students (excluding admin uploader) about new material
    try {
      const Enrollment = require('../models/Enrollment');
      const Notification = require('../models/Notification');
      const enrollments = await Enrollment.find({ course: course._id, status: 'enrolled' }).select('student');
      const recipientIds = enrollments.map(e => e.student.toString()).filter(id => id !== req.user._id.toString());
      if (recipientIds.length) {
        const createdNotifs = await Promise.all(
          recipientIds.map(rid => Notification.createNotification({
            recipient: rid,
            title: 'New Course Material',
            message: `"${title}" was added to ${course.title}.`,
            type: 'resource_uploaded',
            targetId: course._id,
            targetUrl: `/courses/${course._id}`
          }))
        );
        //Real-time push via socket to each recipient (already handled by post-save hook, but ensure immediate emit list if needed)
        const io = req.app.get('io');
        if (io) {
          createdNotifs.forEach(n => {
            io.to(n.recipient.toString()).emit('notification:new', n);
          });
        }
      }
    } catch (notifyErr) {
      console.warn('Material notification error:', notifyErr.message);
    }

    res.json({
      message: 'Material added successfully',
      material: course.materials[course.materials.length - 1]
    });
  } catch (error) {
    console.error('Add material error:', error);
    res.status(500).json({ message: 'Server error while adding material' });
  }
});

//@route   POST /api/courses/:id/student-resources
//@desc    Add a student-contributed resource (must be enrolled)
//@access  Private (students/instructors/admin) but must be enrolled if student
router.post('/:id/student-resources', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('type').isIn(['pdf', 'video', 'link', 'document', 'note']).withMessage('Invalid resource type'),
  body('url').optional().isString(),
  body('filename').optional().isString(),
  body('description').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

  const { id } = req.params;
  const { title, type, url, filename, description, semester } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'URL is required (upload a file or provide a link)' });
    }

    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    //If user is a student they must be enrolled
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({ student: req.user._id, course: id, status: 'enrolled' });
      if (!enrollment) return res.status(403).json({ message: 'You must be enrolled to add resources' });
    }

    //Semester required: Spring|Summer|Fall <Year>
    if (!semester || !/^(Spring|Summer|Fall)\s+\d{4}$/.test(semester)) {
      return res.status(400).json({ message: 'Semester must be Spring <Year>, Summer <Year>, or Fall <Year>' });
    }

    const resource = {
      title,
      type,
      url,
      filename,
      description,
      semester: semester.trim(),
      uploadedBy: req.user._id,
      uploadDate: new Date(),
      isApproved: req.user.role !== 'student', //auto approve if not student
      approvedBy: req.user.role !== 'student' ? req.user._id : undefined,
      approvedAt: req.user.role !== 'student' ? new Date() : undefined
    };

    course.studentResources.push(resource);
    await course.save();

    // Reward uploader: +30 coins and +10% EXP
    try {
      const User = require('../models/User');
      const u = await User.findById(req.user._id).select('level');
      const need = expRequiredForLevel(u?.level || 0);
      await applyRewards(req.user._id, { coinsDelta: 30, expDelta: Math.round(0.10 * need) });
    } catch (e) { console.warn('Apply resource reward failed:', e.message); }

    //Notify admins for approval if student uploaded
    if (req.user.role === 'student') {
      try {
        const Notification = require('../models/Notification');
        await Notification.notifyAdmins('Resource Pending Approval', `${req.user.firstName || 'A student'} submitted a resource for ${course.title}.`, 'resource_uploaded', { targetId: course._id, targetUrl: `/courses/${course._id}` });
      } catch (e) { console.warn('Notify admins resource upload failed:', e.message); }
    }

  const saved = course.studentResources[course.studentResources.length - 1];
  const ratings = saved.ratings || [];
  const averageRating = ratings.length ? Number((ratings.reduce((s, k) => s + k.value, 0) / ratings.length).toFixed(2)) : null;
  const ratingsCount = ratings.length;
  res.status(201).json({ message: 'Resource added successfully', resource: { ...saved.toObject(), averageRating, ratingsCount, currentUserRating: null } });
  } catch (error) {
    console.error('Add student resource error:', error);
    res.status(500).json({ message: 'Server error while adding resource' });
  }
});

//@route   GET /api/courses/:id/student-resources
//@desc    List student contributed resources (students must be enrolled; admin sees all)
//@access  Private
router.get('/:id/student-resources', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const course = await Course.findById(id).populate('studentResources.uploadedBy', 'firstName lastName role');
    if (!course) return res.status(404).json({ message: 'Course not found' });

    //Access rules
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({ student: req.user._id, course: id, status: 'enrolled' });
      if (!enrollment) return res.status(403).json({ message: 'You must be enrolled to view resources' });
    }

    let resources = course.studentResources || [];
    //Only show approved to students; admin sees all
    if (req.user.role === 'student') {
      resources = resources.filter(r => r.isApproved);
    }
    const total = resources.length;
    const start = (page - 1) * limit;
    const paged = resources.slice(start, start + limit);

    //Compute aggregates & strip heavy arrays (optional)
    const responseResources = paged.map(r => {
      const obj = r.toObject({ getters: true, virtuals: true });
      const ratings = r.ratings || [];
      const averageRating = ratings.length ? Number((ratings.reduce((s, k) => s + k.value, 0) / ratings.length).toFixed(2)) : null;
      const ratingsCount = ratings.length;
      const currentUserRatingDoc = ratings.find(rt => rt.user?.toString() === req.user._id.toString());
      const currentUserRating = currentUserRatingDoc ? currentUserRatingDoc.value : null;
      //Not exposing full ratings/comments arrays in list view to reduce payload size
      delete obj.ratings;
      delete obj.comments;
      return { ...obj, averageRating, ratingsCount, currentUserRating };
    });

    res.json({ resources: responseResources, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get student resources error:', error);
    res.status(500).json({ message: 'Server error fetching resources' });
  }
});

//@route   DELETE /api/courses/:id/student-resources/:resourceId
//@desc    Delete a student resource (owner or admin)
//@access  Private
router.delete('/:id/student-resources/:resourceId', auth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const resource = course.studentResources.id(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

  //Permission for uploader or admin
  if (resource.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this resource' });
    }

  //Remove subdocument safely (resource may be plain object if lean or version diff)
  course.studentResources = course.studentResources.filter(r => r._id.toString() !== resourceId);
  await course.save();

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Delete student resource error:', error);
    res.status(500).json({ message: 'Server error deleting resource' });
  }
});

//@route   PATCH /api/courses/:id/student-resources/:resourceId
//@desc    Edit a student resource (owner before approval; admin anytime; students cannot edit after approval)
//@access  Private
router.patch('/:id/student-resources/:resourceId', auth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
  const { title, type, url, description, semester } = req.body;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const resource = course.studentResources.id(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    const isOwner = resource.uploadedBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'admin';

  if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to edit this resource' });
    }
    if (isOwner && resource.isApproved && req.user.role === 'student') {
      return res.status(403).json({ message: 'Approved resources cannot be edited by the student uploader' });
    }

    if (title) resource.title = title;
    if (type) resource.type = type;
    if (url) resource.url = url;
    if (description !== undefined) resource.description = description;
    if (semester) {
      if (!/^(Spring|Summer|Fall)\s+\d{4}$/.test(semester)) return res.status(400).json({ message: 'Semester must be Spring <Year>, Summer <Year>, or Fall <Year>' });
      resource.semester = semester.trim();
    }
    //Editing resets approval if edited by student
    if (req.user.role === 'student') {
      resource.isApproved = false;
      resource.approvedBy = undefined;
      resource.approvedAt = undefined;
    }

    await course.save();
  const ratings = resource.ratings || [];
  const averageRating = ratings.length ? Number((ratings.reduce((s, k) => s + k.value, 0) / ratings.length).toFixed(2)) : null;
  const ratingsCount = ratings.length;
  const currentUserRatingDoc = ratings.find(rt => rt.user?.toString() === req.user._id.toString());
  res.json({ message: 'Resource updated', resource: { ...resource.toObject(), averageRating, ratingsCount, currentUserRating: currentUserRatingDoc ? currentUserRatingDoc.value : null } });
  } catch (error) {
    console.error('Edit student resource error:', error);
    res.status(500).json({ message: 'Server error updating resource' });
  }
});

//@route   POST /api/courses/:id/student-resources/:resourceId/approve
//@desc    Approve a student resource (admin only)
//@access  Private (Admin only)
router.post('/:id/student-resources/:resourceId/approve', auth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const resource = course.studentResources.id(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to approve this resource' });
    }

    resource.isApproved = true;
    resource.approvedBy = req.user._id;
    resource.approvedAt = new Date();
    await course.save();
    //Notify enrolled students about newly approved resource
    try {
      const Enrollment = require('../models/Enrollment');
      const Notification = require('../models/Notification');
      const enrollments = await Enrollment.find({ course: course._id, status: 'enrolled' }).select('student');
      const recipientIds = enrollments.map(e => e.student.toString());
      await Promise.all(recipientIds.map(rid => Notification.createNotification({
        recipient: rid,
        title: 'New Approved Resource',
        message: `"${resource.title}" is now available in ${course.title}.`,
        type: 'resource_uploaded',
        targetId: course._id,
        targetUrl: `/courses/${course._id}`
      })));
    } catch (e) { console.warn('Notify enrolled on resource approval failed:', e.message); }
    //Notify uploader
    try {
      const Notification = require('../models/Notification');
      await Notification.createNotification({
        recipient: resource.uploadedBy,
        title: 'Resource Approved',
        message: `Your resource "${resource.title}" was approved.`,
        type: 'resource_approved',
        targetId: course._id,
        targetUrl: `/courses/${course._id}`
      });
    } catch (e) { console.warn('Notify resource approved failed:', e.message); }
  const ratings = resource.ratings || [];
  const averageRating = ratings.length ? Number((ratings.reduce((s, k) => s + k.value, 0) / ratings.length).toFixed(2)) : null;
  const ratingsCount = ratings.length;
  const currentUserRatingDoc = ratings.find(rt => rt.user?.toString() === req.user._id.toString());
  res.json({ message: 'Resource approved', resource: { ...resource.toObject(), averageRating, ratingsCount, currentUserRating: currentUserRatingDoc ? currentUserRatingDoc.value : null } });
  } catch (error) {
    console.error('Approve student resource error:', error);
    res.status(500).json({ message: 'Server error approving resource' });
  }
});

//@route   POST /api/courses/:id/student-resources/:resourceId/reject
//@desc    Reject (remove) a student resource
//@access  Private (admin only)
router.post('/:id/student-resources/:resourceId/reject', auth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const resource = course.studentResources.id(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to reject this resource' });
    }

    const uploaderId = resource.uploadedBy;
    const title = resource.title;
    resource.remove();
    await course.save();
    //Notify uploader
    try {
      const Notification = require('../models/Notification');
      await Notification.createNotification({
        recipient: uploaderId,
        title: 'Resource Rejected',
        message: `Your resource "${title}" was rejected and removed.`,
        type: 'resource_rejected'
      });
    } catch (e) { console.warn('Notify resource rejected failed:', e.message); }
    res.json({ message: 'Resource rejected and removed' });
  } catch (error) {
    console.error('Reject student resource error:', error);
    res.status(500).json({ message: 'Server error rejecting resource' });
  }
});

//@route   POST /api/courses/:id/student-resources/:resourceId/rate
//@desc    Add or update a rating for a student resource (enrolled student or admin)
//@access  Private
router.post('/:id/student-resources/:resourceId/rate', auth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const { value } = req.body;
    if (![1,2,3,4,5].includes(Number(value))) {
      return res.status(400).json({ message: 'Rating value must be 1-5' });
    }
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const resource = course.studentResources.id(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    //Enrollment check for students
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({ student: req.user._id, course: id, status: 'enrolled' });
      if (!enrollment) return res.status(403).json({ message: 'You must be enrolled to rate' });
      if (!resource.isApproved) return res.status(403).json({ message: 'Cannot rate unapproved resource' });
    }
    //One rating per user
    const existing = resource.ratings.find(r => r.user.toString() === req.user._id.toString());
    if (existing) {
      existing.value = value;
      existing.updatedAt = new Date();
    } else {
      resource.ratings.push({ user: req.user._id, value });
    }
    await course.save();
    const avg = resource.ratings.length ? (resource.ratings.reduce((s,r)=>s+r.value,0) / resource.ratings.length).toFixed(2) : null;
  res.json({ message: 'Rating saved', averageRating: avg, ratingsCount: resource.ratings.length });
  } catch (error) {
    console.error('Rate resource error:', error);
    res.status(500).json({ message: 'Server error rating resource' });
  }
});

//@route   POST /api/courses/:id/student-resources/:resourceId/comments
//@desc    Add a comment to a student resource (enrolled student or admin)
//@access  Private
router.post('/:id/student-resources/:resourceId/comments', auth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Comment text required' });
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const resource = course.studentResources.id(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({ student: req.user._id, course: id, status: 'enrolled' });
      if (!enrollment) return res.status(403).json({ message: 'You must be enrolled to comment' });
      if (!resource.isApproved) return res.status(403).json({ message: 'Cannot comment on unapproved resource' });
    }
    resource.comments.push({ user: req.user._id, text: text.trim() });
    try {
      await course.save();
    } catch (saveErr) {
      console.error('Comment save validation error:', saveErr);
      return res.status(500).json({ message: 'Server error adding comment (save failed)' });
    }
    //Populate user names for the last slice
    try {
      await resource.populate('comments.user', 'firstName lastName');
    } catch (popErr) {
      console.warn('Comment populate warning:', popErr.message);
    }
    res.status(201).json({ message: 'Comment added', comments: resource.comments.slice(-10) });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

//@route   GET /api/courses/:id/student-resources/:resourceId/comments
//@desc    List comments (paginated) for a resource
//@access  Private (enrolled student or admin)
router.get('/:id/student-resources/:resourceId/comments', auth, async (req, res) => {
  try {
    const { id, resourceId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const course = await Course.findById(id).populate('studentResources.comments.user', 'firstName lastName');
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const resource = course.studentResources.id(resourceId);
    if (!resource) return res.status(404).json({ message: 'Resource not found' });
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({ student: req.user._id, course: id, status: 'enrolled' });
      if (!enrollment) return res.status(403).json({ message: 'You must be enrolled to view comments' });
      if (!resource.isApproved) return res.status(403).json({ message: 'Cannot view comments on unapproved resource' });
    }
    const comments = resource.comments || [];
    const total = comments.length;
    const start = (page - 1) * limit;
    const paged = comments.slice(start, start + limit);
    res.json({ comments: paged, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error fetching comments' });
  }
});

//@route   PUT /api/courses/:id/material/:materialId
//@desc    Update a course material
//@access  Private
router.put('/:id/material/:materialId', [
  auth,
  authorize('admin'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('type').optional().isIn(['pdf', 'video', 'link', 'document', 'note']).withMessage('Invalid material type'),
  body('url').optional().notEmpty().withMessage('URL cannot be empty'),
  body('isFree').optional().isBoolean().withMessage('isFree must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation errors', 
        errors: errors.array() 
      });
    }

    const { id, materialId } = req.params;
    const updates = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    //Only admin can update materials
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update materials in this course' });
    }

    const material = course.materials.id(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    //Update material fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        material[key] = updates[key];
      }
    });

    await course.save();

    res.json({
      message: 'Material updated successfully',
      material
    });
  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ message: 'Server error while updating material' });
  }
});

//@route   DELETE /api/courses/:id/material/:materialId
//@desc    Delete a course material
//@access  Private
router.delete('/:id/material/:materialId', [auth, authorize('admin')], async (req, res) => {
  try {
    const { id, materialId } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    //Only admin can delete materials (instructor role removed)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete materials from this course' });
    }

    const material = course.materials.id(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    course.materials.pull(materialId);
    await course.save();

    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ message: 'Server error while deleting material' });
  }
});

//@route   PUT /api/courses/:id/approve
//@desc    Approve a course
//@access  Private (Admin only)
router.put('/:id/approve', [auth, authorize('admin')], async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isApproved: true },
      { new: true }
    ).populate('instructor', 'firstName lastName email');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.json({
      message: 'Course approved successfully',
      course
    });
  } catch (error) {
    console.error('Approve course error:', error);
    res.status(500).json({ message: 'Server error while approving course' });
  }
});

//@route   GET /api/courses/pending
//@desc    Get pending courses for approval
//@access  Private (Admin only)
router.get('/pending', [auth, authorize('admin')], async (req, res) => {
  try {
    const pendingCourses = await Course.find({ 
      isApproved: false,
      isActive: true 
    })
    .populate('instructor', 'firstName lastName email')
    .sort({ createdAt: -1 });

    res.json(pendingCourses);
  } catch (error) {
    console.error('Get pending courses error:', error);
    res.status(500).json({ message: 'Server error while fetching pending courses' });
  }
});

//@route   GET /api/courses/:id/performance
//@desc    Get course performance metrics (admin only after instructor removal)
//@access  Private (Admin only)

module.exports = router;