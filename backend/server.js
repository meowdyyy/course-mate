// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const path = require('path');

// // Load environment variables
// dotenv.config();

// // Import routes
// const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users');
// const courseRoutes = require('./routes/courses');
// const enrollmentRoutes = require('./routes/enrollments');
// // Removed assignment, submission, attendance, grade features
// const notificationRoutes = require('./routes/notifications');
// const analyticsRoutes = require('./routes/analytics');
// const uploadRoutes = require('./routes/upload');
// const chatRoutes = require('./routes/chat');
// const todoRoutes = require('./routes/todos');
// const aiRoutes = require('./routes/ai');
// const quizRoutes = require('./routes/quizzes');
// const { router: gamificationRoutes } = require('./routes/gamification');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST','PUT','PATCH','DELETE'] }
// });
// // Make io accessible in routes
// app.set('io', io);
// // Also set global reference for model hooks (lightweight)
// global._io = io;

// // Middleware
// app.use(cors({
//   origin: process.env.CLIENT_URL || 'http://localhost:3000',
//   credentials: true
// }));
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Static file serving for uploads
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/courses', courseRoutes);
// app.use('/api/enrollments', enrollmentRoutes);
// // Removed /api/assignments, /api/submissions, /api/attendance, /api/grades endpoints
// // Removed legacy /api/messages (inbox) feature; real-time chat remains via /api/chat
// app.use('/api/notifications', notificationRoutes);
// app.use('/api/analytics', analyticsRoutes);
// app.use('/api/upload', uploadRoutes);
// app.use('/api/chat', chatRoutes);
// app.use('/api/todos', todoRoutes);
// app.use('/api/ai', aiRoutes);
// app.use('/api/quizzes', quizRoutes);
// app.use('/api/gamification', gamificationRoutes);

// // Development helper: list all routes (skip in production)
// if (process.env.NODE_ENV !== 'production') {
//   app.get('/api/_debug/routes', (req, res) => {
//     const list = [];
//     const stack = app._router.stack;
//     stack.forEach(mw => {
//       if (mw.route && mw.route.path) {
//         const methods = Object.keys(mw.route.methods).join(',').toUpperCase();
//         list.push({ path: mw.route.path, methods });
//       } else if (mw.name === 'router' && mw.handle.stack) {
//         mw.handle.stack.forEach(r => {
//           if (r.route) {
//             const methods = Object.keys(r.route.methods).join(',').toUpperCase();
//             list.push({ path: r.route.path, methods });
//           }
//         });
//       }
//     });
//     res.json({ routes: list });
//   });
//   // Simple migration helper to set owner where missing
//   app.post('/api/_debug/migrate/owner', async (req, res) => {
//     try {
//       const Course = require('./models/Course');
//       const courses = await Course.find({ $or: [{ owner: { $exists: false } }, { owner: null }] });
//       let updated = 0;
//       for (const c of courses) {
//         if (!c.owner && c._doc.instructor) { c.owner = c._doc.instructor; await c.save(); updated++; }
//       }
//       res.json({ message: 'Migration complete', updated });
//     } catch (e) {
//       console.error('Owner migration error:', e);
//       res.status(500).json({ message: 'Migration failed', error: e.message });
//     }
//   });
// }

// // Health check
// app.get('/api/health', (req, res) => {
//   res.status(200).json({
//     message: 'Server is running!',
//     timestamp: new Date().toISOString()
//   });
// });

