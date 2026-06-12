const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { type: String, unique: true },
  fullName: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  dateOfBirth: { type: Date },
  classSeekingAdmission: { type: String },
  examSubmitted: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sequenceNumber: { type: Number },
}, { timestamps: true });

// Auto-generate studentId before save
studentSchema.pre('save', async function (next) {
  if (this.studentId) return next();
  const count = await mongoose.model('Student').countDocuments();
  const seq = count + 1;
  this.sequenceNumber = seq;
  this.studentId = `GKC/EE/26/${String(seq).padStart(4, '0')}`;
  next();
});

module.exports = mongoose.model('Student', studentSchema);