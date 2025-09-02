const mongoose = require('mongoose');

const mcqQuestionSchema = new mongoose.Schema({
  id: { type: String },
  question: { type: String, required: true },
  options: { type: [String], required: true, validate: v => Array.isArray(v) && v.length >= 2 },
  correctIndex: { type: Number, required: true, min: 0 },
  explanation: { type: String },
  difficulty: { type: String, enum: ['easy','medium','hard'], required: false }
}, { _id: false });

const quizAttemptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  questions: { type: [mcqQuestionSchema], required: true },
  answers: { type: [Number], required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  durationSeconds: { type: Number, default: 0 }
}, { timestamps: true });

quizAttemptSchema.index({ user: 1, course: 1, createdAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
