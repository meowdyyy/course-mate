import express from 'express';
import {
  getActivityTimeline,
  getActivitySummary
} from '../controllers/activity.js';

const router = express.Router();

router.get('/', getActivityTimeline);
router.get('/summary', getActivitySummary);
export default router;