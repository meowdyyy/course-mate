

import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
  title: String,
  description: String,
  isPublic: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments: [{
    _id: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Resource', ResourceSchema);