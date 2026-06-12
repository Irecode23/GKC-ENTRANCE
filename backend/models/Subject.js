const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true }, // e.g. ENG, MATH, GS
  obtainableMarks: { type: Number, required: true, default: 50 },
  questionCount: { type: Number, required: true, default: 50 }, // total questions for this subject
  order: { type: Number, default: 0 }, // display order
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);