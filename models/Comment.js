const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    userId: String,
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource'
    },
    commentText: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Comment', commentSchema);