// // Root route: provide a friendly response or redirect to health check so
// // requests to the service root don't return the generic 404 handler below.
// app.get('/', (req, res) => {
//   // Prefer redirect to the health endpoint so deploy tools and browsers
//   // can quickly verify the service status.
//   res.redirect('/api/health');
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({
//     message: 'Something went wrong!',
//     error: process.env.NODE_ENV === 'development' ? err.message : {}
//   });
// });

// // 404 handler
// app.use('*', (req, res) => {
//   res.status(404).json({ message: 'Route not found' });
// });

// // Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
//   .then(() => {
//     console.log('Connected to MongoDB');
//   // Do not log database URI to avoid exposing secrets

//     // Start server with socket.io
//     const PORT = process.env.PORT || 5000;
//     server.listen(PORT, () => {
//       console.log(`Server + Socket.io running on port ${PORT}`);
//       console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
//       if (process.env.NODE_ENV === 'development') {
//         console.log('To create admin user, run: npm run create-admin');
//       }
//     });
//   })
//   .catch((error) => {
//     // Log only the error message to avoid leaking the connection string
//     console.error('MongoDB connection error:', error?.message || String(error));
//     process.exit(1);
//   });

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err, promise) => {
//   console.log('Unhandled Promise Rejection:', err.message);
//   // Close server & exit process
//   process.exit(1);
// });

// // Socket auth (lightweight)
// const userSockets = new Map();
// io.use(async (socket, next) => {
//   const token = socket.handshake.auth?.token;
//   if (!token) return next(new Error('No token'));
//   try {
//     const jwt = require('jsonwebtoken');
//     const User = require('./models/User');
//     const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
//     const decoded = jwt.verify(raw, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.userId).select('_id firstName lastName role');
//     if (user) socket.user = user;
//   } catch (e) {
//   console.warn('Socket auth failed:', e.message);
//   return next(new Error('Auth failed'));
//   }
//   next();
// });

// io.on('connection', (socket) => {
//   if (!socket.user) {
//     socket.disconnect(true);
//     return;
//   }
//   if (socket.user) {
//     const uid = socket.user._id.toString();
//     if (!userSockets.has(uid)) userSockets.set(uid, new Set());
//     userSockets.get(uid).add(socket.id);
//     socket.join(uid);
//     io.to(uid).emit('presence', { userId: uid, status: 'online' });
//   }

//   socket.on('chat:send', async (payload, cb) => {
//     try {
//       const { to, content, conversationId, attachments } = payload || {};
//       if (!socket.user) throw new Error('Not authenticated');
//       if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) throw new Error('Missing content');
//       const Conversation = require('./models/Conversation');
//       const Message = require('./models/Message');

//       let convo;
//       let msg;
//       if (conversationId) {
//         // Group (or existing direct) conversation path
//         convo = await Conversation.findById(conversationId);
//         if (!convo) throw new Error('Conversation not found');
//         if (!convo.participants.some(p => p.toString() === socket.user._id.toString())) throw new Error('Not a participant');
//         // Create message (receiver optional for group)
//   msg = await Message.create({ sender: socket.user._id, conversation: convo._id, content: content?.trim(), attachments });
//         // Update unread counts for all OTHER participants
//         convo.lastMessage = msg._id;
//         convo.participantStates = (convo.participantStates || []).map(ps => {
//           if (ps.user.toString() === socket.user._id.toString()) {
//             ps.lastSeen = new Date();
//             ps.lastReadMessage = msg._id;
//           } else {
//             ps.unread = (ps.unread || 0) + 1;
//           }
//           return ps;
//         });
//         await convo.save();
//         const fullMsg = await Message.findById(msg._id).populate('sender','firstName lastName');
//         // Broadcast to all participants
//         convo.participants.forEach(p => io.to(p.toString()).emit('chat:message', { conversationId: convo._id, message: fullMsg }));
//         // Create notification for other participants
//         try {
//           const Notification = require('./models/Notification');
//           const others = convo.participants.filter(p => p.toString() !== socket.user._id.toString());
//           await Promise.all(others.map(o => Notification.createNotification({
//             recipient: o,
//             title: 'New Chat Message',
//             message: `${socket.user.firstName || 'Someone'} sent a message`,
//             type: 'chat_message',
//             targetId: convo._id,
//             targetUrl: `/chat?conversation=${convo._id}`
//           })));
//         } catch (e) { console.warn('Chat notification failed:', e.message); }
//         const unreadMap = convo.participantStates.reduce((acc, ps) => { acc[ps.user.toString()] = ps.unread; return acc; }, {});
//         convo.participants.forEach(p => io.to(p.toString()).emit('chat:unread', { conversationId: convo._id, unread: unreadMap }));
//         cb && cb({ ok: true, message: fullMsg, conversationId: convo._id });
//       } else {
//         // Direct message path (legacy API using 'to')
//         if (!to) throw new Error('Missing recipient');
//         convo = await Conversation.findOne({ participants: { $all: [socket.user._id, to] }, $expr: { $eq: [{ $size: '$participants' }, 2] } });
//         if (!convo) convo = await Conversation.create({ participants: [socket.user._id, to] });
//   msg = await Message.create({ sender: socket.user._id, receiver: to, content: content?.trim(), conversation: convo._id, attachments });
//         convo.lastMessage = msg._id;
//         convo.participantStates = (convo.participantStates || []).map(ps => {
//           if (ps.user.toString() === socket.user._id.toString()) {
//             ps.lastSeen = new Date();
//             ps.lastReadMessage = msg._id;
//           } else {
//             ps.unread = (ps.unread || 0) + 1;
//           }
//           return ps;
//         });
//         await convo.save();
//         const fullMsg = await Message.findById(msg._id).populate('sender','firstName lastName').populate('receiver','firstName lastName');
//         [socket.user._id.toString(), to.toString()].forEach(room => io.to(room).emit('chat:message', { conversationId: convo._id, message: fullMsg }));
//         // Notification for direct message receiver
//         try {
//           const Notification = require('./models/Notification');
//           await Notification.createNotification({
//             recipient: to,
//             title: 'New Chat Message',
//             message: `${socket.user.firstName || 'Someone'} sent you a message`,
//             type: 'chat_message',
//             targetId: convo._id,
//             targetUrl: `/chat?conversation=${convo._id}`
//           });
//         } catch (e) { console.warn('Direct chat notification failed:', e.message); }
//         const convoPayload = { conversationId: convo._id, unread: convo.participantStates.reduce((acc, ps) => ({ ...acc, [ps.user.toString()]: ps.unread }), {}) };
//         [socket.user._id.toString(), to.toString()].forEach(room => io.to(room).emit('chat:unread', convoPayload));
//         cb && cb({ ok: true, message: fullMsg, conversationId: convo._id });
//       }
//     } catch (e) {
//       cb && cb({ ok: false, error: e.message });
//     }
//   });

//   socket.on('chat:typing', async ({ to, conversationId, typing }) => {
//     if (!socket.user) return;
//     try {
//       if (conversationId) {
//         const Conversation = require('./models/Conversation');
//         const convo = await Conversation.findById(conversationId).select('participants');
//         if (!convo) return;
//         if (!convo.participants.some(p => p.toString() === socket.user._id.toString())) return; // not member
//         convo.participants.filter(p => p.toString() !== socket.user._id.toString()).forEach(p => {
//           io.to(p.toString()).emit('chat:typing', { conversationId, from: socket.user._id, typing: !!typing });
//         });
//       } else if (to) {
//         io.to(to.toString()).emit('chat:typing', { conversationId, from: socket.user._id, typing: !!typing });
//       }
//     } catch (_) {}
//   });

//   socket.on('chat:read', async ({ conversationId, messageId }) => {
//     try {
//       const Conversation = require('./models/Conversation');
//       const convo = await Conversation.findById(conversationId);
//       if (!convo || !convo.participants.some(p => p.toString() === socket.user._id.toString())) return;
//       convo.participantStates = convo.participantStates.map(ps => {
//         if (ps.user.toString() === socket.user._id.toString()) {
//           ps.unread = 0; ps.lastSeen = new Date(); ps.lastReadMessage = messageId;
//         }
//         return ps;
//       });
//       await convo.save();
//       // Notify other participants
//       convo.participants.filter(p => p.toString() !== socket.user._id.toString()).forEach(p => {
//         io.to(p.toString()).emit('chat:read', { conversationId, userId: socket.user._id, messageId });
//       });
//     } catch (e) {
//       console.error('chat:read error', e.message);
//     }
//   });

//   socket.on('disconnect', () => {
//     if (socket.user) {
//       const uid = socket.user._id.toString();
//       const set = userSockets.get(uid);
//       if (set) {
//         set.delete(socket.id);
//         if (set.size === 0) {
//           userSockets.delete(uid);
//           io.to(uid).emit('presence', { userId: uid, status: 'offline' });
//         }
//       }
//     }
//   });
// });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
// Removed assignment, submission, attendance, grade features
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const uploadRoutes = require('./routes/upload');
const chatRoutes = require('./routes/chat');
const todoRoutes = require('./routes/todos');
const aiRoutes = require('./routes/ai');
const quizRoutes = require('./routes/quizzes');
const { router: gamificationRoutes } = require('./routes/gamification');

const app = express();
let server, io;
if (!process.env.VERCEL) {
  server = http.createServer(app);
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET','POST','PUT','PATCH','DELETE'] }
  });
  app.set('io', io);
  global._io = io; // for model hooks
} else {
  // Provide a minimal stub so route code using app.get('io') continues working (no real-time on Vercel serverless)
  app.set('io', { emit: () => {}, to: () => ({ emit: () => {} }) });
}

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
// Removed /api/assignments, /api/submissions, /api/attendance, /api/grades endpoints
// Removed legacy /api/messages (inbox) feature; real-time chat remains via /api/chat
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/gamification', gamificationRoutes);

