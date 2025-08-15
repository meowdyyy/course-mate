
import mongoose from 'mongoose';

const ActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: String, // 'resource_view', 'resource_download', 'resource_upload'
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource' },
  details: Object,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Activity', ActivitySchema);