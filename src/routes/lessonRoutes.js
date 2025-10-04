const express = require('express');
const {
  getLesson,
  markLessonComplete,
  getLessonProgress
} = require('../controllers/lessonController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Protected routes - learners only
router.get('/:id', protect, authorize('learner'), getLesson);
router.post('/:id/complete', protect, authorize('learner'), markLessonComplete);
router.get('/:id/progress', protect, authorize('learner'), getLessonProgress);

module.exports = router;