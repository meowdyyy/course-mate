const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

const router = express.Router();

//List conversations for user
router.get('/conversations', auth, async (req, res) => {
  try {
    const convos = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate('participants', 'firstName lastName role')
      .populate({ path: 'lastMessage', select: 'content sender receiver createdAt isRead attachments' });
    const mapped = convos.map(c => {
      const obj = c.toObject();
      const state = (obj.participantStates || []).find(ps => ps.user.toString() === req.user._id.toString());
      // Build lastRead map
      const lastRead = {};
      (obj.participantStates || []).forEach(ps => { lastRead[ps.user.toString()] = ps.lastReadMessage || null; });
      return { ...obj, unread: state?.unread || 0, lastRead };
    });
    res.json(mapped);
  } catch (e) {
    console.error('List conversations error:', e);
    res.status(500).json({ message: 'Failed to list conversations' });
  }
});

//Get or create 1:1 conversation
router.post('/conversations', auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    if (userId === req.user._id.toString()) return res.status(400).json({ message: 'Cannot chat with self' });
    const other = await User.findById(userId);
    if (!other || !other.isActive) return res.status(404).json({ message: 'User not found' });
  let convo = await Conversation.findOne({ participants: { $all: [req.user._id, userId] }, $expr: { $eq: [{ $size: '$participants' }, 2] } });
    if (!convo) {
      convo = await Conversation.create({ participants: [req.user._id, userId] });
    }
  convo = await convo.populate('participants', 'firstName lastName role');
    res.status(201).json(convo);
  } catch (e) {
    console.error('Get/create conversation error:', e);
    res.status(500).json({ message: 'Failed to get conversation' });
  }
});

//Fetch messages in conversation (paged)
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const convo = await Conversation.findById(id);
    if (!convo || !convo.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const total = await Message.countDocuments({ conversation: id });
  let messages = await Message.find({ conversation: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', 'firstName lastName')
      .populate('receiver', 'firstName lastName');
    //Ensure attachment URL field present (backfill older messages)
    messages = messages.map(m => {
      const obj = m.toObject();
      if (Array.isArray(obj.attachments)) {
        obj.attachments = obj.attachments.map(a => ({
          ...a,
            url: a.url || (a.fileName ? `/uploads/chat/${a.fileName}` : undefined)
        }));
      }
      return obj;
    });
    //Mark unread as read for this page fetch
    const updatedStates = convo.participantStates.map(ps => {
      if (ps.user.toString() === req.user._id.toString()) { ps.unread = 0; ps.lastSeen = new Date(); }
      return ps;
    });
    convo.participantStates = updatedStates;
    await convo.save();
  res.json({ messages: messages.reverse(), pagination: { page, pages: Math.ceil(total / limit), total } });
  } catch (e) {
    console.error('Fetch convo messages error:', e);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

//Mark conversation as read explicitly
router.post('/conversations/:id/read', auth, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.participants.some(p => p.toString() === req.user._id.toString())) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    const lastMessage = await Message.findOne({ conversation: convo._id }).sort({ createdAt: -1 }).select('_id');
    convo.participantStates = convo.participantStates.map(ps => {
      if (ps.user.toString() === req.user._id.toString()) {
        ps.unread = 0; ps.lastSeen = new Date(); ps.lastReadMessage = lastMessage?._id;
      }
      return ps;
    });
    await convo.save();
    res.json({ message: 'Conversation marked read' });
  } catch (e) {
    console.error('Mark read error:', e);
    res.status(500).json({ message: 'Failed to mark read' });
  }
});

const mongoose = require('mongoose');

async function resolveCourse(idOrCode) {
  if (!idOrCode) return null;
  if (mongoose.Types.ObjectId.isValid(idOrCode)) {
    const byId = await Course.findById(idOrCode).select('_id owner courseCode');
    if (byId) return byId;
  }
  const code = idOrCode.toString().trim().toUpperCase();
  return await Course.findOne({ courseCode: code }).select('_id owner courseCode');
}

