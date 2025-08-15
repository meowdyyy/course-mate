import express from 'express';
import {
  uploadResource,
  getPublicResources,
  getUserResources,
  getResourceById,
  downloadResource
} from '../controllers/resource.js';
import upload from '../config/multer.js';

const router = express.Router();

router.post('/', upload.array('files'), uploadResource);
router.get('/public', getPublicResources);
router.get('/user', getUserResources);
router.get('/:resourceId', getResourceById);
router.get('/:resourceId/download', downloadResource);

export default router;