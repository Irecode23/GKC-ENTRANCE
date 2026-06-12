const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  createQuestion, getQuestionsBySubject, getAllQuestions, updateQuestion, deleteQuestion,
} = require('../controllers/questionController');

const imageFields = upload.fields([
  { name: 'questionImage', maxCount: 1 },
  { name: 'optionAImage', maxCount: 1 },
  { name: 'optionBImage', maxCount: 1 },
  { name: 'optionCImage', maxCount: 1 },
  { name: 'optionDImage', maxCount: 1 },
]);

router.get('/', adminAuth, getAllQuestions);
router.get('/subject/:subjectId', adminAuth, getQuestionsBySubject);
router.post('/', adminAuth, imageFields, createQuestion);
router.put('/:id', adminAuth, imageFields, updateQuestion);
router.delete('/:id', adminAuth, deleteQuestion);

module.exports = router;