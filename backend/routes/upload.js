const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth } = require('../middleware/auth');

const router = express.Router();

//Ensuring upload directories exist
const uploadDirs = [
    'uploads/course-materials',
    'uploads/documents',
    'uploads/videos',
    'uploads/profiles'
];

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

//Storage configuration for course materials
const materialStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const type = req.body.type || 'course-material';
        let uploadPath = 'uploads/course-materials';

        if (type === 'video') {
            uploadPath = 'uploads/videos';
        } else if (type === 'document' || type === 'pdf' || type === 'note') {
            uploadPath = 'uploads/documents';
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `material-${uniqueSuffix}${ext}`);
    }
});

//File filter for course materials
const materialFilter = (req, file, cb) => {
    const allowedTypes = {
        video: /mp4|mov|avi|mkv|webm/,
        document: /pdf|doc|docx|ppt|pptx|txt/,
        image: /jpeg|jpg|png|gif|svg/
    };

    const ext = path.extname(file.originalname).toLowerCase();
    const mimetype = file.mimetype.toLowerCase();

    //Check if it's a video
    if (allowedTypes.video.test(ext) || mimetype.startsWith('video/')) {
        return cb(null, true);
    }

    //Check if it's a document
    if (allowedTypes.document.test(ext) ||
        mimetype.includes('pdf') ||
        mimetype.includes('document') ||
        mimetype.includes('presentation')) {
        return cb(null, true);
    }

    //Check if it's an image
    if (allowedTypes.image.test(ext) || mimetype.startsWith('image/')) {
        return cb(null, true);
    }

    cb(new Error('File type not supported. Allowed: videos, documents, PDFs, presentations, and images.'));
};

//Upload middleware for course materials
const uploadCourseMaterial = multer({
    storage: materialStorage,
    limits: {
        fileSize: 100 * 1024 * 1024 //100MB limit for videos and documents
    },
    fileFilter: materialFilter
}).single('file');

//@route   POST /api/upload
//@desc    Upload course material file
//@access  Private
router.post('/', auth, (req, res) => {
    uploadCourseMaterial(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.status(400).json({
                message: err.message || 'File upload failed'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: 'No file uploaded'
            });
        }

        //Return file information
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const filePath = `${baseUrl}/${req.file.path.replace(/\\/g, '/')}`;

        res.json({
            message: 'File uploaded successfully',
            filename: req.file.filename,
            originalName: req.file.originalname,
            url: filePath, //Using 'url' for consistency with frontend
            filePath: filePath,
            localPath: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
    });
});

//@route   POST /api/upload/multiple
//@desc    Upload multiple course material files
//@access  Private
const uploadMultiple = multer({
    storage: materialStorage,
    limits: {
        fileSize: 100 * 1024 * 1024, //100MB per file
        files: 5 //Max 5 files
    },
    fileFilter: materialFilter
}).array('files', 5);

router.post('/multiple', auth, (req, res) => {
    uploadMultiple(req, res, (err) => {
        if (err) {
            console.error('Multiple upload error:', err);
            return res.status(400).json({
                message: err.message || 'File upload failed'
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: 'No files uploaded'
            });
        }

        //Return information for all uploaded files
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            filePath: `${baseUrl}/${file.path.replace(/\\/g, '/')}`,
            localPath: file.path,
            size: file.size,
            mimetype: file.mimetype
        }));

        res.json({
            message: 'Files uploaded successfully',
            files: uploadedFiles
        });
    });
});

module.exports = router;
