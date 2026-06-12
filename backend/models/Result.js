const mongoose = require('mongoose');

const subjectResultSchema = new mongoose.Schema({
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  subjectName: { type: String },
  obtainableMarks: { type: Number },
  marksObtained: { type: Number },
  percentage: { type: Number },
}, { _id: false });

const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  subjectResults: [subjectResultSchema],
  totalObtainable: { type: Number },
  totalMarksObtained: { type: Number },
  totalPercentage: { type: Number },
  status: { type: String, enum: ['ADMITTED', 'RESIT', 'PENDING'], default: 'PENDING' },
  gradedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);