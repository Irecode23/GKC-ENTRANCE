const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const { createSubject, getAllSubjects, updateSubject, deleteSubject } = require('../controllers/subjectController');

// Public: candidates also need subject list
router.get('/', getAllSubjects);

router.post('/', adminAuth, createSubject);
router.put('/:id', adminAuth, updateSubject);
router.delete('/:id', adminAuth, deleteSubject);

module.exports = router;