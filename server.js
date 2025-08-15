import express from 'express';
import mongoose from 'mongoose';
import userRoutes from './routes/user.js';
import activityRoutes from './routes/activities.js';
import resourceRoutes from './routes/resources.js';
import authMiddleware from './middleware/auth.js';

const app = express();

// Middleware
app.use(express.json());
app.use(authMiddleware);

// Routes
app.use('/Backend/users', userRoutes);
app.use('/Backend/resources', resourceRoutes);
app.use('/Backend/activities', activityRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Database connection and server start
mongoose.connect("mongodb+srv://ahmed:Yrz8DSrWsk207STI@backenddb.h1vrdy2.mongodb.net/Node-API?retryWrites=true&w=majority&appName=BackendDB")
.then(() => {
    console.log('Connected to MongoDB');
    app.listen(1148, () => {
       console.log('Server running on port 1148');
    });
})
.catch(err => {
    console.error('MongoDB connection error:', err);
});