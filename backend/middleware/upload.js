const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist, creating parent directories as needed
const uploadDirs = ['uploads/documents', 'uploads/profiles', 'uploads/chat'];
uploadDirs.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.error(`Failed to create directory ${dir}:`, err);
  }
});

//Storage configuration for documents. 
const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

//File filter for documents. 
const documentFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images (JPEG, JPG, PNG), PDFs, and documents (DOC, DOCX) are allowed!'));
  }
};

//Upload middleware for documents. 
const uploadDocuments = multer({
  storage: documentStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 //10MB limit
  },
  fileFilter: documentFilter
}).array('documents', 5); //Allow up to 5 documents

module.exports = {
  uploadDocuments,
  chatUpload: multer({
    storage: multer.diskStorage({
      destination: function(req, file, cb){ cb(null, 'uploads/chat'); },
      filename: function(req, file, cb){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1e9);
        cb(null, 'att-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 15 * 1024 * 1024 }, //15MB per file
    fileFilter: (req, file, cb) => {
      //Allow common doc/image/video (small) types
      const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|xls|xlsx|txt|mp4|webm|ogg/;
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.test(ext) || allowed.test(file.mimetype)) return cb(null, true);
      cb(new Error('Unsupported file type'));
    }
  }).array('attachments', 5) //Allow up to 5 attachments
};
