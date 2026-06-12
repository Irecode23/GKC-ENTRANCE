const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  action: { type: String, required: true }, // e.g. "Logged In", "Started Examination"
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

module.exports = mongoose.model('ActivityLog', activityLogSchema);