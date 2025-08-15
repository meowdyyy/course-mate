import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import Resource from '../models/resources.js';
import Activity from '../models/activities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadResource = async (req, res, next) => {
    try {
        const { title, description, isPublic } = req.body;
        if (!title) return res.status(400).json({ error: { message: 'Title required' } });
        
        const attachments = (req.files || []).map(f => ({
            _id: uuid(),
            originalName: f.originalname,
            mimeType: f.mimetype,
            size: f.size,
            url: `/uploads/${f.filename}`
        }));

        const resource = await Resource.create({
            title,
            description: description || '',
            isPublic: Boolean(isPublic),
            uploadedBy: req.user?._id || 'temp-user-id', 
            attachments
        });

        await Activity.create({
            userId: req.user?._id,
            type: 'resource_upload',
            resourceId: resource._id,
            details: {
                action: isPublic ? 'uploaded and shared' : 'uploaded privately',
                resourceTitle: resource.title,
                resourceType: attachments.length ? attachments[0].mimeType : 'unknown',
                resourceSize: attachments.length ? attachments[0].size : 0
            }
        });

        res.status(201).json({ data: resource.toJSON() });
    } catch (e) { next(e); }
};

export const getPublicResources = async (req, res, next) => {
    try {
        const { before, limit = 50 } = req.query;
        const userId = req.user?._id;
        const query = {
            $or: [
                { isPublic: true }
            ]
        };
        
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            query.$or.push({ 
                uploadedBy: new mongoose.Types.ObjectId(userId),
                isPublic: false
            });
        }
        
        if (before) {
            const beforeDate = new Date(before);
            if (!isNaN(beforeDate.getTime())) {
                query.createdAt = { $lt: beforeDate };
            }
        }
        
        const resources = await Resource.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        res.json({
            data: resources,
            nextCursor: resources.length ? resources[resources.length - 1].createdAt : null
        });
    } catch (e) {
        console.error('Get Public Resources Error:', e.message);
        next(e);
    }
};

export const getUserResources = async (req, res, next) => {
    try {
        const { before, limit = 50 } = req.query;
        const userId = req.user?._id;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        const query = { 
            uploadedBy: new mongoose.Types.ObjectId(userId)
        };
        
        if (before) {
            const beforeDate = new Date(before);
            if (!isNaN(beforeDate.getTime())) {
                query.createdAt = { $lt: beforeDate };
            }
        }
        
        const resources = await Resource.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit));

        res.json({
            data: resources,
            nextCursor: resources.length ? resources[resources.length - 1].createdAt : null
        });
    } catch (e) {
        console.error('Get User Resources Error:', e.message);
        next(e);
    }
};

export const getResourceById = async (req, res, next) => {
    try {
        const { resourceId } = req.params;
        const resource = await Resource.findOne({ _id: resourceId });
        
        if (!resource) {
            return res.status(404).json({ error: { message: 'Resource not found' } });
        }     
        
        if (!resource.isPublic && resource.uploadedBy.toString() !== req.user?._id?.toString()) { 
            return res.status(403).json({ error: { message: 'Access denied' } });
        }

        await Activity.create({
            userId: req.user?._id,
            type: 'resource_view',
            resourceId: resource._id,
            details: {
                action: 'viewed',
                resourceTitle: resource.title,
                resourceType: resource.attachments.length ? resource.attachments[0].mimeType : 'unknown'
            }
        });

        res.json({ data: resource.toJSON() });
    } catch (e) { 
        console.error('Get Resource By ID Error:', e.message);
        next(e); 
    }
};

export const downloadResource = async (req, res, next) => {
    try {
        const { resourceId } = req.params;
        const resource = await Resource.findOne({ _id: resourceId });
        
        if (!resource) {
            return res.status(404).json({ error: { message: 'Resource not found' } });
        }
        
        if (!resource.isPublic && resource.uploadedBy.toString() !== req.user?._id?.toString()) {
            return res.status(403).json({ error: { message: 'Access denied' } });
        }
        
        if (!resource.attachments.length) {
            return res.status(404).json({ error: { message: 'No attachments found' } });
        }

        await Activity.create({
            userId: req.user?._id,
            type: 'resource_download',
            resourceId: resource._id,
            details: {
                action: 'downloaded',
                resourceTitle: resource.title,
                resourceType: resource.attachments[0].mimeType,
                resourceSize: resource.attachments[0].size
            }
        });

        const filePath = path.join(__dirname, '../uploads', resource.attachments[0].url.split('/').pop());
        res.download(filePath, resource.attachments[0].originalName);
    } catch (e) {
        console.error('Download Resource Error:', e.message);
        next(e);
    }
};

