import Activity from '../models/activities.js';
import mongoose from 'mongoose';

export const getActivityTimeline = async (req, res, next) => {
    try {
        const { before, limit = 50 } = req.query;
        const userId = req.user?._id;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const query = { 
            userId: new mongoose.Types.ObjectId(userId)
        };

        if (before) {
            const beforeDate = new Date(before);
            if (!isNaN(beforeDate.getTime())) {
                query.createdAt = { $lt: beforeDate };
            }
        }

        const activities = await Activity.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .populate('resourceId', 'title');

        const formattedActivities = activities.map(activity => ({
            id: activity._id,
            type: activity.type,
            resourceId: activity.resourceId?._id,
            resourceTitle: activity.resourceId?.title || activity.details.resourceTitle,
            details: activity.details,
            date: activity.createdAt
        }));

        res.json({
            data: formattedActivities,
            nextCursor: activities.length ? activities[activities.length - 1].createdAt : null
        });
    } catch (e) {
        console.error('Get Activity Timeline Error:', e.message);
        next(e);
    }
};

export const getActivitySummary = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const [uploads, views, downloads] = await Promise.all([
            Activity.countDocuments({ 
                userId: new mongoose.Types.ObjectId(userId),
                type: 'resource_upload'
            }),
            Activity.countDocuments({ 
                userId: new mongoose.Types.ObjectId(userId),
                type: 'resource_view'
            }),
            Activity.countDocuments({ 
                userId: new mongoose.Types.ObjectId(userId),
                type: 'resource_download'
            })
        ]);

        const recentActivities = await Activity.find({ 
            userId: new mongoose.Types.ObjectId(userId)
        })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('resourceId', 'title');

        const summary = {
            counts: {
                uploaded: uploads,
                viewed: views,
                downloaded: downloads
            },
            recentActivities: recentActivities.map(activity => ({
                id: activity._id,
                type: activity.type,
                resourceId: activity.resourceId?._id,
                resourceTitle: activity.resourceId?.title || activity.details.resourceTitle,
                action: activity.details.action,
                date: activity.createdAt
            }))
        };

        res.json({ data: summary });
    } catch (e) {
        console.error('Get Activity Summary Error:', e.message);
        next(e);
    }
};