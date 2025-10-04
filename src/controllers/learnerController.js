const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Certificate = require('../models/Certificate');
const CertificateService = require('../services/certificateService');

// @desc    Enroll in a course
// @route   POST /api/learner/courses/:id/enroll
// @access  Private (Learner)
const enrollInCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user._id;

  // Check if user is blocked
  if (req.user.isBlocked || req.user.accountStatus === 'blocked') {
    return res.status(403).json({
      success: false,
      message: 'Your account is blocked. Please contact support.'
    });
  }

  // Check if user is restricted from this course
  if (req.user.restrictedCourses && req.user.restrictedCourses.includes(courseId)) {
    return res.status(403).json({
      success: false,
      message: 'You are restricted from enrolling in this course'
    });
  }

  // Check if course exists and is published
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.status !== 'published') {
    return res.status(400).json({
      success: false,
      message: 'Course is not available for enrollment'
    });
  }

  // Check if user is already enrolled
  const user = await User.findById(userId);
  const isAlreadyEnrolled = user.enrolledCourses.some(
    enrollment => enrollment.course.toString() === courseId
  );

  if (isAlreadyEnrolled) {
    return res.status(400).json({
      success: false,
      message: 'You are already enrolled in this course'
    });
  }

  // Enroll user in course
  user.enrolledCourses.push({
    course: courseId,
    enrolledAt: new Date(),
    progress: 0,
    completedLessons: [],
    certificateIssued: false
  });

  await user.save();

  // Update course enrollment count
  await course.updateEnrollmentCount();

  res.status(201).json({
    success: true,
    message: 'Successfully enrolled in course',
    data: {
      courseId,
      enrolledAt: new Date()
    }
  });
});

// @desc    Mark lesson as completed
// @route   POST /api/learner/courses/:courseId/lessons/:lessonId/complete
// @access  Private (Learner)
const completeLesson = asyncHandler(async (req, res) => {
  const { courseId, lessonId } = req.params;
  const userId = req.user._id;

  // Check if user is enrolled in the course
  const user = await User.findById(userId);
  const enrollment = user.enrolledCourses.find(
    enrollment => enrollment.course.toString() === courseId
  );

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'You are not enrolled in this course'
    });
  }

  // Check if lesson exists and belongs to the course
  const lesson = await Lesson.findOne({
    _id: lessonId,
    course: courseId,
    isActive: true
  });

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check if lesson is already completed
  if (enrollment.completedLessons.includes(lessonId)) {
    return res.status(400).json({
      success: false,
      message: 'Lesson already completed'
    });
  }

  // Add lesson to completed lessons
  enrollment.completedLessons.push(lessonId);

  // Calculate new progress
  const course = await Course.findById(courseId).populate('lessons');
  const totalLessons = course.lessons.length;
  const completedLessons = enrollment.completedLessons.length;
  enrollment.progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Check if course is completed (100% progress)
  if (enrollment.progress === 100 && !enrollment.certificateIssued) {
    try {
      // Generate certificate using the static method
      console.log('Generating certificate for user:', user._id, 'course:', courseId);
      const certificate = await Certificate.generateCertificate(user, courseId);
      console.log('Certificate generated successfully:', certificate.serialHash);
      
      enrollment.certificateIssued = true;
      enrollment.certificateHash = certificate.serialHash;
    } catch (error) {
      console.error('Error generating certificate:', error);
      // Don't fail the lesson completion if certificate generation fails
    }
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: 'Lesson completed successfully',
    data: {
      lessonId,
      progress: enrollment.progress,
      courseCompleted: enrollment.progress === 100,
      certificateIssued: enrollment.certificateIssued
    }
  });
});

// @desc    Get enrolled courses
// @route   GET /api/learner/courses
// @access  Private (Learner)
const getEnrolledCourses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'enrolledCourses.course',
      select: 'title description thumbnail category level duration rating enrollmentCount creator',
      populate: {
        path: 'creator',
        select: 'name'
      }
    });

  res.status(200).json({
    success: true,
    data: user.enrolledCourses
  });
});

// @desc    Get course progress
// @route   GET /api/learner/courses/:id/progress
// @access  Private (Learner)
const getCourseProgress = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const user = await User.findById(req.user._id);

  const enrollment = user.enrolledCourses.find(
    enrollment => enrollment.course.toString() === courseId
  );

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Course not found in your enrollments'
    });
  }

  // Get course with lessons
  const course = await Course.findById(courseId).populate('lessons');
  
  const totalLessons = course.lessons.length;
  const completedLessonsCount = enrollment.completedLessons.length;
  const progress = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      courseId,
      totalLessons,
      completedLessons: enrollment.completedLessons, // Return the array of lesson IDs
      progress,
      enrolledAt: enrollment.enrolledAt,
      certificateIssued: enrollment.certificateIssued
    }
  });
});

// @desc    Get certificate
// @route   GET /api/learner/courses/:id/certificate
// @access  Private (Learner)
const getCertificate = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const user = await User.findById(req.user._id);

  const enrollment = user.enrolledCourses.find(
    enrollment => enrollment.course.toString() === courseId
  );

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Course not found in your enrollments'
    });
  }

  if (!enrollment.certificateIssued) {
    return res.status(400).json({
      success: false,
      message: 'Certificate not yet issued. Complete the course first.'
    });
  }

  const certificate = await Certificate.findOne({
    learner: req.user._id,
    course: courseId
  }).populate('course', 'title creator')
    .populate('learner', 'name email')
    .populate('issuedBy', 'name');

  if (!certificate) {
    return res.status(404).json({
      success: false,
      message: 'Certificate not found'
    });
  }

  // Generate PDF certificate
  try {
    const certificateData = {
      learnerName: certificate.learner.name,
      courseTitle: certificate.course.title,
      courseDuration: certificate.courseDuration,
      totalLessons: certificate.totalLessons,
      completionDate: certificate.completionDate,
      serialHash: certificate.serialHash,
      grade: certificate.grade,
      issuedByName: certificate.issuedBy?.name || 'MicroCourses Platform'
    };

    const pdfBuffer = await CertificateService.generatePDFCertificate(certificateData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.serialHash}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating certificate PDF'
    });
  }
});

