const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  isGroup: { type: Boolean, default: false },
  name: { type: String, trim: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  pendingInvites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participantStates: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    unread: { type: Number, default: 0 },
    lastSeen: { type: Date },
    lastReadMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
  }]
}, { timestamps: true });

conversationSchema.pre('save', function(next){
  if (!this.participantStates || this.participantStates.length === 0) {
    this.participantStates = this.participants.map(p => ({ user: p, unread: 0 }));
  } else {
    //ensure all participants represented
    const existingIds = this.participantStates.map(ps => ps.user.toString());
    this.participants.forEach(p => {
      if (!existingIds.includes(p.toString())) {
        this.participantStates.push({ user: p, unread: 0 });
      }
    });
  }
  next();
});

conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);