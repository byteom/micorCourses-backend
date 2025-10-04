const express = require('express');
const {
  enrollInCourse,
  completeLesson,
  getEnrolledCourses,
  getCourseProgress,
  getCertificate,
  getCertificatePreview,
  getRecommendations,
  getLearningStats,
  getCourseLessons
} = require('../controllers/learnerController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected and for learners only
router.use(protect);
router.use(authorize('learner'));

// Learning management
router.post('/courses/:id/enroll', enrollInCourse);
router.post('/courses/:courseId/lessons/:lessonId/complete', completeLesson);
router.get('/courses', getEnrolledCourses);
router.get('/courses/:id/lessons', getCourseLessons);
router.get('/courses/:id/progress', getCourseProgress);
router.get('/courses/:id/certificate', getCertificate);
router.get('/courses/:id/certificate/preview', getCertificatePreview);
router.get('/recommendations', getRecommendations);
router.get('/stats', getLearningStats);

module.exports = router;