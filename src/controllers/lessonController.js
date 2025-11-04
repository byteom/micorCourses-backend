const asyncHandler = require('express-async-handler');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { deleteFromS3 } = require('../config/s3');

// @desc    Get lessons for a course
// @route   GET /api/courses/:courseId/lessons
// @access  Public (for published courses) / Private (for own courses)
const getLessons = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  // Check if course exists
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check access permissions
  let canAccess = false;
  
  if (course.status === 'published') {
    canAccess = true;
  } else if (req.user) {
    // Owner or admin can access unpublished courses
    canAccess = req.user.role === 'admin' || 
                course.creator.toString() === req.user._id.toString();
  }

  if (!canAccess) {
    return res.status(403).json({
      success: false,
      message: 'Access denied to course lessons'
    });
  }

  const lessons = await Lesson.find({ 
    course: courseId, 
    isActive: true 
  }).sort({ order: 1 });

  res.json({
    success: true,
    data: { lessons }
  });
});

// @desc    Get single lesson
// @route   GET /api/lessons/:id
// @access  Private (enrolled learners, course creator, admin)
const getLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findOne({
    _id: req.params.id,
    isActive: true
  }).populate('course', 'title creator status');

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check access permissions
  let canAccess = false;
  
  if (req.user.role === 'admin') {
    canAccess = true;
  } else if (lesson.course.creator.toString() === req.user._id.toString()) {
    canAccess = true;
  } else if (lesson.course.status === 'published') {
    // Check if user is enrolled in the course
    const user = await req.user.populate('enrolledCourses.course');
    canAccess = user.enrolledCourses.some(
      enrollment => enrollment.course._id.toString() === lesson.course._id.toString()
    );
  }

  if (!canAccess) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You must be enrolled in this course to view lessons.'
    });
  }

  res.json({
    success: true,
    data: { lesson }
  });
});

// @desc    Create lesson with video upload
// @route   POST /api/courses/:courseId/lessons
// @access  Private (Creator/Admin)
const createLesson = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, order, duration, notes } = req.body;

  // Check if course exists and user has permission
  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check ownership
  if (req.user.role !== 'admin' && course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to add lessons to this course'
    });
  }

  // Don't allow adding lessons to published courses unless admin
  if (course.status === 'published' && req.user.role !== 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot add lessons to published course'
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a video file'
    });
  }

  try {
    // Create lesson
    const lesson = await Lesson.create({
      title: title.trim(),
      description: description?.trim(),
      course: courseId,
      order: parseInt(order),
      video: {
        url: req.file.path,
        publicId: req.file.filename,
        duration: req.file.duration || 0
      },
      duration: parseInt(duration),
      notes: notes?.trim()
    });

    // Update course duration
    await course.calculateTotalDuration();
    await course.save();

    const populatedLesson = await Lesson.findById(lesson._id)
      .populate('course', 'title');

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: { lesson: populatedLesson }
    });
  } catch (error) {
    // If lesson creation fails, delete uploaded video
    if (req.file && req.file.filename) {
      try {
        await deleteFromS3(req.file.filename);
      } catch (deleteError) {
        console.error('Error deleting video after failed lesson creation:', deleteError);
      }
    }
    throw error;
  }
});

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private (Creator/Admin)
const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('course');

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check ownership
  if (req.user.role !== 'admin' && lesson.course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this lesson'
    });
  }

  // Don't allow updates to lessons in published courses unless admin
  if (lesson.course.status === 'published' && req.user.role !== 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update lessons in published course'
    });
  }

  const { title, description, order, duration, notes } = req.body;

  // Update fields
  if (title) lesson.title = title.trim();
  if (description !== undefined) lesson.description = description.trim();
  if (notes !== undefined) lesson.notes = notes.trim();
  if (duration) lesson.duration = parseInt(duration);

  // Handle order change
  if (order && parseInt(order) !== lesson.order) {
    const newOrder = parseInt(order);
    
    // Check if new order is already taken
    const existingLesson = await Lesson.findOne({
      course: lesson.course._id,
      order: newOrder,
      _id: { $ne: lesson._id }
    });

    if (existingLesson) {
      return res.status(400).json({
        success: false,
        message: `Lesson with order ${newOrder} already exists`
      });
    }

    lesson.order = newOrder;
  }

  await lesson.save();

  // Update course duration if lesson duration changed
  if (duration) {
    await lesson.course.calculateTotalDuration();
    await lesson.course.save();
  }

  res.json({
    success: true,
    message: 'Lesson updated successfully',
    data: { lesson }
  });
});

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private (Creator/Admin)
const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('course');

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  // Check ownership
  if (req.user.role !== 'admin' && lesson.course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this lesson'
    });
  }

  // Don't allow deletion from published courses unless admin
  if (lesson.course.status === 'published' && req.user.role !== 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete lessons from published course'
    });
  }

  // Delete video from S3
  if (lesson.video.publicId) {
    try {
      await deleteFromS3(lesson.video.publicId);
    } catch (error) {
      console.error('Error deleting video from S3:', error);
    }
  }

  await lesson.deleteOne();

  // Update course duration
  await lesson.course.calculateTotalDuration();
  await lesson.course.save();

  res.json({
    success: true,
    message: 'Lesson deleted successfully'
  });
});

