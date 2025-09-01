const express = require('express');
const { body, validationResult } = require('express-validator');
const Todo = require('../models/Todo');
const { auth } = require('../middleware/auth');

const router = express.Router();

//@route   GET /api/todos
//@desc    Get user todos with filtering and pagination
//@access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      completed, 
      taskType, 
      priority, 
      overdue,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    //Build filter object
    const filter = { user: req.user._id };
    
    if (completed !== undefined) {
      filter.isCompleted = completed === 'true';
    }
    
    if (taskType && taskType !== 'all') {
      filter.taskType = taskType;
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }
    
    //Handling overdue filter
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.isCompleted = false;
    }

    //Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const todos = await Todo.find(filter)
      .populate('course', 'title courseCode')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Todo.countDocuments(filter);

    res.json({
      todos,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({ message: 'Server error while fetching todos' });
  }
});

//@route   GET /api/todos/stats
//@desc    Get user todo statistics
//@access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const stats = await Todo.getUserStats(req.user._id);
    res.json(stats);
  } catch (error) {
    console.error('Get todo stats error:', error);
    res.status(500).json({ message: 'Server error while fetching todo statistics' });
  }
});

//@route   GET /api/todos/:id
//@desc    Get single todo by ID
//@access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id)
      .populate('course', 'title courseCode')
      .populate('user', 'firstName lastName');

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    //Check if user owns this todo
    if (todo.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(todo);
  } catch (error) {
    console.error('Get todo error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.status(500).json({ message: 'Server error while fetching todo' });
  }
});

//@route   POST /api/todos
//@desc    Create a new todo
//@access  Private
router.post('/', [
  auth,
  body('title').trim().notEmpty().withMessage('Todo title is required'),
  body('taskType').optional().isIn(['Midterm', 'Final', 'Quiz', 'Assignment', 'Personal', 'Study', 'Project', 'Other']).withMessage('Invalid task type'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const todoData = {
      ...req.body,
      user: req.user._id
    };

    const todo = new Todo(todoData);
    await todo.save();

    await todo.populate('course', 'title courseCode');

    res.status(201).json(todo);
  } catch (error) {
    console.error('Create todo error:', error);
    res.status(500).json({ message: 'Server error while creating todo' });
  }
});

//@route   PUT /api/todos/:id
//@desc    Update a todo
//@access  Private
router.put('/:id', [
  auth,
  body('title').optional().trim().notEmpty().withMessage('Todo title cannot be empty'),
  body('taskType').optional().isIn(['Midterm', 'Final', 'Quiz', 'Assignment', 'Personal', 'Study', 'Project', 'Other']).withMessage('Invalid task type'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']).withMessage('Invalid priority'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    //Check if user owns this todo
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    //Update todo fields
    Object.keys(req.body).forEach(key => {
      if (req.body[key] !== undefined) {
        todo[key] = req.body[key];
      }
    });

    await todo.save();
    await todo.populate('course', 'title courseCode');

    res.json(todo);
  } catch (error) {
    console.error('Update todo error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.status(500).json({ message: 'Server error while updating todo' });
  }
});

//@route   DELETE /api/todos/:id
//@desc    Delete a todo
//@access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    //Check if user owns this todo
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Todo.findByIdAndDelete(req.params.id);

    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Delete todo error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.status(500).json({ message: 'Server error while deleting todo' });
  }
});

//@route   PUT /api/todos/:id/toggle
//@desc    Toggle todo completion status
//@access  Private
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    //Check if user owns this todo
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    todo.isCompleted = !todo.isCompleted;

    //When marking a todo as complete, marking all the subtasks as complete
    if (todo.isCompleted) {
      todo.subtasks.forEach(subtask => {
        subtask.isCompleted = true;
      });
    }

    await todo.save();

    res.json(todo);
  } catch (error) {
    console.error('Toggle todo error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.status(500).json({ message: 'Server error while toggling todo' });
  }
});

//@route   POST /api/todos/:id/subtasks
//@desc    Add a subtask to a todo
//@access  Private
router.post('/:id/subtasks', [
  auth,
  body('title').trim().notEmpty().withMessage('Subtask title is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    //Check if user owns this todo
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subtask = {
      title: req.body.title,
      isCompleted: false
    };

    todo.subtasks.push(subtask);
    await todo.save();

    res.status(201).json(todo);
  } catch (error) {
    console.error('Add subtask error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Todo not found' });
    }
    res.status(500).json({ message: 'Server error while adding subtask' });
  }
});

//@route   PUT /api/todos/:id/subtasks/:subtaskId
//@desc    Update a subtask
//@access  Private
router.put('/:id/subtasks/:subtaskId', [
  auth,
  body('title').optional().trim().notEmpty().withMessage('Subtask title cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    //Check if user owns this todo
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subtask = todo.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    //Update subtask fields
    if (req.body.title !== undefined) {
      subtask.title = req.body.title;
    }
    if (req.body.isCompleted !== undefined) {
      subtask.isCompleted = req.body.isCompleted;
    }

    await todo.save();

    res.json(todo);
  } catch (error) {
    console.error('Update subtask error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Todo or subtask not found' });
    }
    res.status(500).json({ message: 'Server error while updating subtask' });
  }
});

//@route   DELETE /api/todos/:id/subtasks/:subtaskId
//@desc    Delete a subtask
//@access  Private
router.delete('/:id/subtasks/:subtaskId', auth, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    //Check if user owns this todo
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subtask = todo.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    subtask.deleteOne();
    await todo.save();

    res.json(todo);
  } catch (error) {
    console.error('Delete subtask error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Todo or subtask not found' });
    }
    res.status(500).json({ message: 'Server error while deleting subtask' });
  }
});

//@route   PUT /api/todos/:id/subtasks/:subtaskId/toggle
//@desc    Toggle subtask completion status
//@access  Private
router.put('/:id/subtasks/:subtaskId/toggle', auth, async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);

    if (!todo) {
      return res.status(404).json({ message: 'Todo not found' });
    }

    //Check if user owns this todo
    if (todo.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subtask = todo.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    subtask.isCompleted = !subtask.isCompleted;

    //Check if all subtasks are completed and auto-complete the main task
    if (todo.subtasks.length > 0) {
      const allSubtasksCompleted = todo.subtasks.every(st => st.isCompleted);
      if (allSubtasksCompleted && !todo.isCompleted) {
        todo.isCompleted = true;
      } else if (!allSubtasksCompleted && todo.isCompleted) {
        //If a subtask is unchecked and main task was completed, uncheck main task
        todo.isCompleted = false;
      }
    }

    await todo.save();

    res.json(todo);
  } catch (error) {
    console.error('Toggle subtask error:', error);
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Todo or subtask not found' });
    }
    res.status(500).json({ message: 'Server error while toggling subtask' });
  }
});

module.exports = router;
