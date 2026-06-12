const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

// Admin JWT authentication
const adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) return res.status(401).json({ message: 'Admin not found' });

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Student session auth (studentId in header)
const studentAuth = async (req, res, next) => {
  try {
    const studentId = req.headers['x-student-id'];
    if (!studentId) return res.status(401).json({ message: 'Student ID required' });

    const student = await Student.findOne({ studentId, isActive: true });
    if (!student) return res.status(401).json({ message: 'Student not found or inactive' });

    req.student = student;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { adminAuth, studentAuth };