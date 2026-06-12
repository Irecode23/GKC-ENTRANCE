const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const {
  registerStudent, getAllStudents, getStudent, updateStudent,
  deleteStudent, resetExamAccess, toggleStudentAccess, getActivityLog,
} = require('../controllers/studentController');

router.use(adminAuth);

router.post('/', registerStudent);
router.get('/', getAllStudents);
router.get('/:id', getStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);
router.post('/:id/reset-exam', resetExamAccess);
router.post('/:id/toggle-access', toggleStudentAccess);
router.get('/:id/activity-log', getActivityLog);

module.exports = router;