// @desc    Get course recommendations
// @route   GET /api/learner/recommendations
// @access  Private (Learner)
const getRecommendations = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  // Get enrolled course categories
  const enrolledCourses = await Course.find({
    _id: { $in: user.enrolledCourses.map(e => e.course) }
  }).select('category');

  const enrolledCategories = [...new Set(enrolledCourses.map(c => c.category))];

  // Find courses in similar categories that user hasn't enrolled in
  const recommendations = await Course.find({
    _id: { $nin: user.enrolledCourses.map(e => e.course) },
    category: { $in: enrolledCategories },
    status: 'published',
    isActive: true
  })
    .populate('creator', 'name')
    .sort({ 'rating.average': -1, enrollmentCount: -1 })
    .limit(10);

  // If no category-based recommendations, get popular courses
  if (recommendations.length < 5) {
    const popularCourses = await Course.find({
      _id: { $nin: user.enrolledCourses.map(e => e.course) },
      status: 'published',
      isActive: true
    })
      .populate('creator', 'name')
      .sort({ enrollmentCount: -1, 'rating.average': -1 })
      .limit(10 - recommendations.length);

    recommendations.push(...popularCourses);
  }

  res.status(200).json({
    success: true,
    data: recommendations
  });
});

// @desc    Get learning statistics
// @route   GET /api/learner/stats
// @access  Private (Learner)
const getLearningStats = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  const totalEnrolled = user.enrolledCourses.length;
  const completedCourses = user.enrolledCourses.filter(e => e.certificateIssued).length;
  const totalCompletedLessons = user.enrolledCourses.reduce(
    (total, enrollment) => total + enrollment.completedLessons.length, 0
  );

  // Calculate total learning time
  const enrolledCourseIds = user.enrolledCourses.map(e => e.course);
  const courses = await Course.find({ _id: { $in: enrolledCourseIds } });
  const totalLearningTime = courses.reduce((total, course) => total + course.duration, 0);

  res.status(200).json({
    success: true,
    data: {
      totalEnrolled,
      completedCourses,
      inProgress: totalEnrolled - completedCourses,
      totalCompletedLessons,
      totalLearningTime, // in minutes
      averageProgress: totalEnrolled > 0 ? 
        user.enrolledCourses.reduce((sum, e) => sum + e.progress, 0) / totalEnrolled : 0
    }
  });
});

// @desc    Get course lessons for enrolled learners
// @route   GET /api/learner/courses/:id/lessons
// @access  Private (Learner)
const getCourseLessons = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user._id;

  // Check if user is enrolled in the course
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check if user is enrolled by looking at user's enrolledCourses
  const user = await User.findById(userId);
  const enrollment = user.enrolledCourses.find(
    enrollment => enrollment.course.toString() === courseId.toString()
  );

  if (!enrollment) {
    return res.status(403).json({
      success: false,
      message: 'You are not enrolled in this course'
    });
  }

  // Get lessons for the course
  const lessons = await Lesson.find({ 
    course: courseId, 
    isActive: true 
  }).sort({ order: 1 });

  res.json({
    success: true,
    data: { lessons }
  });
});

// @desc    Get certificate HTML preview
// @route   GET /api/learner/courses/:id/certificate/preview
// @access  Private (Learner)
const getCertificatePreview = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const user = await User.findById(req.user._id);

  const enrollment = user.enrolledCourses.find(
    enrollment => enrollment.course.toString() === courseId
  );

  if (!enrollment) {
    return res.status(404).json({
      success: false,
      message: 'Course not found in your enrollments'
    });
  }

  if (!enrollment.certificateIssued) {
    return res.status(400).json({
      success: false,
      message: 'Certificate not yet issued. Complete the course first.'
    });
  }

  const certificate = await Certificate.findOne({
    learner: req.user._id,
    course: courseId
  }).populate('course', 'title creator')
    .populate('learner', 'name email')
    .populate('issuedBy', 'name');

  if (!certificate) {
    return res.status(404).json({
      success: false,
      message: 'Certificate not found'
    });
  }

  // Generate HTML certificate
  const certificateData = {
    learnerName: certificate.learner.name,
    courseTitle: certificate.course.title,
    courseDuration: certificate.courseDuration,
    totalLessons: certificate.totalLessons,
    completionDate: certificate.completionDate,
    serialHash: certificate.serialHash,
    grade: certificate.grade,
    issuedByName: certificate.issuedBy?.name || 'MicroCourses Platform'
  };

  const htmlCertificate = await CertificateService.generateCertificateHTML(certificateData);

  res.setHeader('Content-Type', 'text/html');
  res.send(htmlCertificate);
});

module.exports = {
  enrollInCourse,
  completeLesson,
  getEnrolledCourses,
  getCourseProgress,
  getCertificate,
  getCertificatePreview,
  getRecommendations,
  getLearningStats,
  getCourseLessons
};