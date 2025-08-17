const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');

router.post('/rate', ratingController.addRating);
router.get('/ratings/:resourceId', ratingController.getRatings);

module.exports = router;