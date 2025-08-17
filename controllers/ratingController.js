const Rating = require('../models/Rating');

exports.addRating = async (req, res) => {
    try {
        const { userId, resourceId, rating } = req.body;
        const newRating = new Rating({ userId, resourceId, rating });
        await newRating.save();
        res.status(201).json(newRating);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getRatings = async (req, res) => {
    try {
        const { resourceId } = req.params;
        const ratings = await Rating.find({ resourceId });
        res.status(200).json(ratings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};