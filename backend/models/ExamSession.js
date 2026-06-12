const mongoose = require('mongoose');

const examSessionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  startTime: { type: Date },
  endTime: { type: Date },
  timeRemaining: { type: Number }, // seconds remaining (for session recovery)
  examDuration: { type: Number, default: 7200 }, // 2 hours in seconds
  status: {
    type: String,
    enum: ['registered', 'active', 'submitted', 'disconnected', 'absent'],
    default: 'registered',
  },
  currentSubject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  currentQuestion: { type: Number, default: 0 },
  questionsAnswered: { type: Number, default: 0 },
  questionsRemaining: { type: Number, default: 0 },
  submittedAt: { type: Date },
  autoSubmitted: { type: Boolean, default: false },
  // Randomised question order per student per subject
  questionOrder: [{
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  }],
  // Browser/security events
  fullscreenExits: { type: Number, default: 0 },
  tabSwitches: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('ExamSession', examSessionSchema);