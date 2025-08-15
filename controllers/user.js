import User from '../models/user.js';

export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find({});
        res.json(users);
    } catch (err) {
        console.error('Get Users Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};