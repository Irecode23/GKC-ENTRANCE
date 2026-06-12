const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', null], default: null },
  isFlagged: { type: Boolean, default: false },
  visitStatus: { type: String, enum: ['not_visited', 'visited', 'answered'], default: 'not_visited' },
  savedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Compound unique index: one answer record per student per question
answerSchema.index({ student: 1, question: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);