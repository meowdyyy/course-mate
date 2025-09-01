const mongoose = require('mongoose');

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Subtask title is required'],
    trim: true,
    maxlength: [200, 'Subtask title cannot exceed 200 characters']
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

const todoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Task description cannot exceed 1000 characters']
  },
  taskType: {
    type: String,
    enum: ['Midterm', 'Final', 'Quiz', 'Assignment', 'Personal', 'Study', 'Project', 'Other'],
    default: 'Personal'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  dueDate: {
    type: Date
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  subtasks: [subtaskSchema],
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  }
}, {
  timestamps: true
});

//Indexing for better performance
todoSchema.index({ user: 1 });
todoSchema.index({ dueDate: 1 });
todoSchema.index({ isCompleted: 1 });
todoSchema.index({ taskType: 1 });

//Virtual for completion percentage
todoSchema.virtual('completionPercentage').get(function() {
  if (this.subtasks.length === 0) {
    return this.isCompleted ? 100 : 0;
  }
  
  const completedSubtasks = this.subtasks.filter(subtask => subtask.isCompleted).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

//Virtual for overdue status
todoSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.isCompleted) return false;
  return new Date() > this.dueDate;
});

//Pre-save middleware to set completedAt
todoSchema.pre('save', function(next) {
  if (this.isModified('isCompleted')) {
    if (this.isCompleted && !this.completedAt) {
      this.completedAt = new Date();
    } else if (!this.isCompleted) {
      this.completedAt = undefined;
    }
  }
  
  //Update subtask completedAt
  this.subtasks.forEach(subtask => {
    if (subtask.isModified('isCompleted')) {
      if (subtask.isCompleted && !subtask.completedAt) {
        subtask.completedAt = new Date();
      } else if (!subtask.isCompleted) {
        subtask.completedAt = undefined;
      }
    }
  });
  
  next();
});

//Static method to get user statistics
todoSchema.statics.getUserStats = async function(userId) {
  try {
    //Get all todos for the user
    const allTodos = await this.find({ user: userId });

    //Calculate stats
    const total = allTodos.length;
    const completed = allTodos.filter(todo => todo.isCompleted).length;
    const overdue = allTodos.filter(todo =>
      todo.dueDate &&
      new Date(todo.dueDate) < new Date() &&
      !todo.isCompleted
    ).length;

    return { total, completed, overdue };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
};

module.exports = mongoose.model('Todo', todoSchema);
