const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  section: { type: String, default: '' }, // e.g. "Section A — Comprehension"
  sectionInstruction: { type: String, default: '' }, // instruction text for the section
  questionText: { type: String, default: '' },
  questionImage: { type: String, default: null },
  questionImagePublicId: { type: String, default: null },
  optionA: { type: String, required: true },
  optionB: { type: String, required: true },
  optionC: { type: String, required: true },
  optionD: { type: String, required: true },
  optionAImage: { type: String, default: null },
  optionBImage: { type: String, default: null },
  optionCImage: { type: String, default: null },
  optionDImage: { type: String, default: null },
  correctAnswer: { type: String, enum: ['A', 'B', 'C', 'D'], required: true },
  markAllocation: { type: Number, required: true, default: 1 },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);