//Create group conversation (accepts course id or course code)
router.post('/groups', auth, async (req, res) => {
  try {
    const { name, courseId } = req.body;
    console.log('[GroupCreate] user', req.user?._id?.toString(), 'name', name, 'courseId/code', courseId);
    if (!name?.trim()) return res.status(400).json({ message: 'Group name required' });
    if (!courseId) return res.status(400).json({ message: 'courseId or courseCode required' });
    const course = await resolveCourse(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found for id/code ' + courseId });
    // Ensure creator is enrolled or course owner (admin already allowed)
    if (req.user.role === 'student') {
      const Enrollment = require('../models/Enrollment');
      const enrolled = await Enrollment.findOne({ student: req.user._id, course: course._id, status: 'enrolled' });
      if (!enrolled) return res.status(403).json({ message: 'Must be enrolled to create group for this course' });
    }
    const convo = await Conversation.create({
      participants: [req.user._id],
      isGroup: true,
      name: name.trim(),
      creator: req.user._id,
      course: course._id,
      pendingInvites: []
    });
    await convo.populate('participants', 'firstName lastName role');
    res.status(201).json(convo);
  } catch (e) {
    console.error('Create group error:', e);
    res.status(500).json({ message: 'Failed to create group' });
  }
});

//List group conversations for user
router.get('/groups', auth, async (req, res) => {
  try {
    const groups = await Conversation.find({ isGroup: true, participants: req.user._id })
      .populate('participants', 'firstName lastName role')
      .populate('creator', 'firstName lastName')
      .populate({ path: 'lastMessage', select: 'content sender createdAt' })
      .sort({ updatedAt: -1 });
    res.json(groups);
  } catch (e) {
    console.error('List groups error:', e);
    res.status(500).json({ message: 'Failed to list groups' });
  }
});

//List pending group invitations for user
router.get('/group-invites', auth, async (req, res) => {
  try {
    const invites = await Conversation.find({ isGroup: true, pendingInvites: req.user._id })
      .select('name course creator pendingInvites participants createdAt')
      .populate('creator', 'firstName lastName')
      .populate('course', 'title courseCode');
    res.json(invites);
  } catch (e) {
    console.error('List group invites error:', e);
    res.status(500).json({ message: 'Failed to list invites' });
  }
});

//Invite members (creator only) - only course enrolled (or owner/admin) users
router.post('/groups/:id/invite', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberIds = [] } = req.body;
    const convo = await Conversation.findById(id);
    if (!convo || !convo.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (convo.creator.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only creator can invite' });
  const existing = new Set(convo.participants.map(p=>p.toString()));
  const pending = new Set(convo.pendingInvites.map(p=>p.toString()));
  const beforePending = new Set(pending); // track newly added invites
  //Filter memberIds to those enrolled in course (or course owner/admin)
  const course = await Course.findById(convo.course).select('owner');
  const Enrollment = require('../models/Enrollment');
  const enrolls = await Enrollment.find({ course: convo.course, status: 'enrolled', student: { $in: memberIds } }).select('student');
  const allowed = new Set(enrolls.map(e=>e.student.toString()));
  if (course?.owner) allowed.add(course.owner.toString());
  memberIds.forEach(mid => { if (allowed.has(mid) && !existing.has(mid) && mid !== req.user._id.toString()) pending.add(mid); });
    convo.pendingInvites = Array.from(pending);
    await convo.save();
    // Real-time notify newly invited users
    try {
      const io = req.app.get('io');
      if (io) {
        const newlyInvited = convo.pendingInvites.filter(pid => !beforePending.has(pid.toString()));
        if (newlyInvited.length) {
          const invitePayload = await Conversation.findById(convo._id)
            .select('name course creator pendingInvites participants createdAt')
            .populate('creator','firstName lastName')
            .populate('course','title courseCode');
          newlyInvited.forEach(uid => io.to(uid.toString()).emit('group:invited', invitePayload));
        }
      }
    } catch (_) {}
    res.json({ message: 'Invites sent', pendingInvites: convo.pendingInvites });
  } catch (e) {
    console.error('Invite error:', e);
    res.status(500).json({ message: 'Failed to invite members' });
  }
});

//Respond to invite (accept/reject)
router.post('/groups/:id/respond', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; //'accept' | 'reject'
    const convo = await Conversation.findById(id);
    if (!convo || !convo.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (!convo.pendingInvites.map(p=>p.toString()).includes(req.user._id.toString())) return res.status(403).json({ message: 'No pending invite' });
    if (action === 'accept') {
      convo.participants.push(req.user._id);
    }
    convo.pendingInvites = convo.pendingInvites.filter(p => p.toString() !== req.user._id.toString());
    await convo.save();
    // Broadcast updated group to participants + creator + remaining pending invites
    try {
      const io = req.app.get('io');
      if (io) {
        const updated = await Conversation.findById(convo._id)
          .populate('participants','firstName lastName role')
          .populate('creator','firstName lastName')
          .populate({ path: 'lastMessage', select: 'content sender createdAt' });
        const targets = new Set([
          ...updated.participants.map(p=>p._id.toString()),
          updated.creator?.toString?.() || '',
          ...updated.pendingInvites.map(p=>p.toString())
        ].filter(Boolean));
        targets.forEach(uid => io.to(uid).emit('group:updated', updated));
      }
    } catch (_) {}
    res.json({ message: 'Response recorded', joined: action === 'accept' });
  } catch (e) {
    console.error('Respond invite error:', e);
    res.status(500).json({ message: 'Failed to respond' });
  }
});

