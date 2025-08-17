const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    userId: String,
    resourceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Resource'
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    }
});

module.exports = mongoose.model('Rating', ratingSchema);
