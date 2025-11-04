const express = require('express');
const {
  createCourse,
  getMyCourses,
  updateCourse,
  deleteCourse,
  createLesson,
  updateLesson,
  deleteLesson,
  getCourseAnalytics,
  uploadVideo,
  submitCourse,
  getLesson,
  getCourseLessons,
  getStudents,
  getCourseStudents,
  getStudentAnalytics
} = require('../controllers/creatorController');
const { protect, authorize } = require('../middlewares/auth');
const { validateCourse, validateLesson } = require('../middlewares/validation');
const { uploadThumbnail, uploadLesson, uploadVideo: uploadVideoMiddleware } = require('../config/s3');

const router = express.Router();

// All routes are protected and for creators only
router.use(protect);
router.use(authorize('creator'));

// Course management
router.post('/courses', uploadThumbnail.single('thumbnail'), validateCourse, createCourse);
router.get('/courses', getMyCourses);
router.put('/courses/:id', uploadThumbnail.single('thumbnail'), validateCourse, updateCourse);
router.delete('/courses/:id', deleteCourse);
router.get('/courses/:id/analytics', getCourseAnalytics);
router.post('/courses/:id/submit', submitCourse);

// Lesson management
router.get('/courses/:courseId/lessons', getCourseLessons);
router.post('/courses/:courseId/lessons', uploadLesson.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), validateLesson, createLesson);
router.get('/lessons/:id', getLesson);
router.put('/lessons/:id', uploadLesson.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), validateLesson, updateLesson);
router.delete('/lessons/:id', deleteLesson);

// File upload
router.post('/upload/video', uploadVideoMiddleware.single('video'), uploadVideo);


// Student management
router.get('/students', getStudents);
router.get('/courses/:courseId/students', getCourseStudents);
router.get('/analytics/students', getStudentAnalytics);

module.exports = router;