const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const ExamSession = require('../models/ExamSession');
const ActivityLog = require('../models/ActivityLog');

// Admin login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.json({
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Student login (Student ID only)
const studentLogin = async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'Student ID required' });

    const student = await Student.findOne({ studentId: studentId.trim().toUpperCase() });
    if (!student) return res.status(404).json({ message: 'Student ID not found. Please contact the administrator.' });

    if (!student.isActive) {
      return res.status(403).json({ message: 'Your access has been disabled. Please contact the administrator.' });
    }

    if (student.examSubmitted) {
      return res.status(403).json({
        message: 'You have already completed this examination. Please contact the administrator.',
      });
    }

    // Log activity
    await ActivityLog.create({ student: student._id, action: 'Logged In' });

    // Get or create exam session
    let session = await ExamSession.findOne({ student: student._id });
    if (!session) {
      session = await ExamSession.create({ student: student._id, status: 'registered' });
    } else if (session.status === 'submitted') {
      return res.status(403).json({
        message: 'You have already completed this examination. Please contact the administrator.',
      });
    } else if (session.status === 'active' || session.status === 'disconnected') {
      // Session recovery — update status back to active
      session.status = 'active';
      await session.save();
      await ActivityLog.create({ student: student._id, action: 'Session Recovered' });
    }

    res.json({
      student: {
        id: student._id,
        studentId: student.studentId,
        fullName: student.fullName,
        gender: student.gender,
      },
      session: {
        status: session.status,
        startTime: session.startTime,
        timeRemaining: session.timeRemaining,
        examDuration: session.examDuration,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { adminLogin, studentLogin };