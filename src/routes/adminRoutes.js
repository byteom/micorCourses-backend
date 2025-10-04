const express = require('express');
const {
  getDashboardStats,
  getAllUsers,
  updateUserStatus,
  getAllCourses,
  reviewCourse,
  getCreatorApplications,
  reviewCreatorApplication,
  getSystemLogs,
  getCourseEnrollments,
  getPendingCourses,
  approveCourse,
  rejectCourse,
  approveCreator,
  rejectCreator,
  blockUser,
  unblockUser,
  deleteUser,
  restrictUserCourses,
  unrestrictUserCourses,
  getUserDetails,
  getAllLearners,
  getAllCreators,
  getCourseDetails
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes are protected and for admins only
router.use(protect);
router.use(authorize('admin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id/details', getUserDetails);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/block', blockUser);
router.put('/users/:id/unblock', unblockUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/restrict-courses', restrictUserCourses);
router.put('/users/:id/unrestrict-courses', unrestrictUserCourses);

// Learner management
router.get('/learners', getAllLearners);

// Creator management
router.get('/creators', getAllCreators);

// Course management
router.get('/courses', getAllCourses);
router.get('/courses/pending', getPendingCourses);
router.put('/courses/:id/review', reviewCourse);
router.put('/courses/:id/approve', approveCourse);
router.put('/courses/:id/reject', rejectCourse);
router.get('/courses/:id/enrollments', getCourseEnrollments);
router.get('/courses/:id', getCourseDetails);

// Creator applications
router.get('/creator-applications', getCreatorApplications);
router.put('/creator-applications/:id/review', reviewCreatorApplication);
router.put('/creators/:id/approve', approveCreator);
router.put('/creators/:id/reject', rejectCreator);

// System logs
router.get('/logs', getSystemLogs);

module.exports = router;