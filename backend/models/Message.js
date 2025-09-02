const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
        subject: { type: String, trim: true, maxlength: 200 },
          content: { type: String, maxlength: 5000 },
            attachments: [{
                originalName: String,
                    fileName: String,
                        mimeType: String,
                            size: Number,
                                url: String
                                  }],
                                    type: { type: String, enum: ['direct','system'], default: 'direct' },
                                      priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
                                        isRead: { type: Boolean, default: false },
                                          isDeleted: { type: Boolean, default: false }
                                          }, { timestamps: true });

                                          messageSchema.index({ sender: 1 });
                                          messageSchema.index({ receiver: 1 });
                                          messageSchema.index({ isRead: 1 });

                                          module.exports = mongoose.model('Message', messageSchema);
