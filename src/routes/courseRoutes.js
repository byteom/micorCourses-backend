const express = require('express');
const {
  getCourses,
  getCourse,
  searchCourses,
  getCoursesByCategory,
  enrollInCourse,
  getEnrolledCourses,
  rateCourse
} = require('../controllers/courseController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.get('/', getCourses);
router.get('/search', searchCourses);
router.get('/category/:category', getCoursesByCategory);
router.get('/:id', getCourse);

// Protected routes
router.post('/:id/enroll', protect, authorize('learner'), enrollInCourse);
router.get('/enrolled/my-courses', protect, authorize('learner'), getEnrolledCourses);
router.post('/:id/rate', protect, authorize('learner'), rateCourse);

module.exports = router;