//Leave group (not creator)
router.post('/groups/:id/leave', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const convo = await Conversation.findById(id);
    if (!convo || !convo.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (!convo.participants.map(p=>p.toString()).includes(req.user._id.toString())) return res.status(403).json({ message: 'Not a participant' });
    if (convo.creator.toString() === req.user._id.toString()) return res.status(400).json({ message: 'Creator cannot leave; delete group instead' });
    convo.participants = convo.participants.filter(p => p.toString() !== req.user._id.toString());
    convo.participantStates = (convo.participantStates||[]).filter(ps => ps.user.toString() !== req.user._id.toString());
    await convo.save();
    // Notify remaining participants about membership change
    try {
      const io = req.app.get('io');
      if (io) {
        const updated = await Conversation.findById(convo._id)
          .populate('participants','firstName lastName role')
          .populate('creator','firstName lastName')
          .populate({ path: 'lastMessage', select: 'content sender createdAt' });
        updated.participants.forEach(p => io.to(p._id.toString()).emit('group:updated', updated));
      }
    } catch (_) {}
    res.json({ message: 'Left group' });
  } catch (e) {
    console.error('Leave group error:', e);
    res.status(500).json({ message: 'Failed to leave group' });
  }
});

//Delete group (creator only)
router.delete('/groups/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const convo = await Conversation.findById(id);
    if (!convo || !convo.isGroup) return res.status(404).json({ message: 'Group not found' });
    if (convo.creator.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only creator can delete group' });
    const participantIds = convo.participants.map(p=>p.toString());
    const pendingIds = (convo.pendingInvites||[]).map(p=>p.toString());
    await convo.deleteOne();
    // Notify members & pending invitees of deletion
    try {
      const io = req.app.get('io');
      if (io) {
        [...participantIds, ...pendingIds].forEach(uid => io.to(uid).emit('group:deleted', { groupId: id }));
      }
    } catch (_) {}
    res.json({ message: 'Group deleted' });
  } catch (e) {
    console.error('Delete group error:', e);
    res.status(500).json({ message: 'Failed to delete group' });
  }
});

//Search users (for group creation) with optional course enrollment filter
//GET /api/chat/search-users?q=term&courseId=123&limit=10
router.get('/search-users', auth, async (req, res) => {
  try {
    const { q, courseId } = req.query;
    let limit = parseInt(req.query.limit) || 10; limit = Math.min(limit, 50);
    const query = { isActive: true, _id: { $ne: req.user._id } };
    if (courseId) {
      const course = await resolveCourse(courseId);
      if (course) {
        const enrolls = await Enrollment.find({ course: course._id, status: 'enrolled' }).select('student');
        const ids = new Set(enrolls.map(e=>e.student.toString()));
        if (course?.owner) ids.add(course.owner.toString());
        query._id.$in = Array.from(ids);
      } else {
        return res.json([]);
      }
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim(), 'i');
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex }
      ];
    }
    const users = await User.find(query)
      .select('firstName lastName email role')
      .sort({ firstName: 1 })
      .limit(limit);
    res.json(users);
  } catch (e) {
    console.error('Search users error:', e);
    res.status(500).json({ message: 'Failed to search users' });
  }
});

//Send message with optional attachments via REST (alternative to socket) - multipart/form-data
const { chatUpload } = require('../middleware/upload');
router.post('/conversations/:id/message', auth, (req, res) => {
  chatUpload(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ message: err.message || 'Upload error' });
      const convo = await Conversation.findById(req.params.id);
      if (!convo || !convo.participants.some(p => p.toString() === req.user._id.toString())) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      const { content } = req.body;
      if ((!content || !content.trim()) && (!req.files || req.files.length === 0)) {
        return res.status(400).json({ message: 'Content or at least one attachment required' });
      }
      const attachments = (req.files || []).map(f => ({
        originalName: f.originalname,
        fileName: f.filename,
        mimeType: f.mimetype,
        size: f.size,
        url: `/uploads/chat/${f.filename}`
      }));
      const Message = require('../models/Message');
      const msg = await Message.create({ sender: req.user._id, conversation: convo._id, content: content?.trim(), attachments });
      convo.lastMessage = msg._id;
      convo.participantStates = (convo.participantStates || []).map(ps => {
        if (ps.user.toString() === req.user._id.toString()) { ps.lastSeen = new Date(); ps.lastReadMessage = msg._id; }
        else { ps.unread = (ps.unread || 0) + 1; }
        return ps;
      });
      await convo.save();
      const fullMsg = await Message.findById(msg._id).populate('sender','firstName lastName');
      //Emit via socket if server running
      try {
        const io = req.app.get('io');
        if (io) {
          convo.participants.forEach(p => io.to(p.toString()).emit('chat:message', { conversationId: convo._id, message: fullMsg }));
          const unreadMap = convo.participantStates.reduce((acc, ps) => { acc[ps.user.toString()] = ps.unread; return acc; }, {});
          convo.participants.forEach(p => io.to(p.toString()).emit('chat:unread', { conversationId: convo._id, unread: unreadMap }));
        }
      } catch (_) {}
      res.status(201).json(fullMsg);
    } catch (e) {
      console.error('Send message w/attach error:', e);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });
});

module.exports = router;
