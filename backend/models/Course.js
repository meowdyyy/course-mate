const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  courseCode: {
    type: String,
    required: [true, 'Course code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  credits: {
    type: Number,
    required: [true, 'Credits are required'],
    min: [1, 'Credits must be at least 1'],
    max: [10, 'Credits cannot exceed 10']
  },
  //Optional max students
  maxStudents: {
    type: Number,
    required: false,
    default: undefined
  },
  currentEnrollment: {
    type: Number,
    default: 0
  },
  //Optional fees structure
  fees: {
    type: Number,
    required: false,
    default: 0
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History', 'Arts', 'Business', 'Other']
  },
  level: {
    type: String,
    required: [true, 'Level is required'],
    enum: ['Beginner', 'Intermediate', 'Advanced']
  },
  //Academic term/semester label (e.g., 'Fall 2025')
  semester: {
    type: String,
    trim: true,
    default: ''
  },
  prerequisites: [String],
  materials: [{
    title: String,
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'document', 'note']
    },
    url: String,
    filename: String,
    description: String,
    isFree: {
      type: Boolean,
      default: false
    },
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  //Student contributed resources (separated from instructor materials)
  studentResources: [{
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ['pdf', 'video', 'link', 'document', 'note'],
      required: true
    },
    url: { type: String, required: true },
    filename: String,
    description: String,
  //Semester kept optional at schema level to avoid validation failures for legacy resources
  semester: { type: String, trim: true },
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    //Ratings (1-5 stars) one per user
    ratings: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      value: { type: Number, min: 1, max: 5, required: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }],
    //Comments thread
    comments: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      text: { type: String, required: true, maxlength: 500 },
      createdAt: { type: Date, default: Date.now }
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  thumbnailImage: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

courseSchema.virtual('instructor').get(function() { return this.owner; });
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });
courseSchema.pre('validate', function(next) {
  if (!this.owner) {
    const legacy = this.get('instructor') || this._doc?.instructor;
    if (legacy) {
      this.owner = legacy; //assign for validation
    }
  }
  next();
});

//Indexes for better performance
courseSchema.index({ courseCode: 1 });
courseSchema.index({ owner: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ isActive: 1, isApproved: 1 });

module.exports = mongoose.model('Course', courseSchema);
