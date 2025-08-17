const Comment = require('../models/Comment');

exports.addComment = async (req, res) => {
    try {
        const { userId, resourceId, commentText } = req.body;
        const newComment = new Comment({ userId, resourceId, commentText });
        await newComment.save();
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getComments = async (req, res) => {
    try {
        const { resourceId } = req.params;
        const comments = await Comment.find({ resourceId });
        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};