// @desc    Reorder lessons
// @route   PUT /api/courses/:courseId/lessons/reorder
// @access  Private (Creator/Admin)
const reorderLessons = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { lessonOrders } = req.body; // Array of { lessonId, order }

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check ownership
  if (req.user.role !== 'admin' && course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to reorder lessons in this course'
    });
  }

  if (!Array.isArray(lessonOrders)) {
    return res.status(400).json({
      success: false,
      message: 'lessonOrders must be an array'
    });
  }

  // Update lesson orders
  for (const { lessonId, order } of lessonOrders) {
    await Lesson.findByIdAndUpdate(lessonId, { order: parseInt(order) });
  }

  // Get updated lessons
  const lessons = await Lesson.find({ 
    course: courseId, 
    isActive: true 
  }).sort({ order: 1 });

  res.json({
    success: true,
    message: 'Lessons reordered successfully',
    data: { lessons }
  });
});

// @desc    Mark lesson as complete
// @route   POST /api/lessons/:id/complete
// @access  Private (Learner)
const markLessonComplete = asyncHandler(async (req, res) => {
  const lessonId = req.params.id;
  const userId = req.user._id;

  const lesson = await Lesson.findById(lessonId).populate('course');
  
  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  const user = await User.findById(userId);
  
  // Check if user is enrolled in the course
  const enrollment = user.enrolledCourses.find(
    e => e.course.toString() === lesson.course._id.toString()
  );

  if (!enrollment) {
    return res.status(400).json({
      success: false,
      message: 'You must be enrolled in this course to mark lessons complete'
    });
  }

  // Check if lesson is already completed
  if (enrollment.completedLessons.includes(lessonId)) {
    return res.status(400).json({
      success: false,
      message: 'Lesson already marked as complete'
    });
  }

  // Add lesson to completed lessons
  enrollment.completedLessons.push(lessonId);

  // Calculate new progress
  const totalLessons = await Lesson.countDocuments({ 
    course: lesson.course._id, 
    isActive: true 
  });
  
  const completedCount = enrollment.completedLessons.length;
  enrollment.progress = Math.round((completedCount / totalLessons) * 100);

  // Check if course is completed (100% progress)
  if (enrollment.progress === 100 && !enrollment.certificateIssued) {
    enrollment.certificateIssued = true;
    
    // Generate certificate
    const Certificate = require('../models/Certificate');
    await Certificate.create({
      user: userId,
      course: lesson.course._id,
      completedAt: new Date(),
      certificateHash: require('crypto').randomBytes(32).toString('hex')
    });
  }

  await user.save();

  res.json({
    success: true,
    message: 'Lesson marked as complete',
    data: {
      progress: enrollment.progress,
      completedLessons: completedCount,
      totalLessons,
      certificateIssued: enrollment.certificateIssued
    }
  });
});

// @desc    Get lesson progress for user
// @route   GET /api/lessons/:id/progress
// @access  Private (Learner)
const getLessonProgress = asyncHandler(async (req, res) => {
  const lessonId = req.params.id;
  const userId = req.user._id;

  const lesson = await Lesson.findById(lessonId).populate('course');
  
  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  const user = await User.findById(userId);
  
  const enrollment = user.enrolledCourses.find(
    e => e.course.toString() === lesson.course._id.toString()
  );

  if (!enrollment) {
    return res.status(400).json({
      success: false,
      message: 'You are not enrolled in this course'
    });
  }

  const isCompleted = enrollment.completedLessons.includes(lessonId);

  res.json({
    success: true,
    data: {
      lessonId,
      isCompleted,
      courseProgress: enrollment.progress
    }
  });
});

module.exports = {
  getLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  markLessonComplete,
  getLessonProgress
};