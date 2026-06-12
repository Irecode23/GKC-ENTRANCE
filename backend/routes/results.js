const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/auth');
const {
  getAllResults, getStudentResult, updateResultStatus,
  getAnalytics, exportSingleResult, exportAllResults,
} = require('../controllers/resultController');

router.use(adminAuth);

router.get('/', getAllResults);
router.get('/analytics', getAnalytics);
router.get('/export-all', exportAllResults);
router.get('/:studentId', getStudentResult);
router.put('/:studentId/status', updateResultStatus);
router.get('/:studentId/export', exportSingleResult);

module.exports = router;