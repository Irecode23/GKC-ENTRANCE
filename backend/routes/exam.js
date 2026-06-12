const express = require('express');
const router = express.Router();
const { studentAuth } = require('../middleware/auth');
const { startExam, getExamQuestions, saveAnswer, submitExam, logSecurityEvent } = require('../controllers/examController');

router.use(studentAuth);

router.post('/start', startExam);
router.get('/questions/:subjectId', getExamQuestions);
router.post('/answer', saveAnswer);
router.post('/submit', submitExam);
router.post('/security-event', logSecurityEvent);

module.exports = router;