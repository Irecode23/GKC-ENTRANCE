const Student = require('../models/Student');
const ExamSession = require('../models/ExamSession');
const Answer = require('../models/Answer');
const Result = require('../models/Result');
const ActivityLog = require('../models/ActivityLog');

// Register a candidate
const registerStudent = async (req, res) => {
  try {
    const { fullName, gender, phone, email, dateOfBirth, classSeekingAdmission } = req.body;

    if (!fullName || !gender || !phone || !email) {
      return res.status(400).json({ message: 'Full name, gender, phone and email are required' });
    }

    // Check for duplicate email
    const existingEmail = await Student.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ message: 'A student with this email already exists' });
    }

    // Check for duplicate phone
    const existingPhone = await Student.findOne({ phone: phone.trim() });
    if (existingPhone) {
      return res.status(400).json({ message: 'A student with this phone number already exists' });
    }

    const student = await Student.create({
      fullName: fullName.trim(),
      gender,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      dateOfBirth: dateOfBirth || null,
      classSeekingAdmission: classSeekingAdmission || '',
    });

    res.status(201).json({ message: 'Student registered successfully', student });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A student with these details already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all students
const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ sequenceNumber: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single student
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const { fullName, gender, phone, email, dateOfBirth, classSeekingAdmission } = req.body;
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { fullName, gender, phone, email, dateOfBirth, classSeekingAdmission },
      { new: true, runValidators: true }
    );
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student updated', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    await ExamSession.deleteOne({ student: student._id });
    await Answer.deleteMany({ student: student._id });
    await Result.deleteOne({ student: student._id });
    await ActivityLog.deleteMany({ student: student._id });
    await student.deleteOne();

    res.json({ message: 'Student and all associated data deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset exam access
const resetExamAccess = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.examSubmitted = false;
    await student.save();

    await ExamSession.deleteOne({ student: student._id });
    await Answer.deleteMany({ student: student._id });
    await Result.deleteOne({ student: student._id });

    await ActivityLog.create({ student: student._id, action: 'Exam Access Reset by Admin' });

    res.json({ message: 'Exam access reset. Student can retake the exam.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Toggle student active status
const toggleStudentAccess = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.isActive = !student.isActive;
    await student.save();

    res.json({ message: `Student ${student.isActive ? 'activated' : 'deactivated'}`, student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get student activity log
const getActivityLog = async (req, res) => {
  try {
    const logs = await ActivityLog.find({ student: req.params.id }).sort({ timestamp: 1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  registerStudent,
  getAllStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  resetExamAccess,
  toggleStudentAccess,
  getActivityLog,
};