// Development helper: list all routes (skip in production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/_debug/routes', (req, res) => {
    const list = [];
    const stack = app._router.stack;
    stack.forEach(mw => {
      if (mw.route && mw.route.path) {
        const methods = Object.keys(mw.route.methods).join(',').toUpperCase();
        list.push({ path: mw.route.path, methods });
      } else if (mw.name === 'router' && mw.handle.stack) {
        mw.handle.stack.forEach(r => {
          if (r.route) {
            const methods = Object.keys(r.route.methods).join(',').toUpperCase();
            list.push({ path: r.route.path, methods });
          }
        });
      }
    });
    res.json({ routes: list });
  });
  // Simple migration helper to set owner where missing
  app.post('/api/_debug/migrate/owner', async (req, res) => {
    try {
      const Course = require('./models/Course');
      const courses = await Course.find({ $or: [{ owner: { $exists: false } }, { owner: null }] });
      let updated = 0;
      for (const c of courses) {
        if (!c.owner && c._doc.instructor) { c.owner = c._doc.instructor; await c.save(); updated++; }
      }
      res.json({ message: 'Migration complete', updated });
    } catch (e) {
      console.error('Owner migration error:', e);
      res.status(500).json({ message: 'Migration failed', error: e.message });
    }
  });
}

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Root info route (useful when hitting backend domain directly)
app.get('/', (req, res) => {
  res.json({
    name: 'CourseMate API',
    status: 'ok',
    health: '/api/health',
    uptime: process.uptime(),
    serverless: !!process.env.VERCEL
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

async function ensureDb(){
  if (mongoose.connection.readyState === 1) return; // already connected
  if (!process.env.MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser:true, useUnifiedTopology:true });
    console.log('Mongo connected');
  } catch (e) {
    console.error('Mongo connect failure:', e.message);
  }
}
ensureDb().then(()=>{
  if (!process.env.VERCEL && server) {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
  }
});

// Reconnect attempt middleware for API routes
app.use(async (req,res,next)=>{
  if (mongoose.connection.readyState !==1) await ensureDb();
  next();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Promise Rejection:', err.message);
  // Close server & exit process
  process.exit(1);
});

if (io) {
  const userSockets = new Map();
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const jwt = require('jsonwebtoken');
      const User = require('./models/User');
      const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
      const decoded = jwt.verify(raw, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('_id firstName lastName role');
      if (user) socket.user = user;
    } catch (e) {
      console.warn('Socket auth failed:', e.message);
      return next(new Error('Auth failed'));
    }
    next();
  });

  io.on('connection', (socket) => {
    if (!socket.user) { socket.disconnect(true); return; }
    const uid = socket.user._id.toString();
    if (!userSockets.has(uid)) userSockets.set(uid, new Set());
    userSockets.get(uid).add(socket.id);
    socket.join(uid);
    io.to(uid).emit('presence', { userId: uid, status: 'online' });

    socket.on('chat:send', async (payload, cb) => {
      try {
        const { to, content, conversationId, attachments } = payload || {};
        if (!socket.user) throw new Error('Not authenticated');
        if ((!content || !content.trim()) && (!attachments || attachments.length === 0)) throw new Error('Missing content');
        const Conversation = require('./models/Conversation');
        const Message = require('./models/Message');
        let convo; let msg;
        if (conversationId) {
          convo = await Conversation.findById(conversationId);
          if (!convo) throw new Error('Conversation not found');
          if (!convo.participants.some(p => p.toString() === socket.user._id.toString())) throw new Error('Not a participant');
          msg = await Message.create({ sender: socket.user._id, conversation: convo._id, content: content?.trim(), attachments });
          convo.lastMessage = msg._id;
          convo.participantStates = (convo.participantStates || []).map(ps => {
            if (ps.user.toString() === socket.user._id.toString()) { ps.lastSeen = new Date(); ps.lastReadMessage = msg._id; }
            else { ps.unread = (ps.unread || 0) + 1; }
            return ps;
          });
          await convo.save();
          const fullMsg = await Message.findById(msg._id).populate('sender','firstName lastName');
          convo.participants.forEach(p => io.to(p.toString()).emit('chat:message', { conversationId: convo._id, message: fullMsg }));
          try {
            const Notification = require('./models/Notification');
            const others = convo.participants.filter(p => p.toString() !== socket.user._id.toString());
            await Promise.all(others.map(o => Notification.createNotification({ recipient: o, title: 'New Chat Message', message: `${socket.user.firstName || 'Someone'} sent a message`, type: 'chat_message', targetId: convo._id, targetUrl: `/chat?conversation=${convo._id}` })));
          } catch (e) { console.warn('Chat notification failed:', e.message); }
          const unreadMap = convo.participantStates.reduce((acc, ps) => { acc[ps.user.toString()] = ps.unread; return acc; }, {});
          convo.participants.forEach(p => io.to(p.toString()).emit('chat:unread', { conversationId: convo._id, unread: unreadMap }));
          cb && cb({ ok: true, message: fullMsg, conversationId: convo._id });
        } else {
          if (!to) throw new Error('Missing recipient');
          convo = await Conversation.findOne({ participants: { $all: [socket.user._id, to] }, $expr: { $eq: [{ $size: '$participants' }, 2] } });
          if (!convo) convo = await Conversation.create({ participants: [socket.user._id, to] });
          msg = await Message.create({ sender: socket.user._id, receiver: to, content: content?.trim(), conversation: convo._id, attachments });
          convo.lastMessage = msg._id;
          convo.participantStates = (convo.participantStates || []).map(ps => {
            if (ps.user.toString() === socket.user._id.toString()) { ps.lastSeen = new Date(); ps.lastReadMessage = msg._id; }
            else { ps.unread = (ps.unread || 0) + 1; }
            return ps;
          });
          await convo.save();
          const fullMsg = await Message.findById(msg._id).populate('sender','firstName lastName').populate('receiver','firstName lastName');
          [socket.user._id.toString(), to.toString()].forEach(room => io.to(room).emit('chat:message', { conversationId: convo._id, message: fullMsg }));
          try {
            const Notification = require('./models/Notification');
            await Notification.createNotification({ recipient: to, title: 'New Chat Message', message: `${socket.user.firstName || 'Someone'} sent you a message`, type: 'chat_message', targetId: convo._id, targetUrl: `/chat?conversation=${convo._id}` });
          } catch (e) { console.warn('Direct chat notification failed:', e.message); }
          const convoPayload = { conversationId: convo._id, unread: convo.participantStates.reduce((acc, ps) => ({ ...acc, [ps.user.toString()]: ps.unread }), {}) };
          [socket.user._id.toString(), to.toString()].forEach(room => io.to(room).emit('chat:unread', convoPayload));
          cb && cb({ ok: true, message: fullMsg, conversationId: convo._id });
        }
      } catch (e) { cb && cb({ ok: false, error: e.message }); }
    });

    socket.on('chat:typing', async ({ to, conversationId, typing }) => {
      if (!socket.user) return;
      try {
        if (conversationId) {
          const Conversation = require('./models/Conversation');
          const convo = await Conversation.findById(conversationId).select('participants');
          if (!convo) return;
          if (!convo.participants.some(p => p.toString() === socket.user._id.toString())) return;
          convo.participants.filter(p => p.toString() !== socket.user._id.toString()).forEach(p => io.to(p.toString()).emit('chat:typing', { conversationId, from: socket.user._id, typing: !!typing }));
        } else if (to) {
          io.to(to.toString()).emit('chat:typing', { conversationId, from: socket.user._id, typing: !!typing });
        }
      } catch (_) {}
    });

    socket.on('chat:read', async ({ conversationId, messageId }) => {
      try {
        const Conversation = require('./models/Conversation');
        const convo = await Conversation.findById(conversationId);
        if (!convo || !convo.participants.some(p => p.toString() === socket.user._id.toString())) return;
        convo.participantStates = convo.participantStates.map(ps => {
          if (ps.user.toString() === socket.user._id.toString()) { ps.unread = 0; ps.lastSeen = new Date(); ps.lastReadMessage = messageId; }
          return ps;
        });
        await convo.save();
        convo.participants.filter(p => p.toString() !== socket.user._id.toString()).forEach(p => io.to(p.toString()).emit('chat:read', { conversationId, userId: socket.user._id, messageId }));
      } catch (e) { console.error('chat:read error', e.message); }
    });

    socket.on('disconnect', () => {
      if (socket.user) {
        const set = userSockets.get(uid);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) { userSockets.delete(uid); io.to(uid).emit('presence', { userId: uid, status: 'offline' }); }
        }
      }
    });
  });
}

module.exports = app; // for Vercel serverless