const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: [
      'assignment', 'assignment_due', 'grade', 'enrollment', 'payment', 'system', 'reminder', 'announcement',
      'doc_verified', 'doc_rejected', 'course_approved', 'course_rejected', 'user_approved',
      'resource_uploaded', 'resource_approved', 'resource_rejected', 'chat_message'
    ],
    required: [true, 'Type is required']
  },
  //Target information for navigation
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  targetUrl: {
    type: String,
    required: false,
    maxlength: [200, 'Target URL cannot exceed 200 characters']
  },
  actionRequired: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipient: 1 });
notificationSchema.index({ isRead: 1 });

//Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

//Static method to notify all admins
notificationSchema.statics.notifyAdmins = async function(title, message, type = 'system', relatedData = {}) {
  try {
    const User = require('./User');
    const admins = await User.find({ role: 'admin', isActive: true });
    
    const notifications = await Promise.all(
      admins.map(admin => 
        this.createNotification({
          recipient: admin._id,
          title,
          message,
          type,
          ...relatedData
        })
      )
    );
    
    return notifications;
  } catch (error) {
    console.error('Error notifying admins:', error);
    throw error;
  }
};

notificationSchema.post('save', function(doc) {
  try {
    if (doc && global._io) {
      global._io.to(doc.recipient.toString()).emit('notification:new', {
        _id: doc._id,
        recipient: doc.recipient,
        title: doc.title,
        message: doc.message,
        type: doc.type,
        targetId: doc.targetId,
        targetUrl: doc.targetUrl,
        actionRequired: doc.actionRequired,
        isRead: doc.isRead,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });
    }
  } catch (e) {
    console.warn('Notification post-save emit failed:', e.message);
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
