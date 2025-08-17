const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

router.post('/comment', commentController.addComment);
router.get('/comments/:resourceId', commentController.getComments);

module.exports = router;