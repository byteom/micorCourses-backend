const asyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const { deleteFromS3, uploadToS3 } = require('../config/s3');

// @desc    Get all published courses
// @route   GET /api/courses
// @access  Public
const getCourses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build query
  let query = { status: 'published', isActive: true };

  // Search functionality
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  // Category filter
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Level filter
  if (req.query.level) {
    query.level = req.query.level;
  }

  // Price range filter
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
  }

  // Sort options
  let sortOptions = { createdAt: -1 };
  if (req.query.sort === 'popular') {
    sortOptions = { enrollmentCount: -1 };
  } else if (req.query.sort === 'rating') {
    sortOptions = { 'rating.average': -1 };
  } else if (req.query.sort === 'price_low') {
    sortOptions = { price: 1 };
  } else if (req.query.sort === 'price_high') {
    sortOptions = { price: -1 };
  } else if (req.query.sort === 'newest') {
    sortOptions = { createdAt: -1 };
  }

  // Execute query
  const courses = await Course.find(query)
    .populate('creator', 'name avatar bio')
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean();

  // Get total count for pagination
  const total = await Course.countDocuments(query);

  res.json({
    success: true,
    data: {
      courses: courses || [],
      pagination: {
        page,
        limit,
        total: total || 0,
        pages: Math.ceil((total || 0) / limit) || 1
      }
    }
  });
});

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Public
const getCourse = asyncHandler(async (req, res) => {
  const course = await Course.findOne({
    _id: req.params.id,
    status: 'published',
    isActive: true
  })
    .populate('creator', 'name avatar bio')
    .populate({
      path: 'lessons',
      match: { isActive: true },
      select: 'title description order duration'
    });

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  res.json({
    success: true,
    data: { course }
  });
});

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Creator/Admin)
const createCourse = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    shortDescription,
    category,
    level,
    price,
    tags,
    requirements,
    outcomes
  } = req.body;

  const course = await Course.create({
    title: title.trim(),
    description: description.trim(),
    shortDescription: shortDescription.trim(),
    category,
    level,
    price: parseFloat(price),
    creator: req.user._id,
    tags: tags ? tags.map(tag => tag.trim()) : [],
    requirements: requirements ? requirements.map(req => req.trim()) : [],
    outcomes: outcomes ? outcomes.map(outcome => outcome.trim()) : [],
    duration: 0 // Will be calculated when lessons are added
  });

  const populatedCourse = await Course.findById(course._id)
    .populate('creator', 'name avatar bio');

  res.status(201).json({
    success: true,
    message: 'Course created successfully',
    data: { course: populatedCourse }
  });
});

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Creator/Admin)
const updateCourse = asyncHandler(async (req, res) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check ownership (creator can only update their own courses, admin can update any)
  if (req.user.role !== 'admin' && course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this course'
    });
  }

  // Don't allow updates to published courses unless admin
  if (course.status === 'published' && req.user.role !== 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update published course. Please contact admin.'
    });
  }

  const {
    title,
    description,
    shortDescription,
    category,
    level,
    price,
    tags,
    requirements,
    outcomes
  } = req.body;

  // Update fields
  if (title) course.title = title.trim();
  if (description) course.description = description.trim();
  if (shortDescription) course.shortDescription = shortDescription.trim();
  if (category) course.category = category;
  if (level) course.level = level;
  if (price !== undefined) course.price = parseFloat(price);
  if (tags) course.tags = tags.map(tag => tag.trim());
  if (requirements) course.requirements = requirements.map(req => req.trim());
  if (outcomes) course.outcomes = outcomes.map(outcome => outcome.trim());

  // If course was rejected and being updated, reset status to draft
  if (course.status === 'rejected') {
    course.status = 'draft';
    course.rejectionReason = undefined;
  }

  await course.save();

  const updatedCourse = await Course.findById(course._id)
    .populate('creator', 'name avatar bio');

  res.json({
    success: true,
    message: 'Course updated successfully',
    data: { course: updatedCourse }
  });
});

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Creator/Admin)
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

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
      message: 'Not authorized to delete this course'
    });
  }

  // Don't allow deletion of published courses with enrollments unless admin
  if (course.status === 'published' && course.enrollmentCount > 0 && req.user.role !== 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete published course with active enrollments'
    });
  }

  // Delete associated lessons and their videos from S3
  const lessons = await Lesson.find({ course: course._id });
  for (const lesson of lessons) {
    if (lesson.video.publicId) {
      try {
        await deleteFromS3(lesson.video.publicId);
      } catch (error) {
        console.error('Error deleting video from S3:', error);
      }
    }
  }

  // Delete course thumbnail from S3
  if (course.thumbnail && course.thumbnail.publicId) {
    try {
      await deleteFromS3(course.thumbnail.publicId);
    } catch (error) {
      console.error('Error deleting thumbnail from S3:', error);
    }
  }

  await course.deleteOne();

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
});

// @desc    Upload course thumbnail
// @route   POST /api/courses/:id/thumbnail
// @access  Private (Creator/Admin)
const uploadThumbnail = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

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
      message: 'Not authorized to update this course'
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a thumbnail image'
    });
  }

  // Delete old thumbnail if exists
  if (course.thumbnail && course.thumbnail.publicId) {
    try {
      await deleteFromS3(course.thumbnail.publicId);
    } catch (error) {
      console.error('Error deleting old thumbnail:', error);
    }
  }

  // Upload new thumbnail to S3
  const uploadResult = await uploadToS3(req.file, 'microcourses/thumbnails');

  // Update course with new thumbnail
  course.thumbnail = {
    url: uploadResult.url,
    publicId: uploadResult.key // Store S3 key as publicId for compatibility
  };

  await course.save();

  res.json({
    success: true,
    message: 'Thumbnail uploaded successfully',
    data: {
      thumbnail: course.thumbnail
    }
  });
});

// @desc    Submit course for review
// @route   PUT /api/courses/:id/submit
// @access  Private (Creator)
const submitCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Check ownership
  if (course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to submit this course'
    });
  }

  // Check if course has lessons
  const lessonCount = await Lesson.countDocuments({ course: course._id, isActive: true });
  if (lessonCount === 0) {
    return res.status(400).json({
      success: false,
      message: 'Course must have at least one lesson before submission'
    });
  }

  // Check if course has thumbnail
  if (!course.thumbnail || !course.thumbnail.url) {
    return res.status(400).json({
      success: false,
      message: 'Course must have a thumbnail before submission'
    });
  }

  // Only allow submission from draft or rejected status
  if (!['draft', 'rejected'].includes(course.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot submit course with status: ${course.status}`
    });
  }

  course.status = 'submitted';
  course.rejectionReason = undefined;
  await course.save();

  res.json({
    success: true,
    message: 'Course submitted for review successfully',
    data: { course }
  });
});

// @desc    Get creator's courses
// @route   GET /api/courses/my-courses
// @access  Private (Creator/Admin)
const getMyCourses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = { creator: req.user._id };

  // Status filter
  if (req.query.status) {
    query.status = req.query.status;
  }

  const courses = await Course.find(query)
    .populate('lessonCount')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Course.countDocuments(query);

  res.json({
    success: true,
    data: {
      courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Search courses
// @route   GET /api/courses/search
// @access  Public
const searchCourses = asyncHandler(async (req, res) => {
  const { q, category, level, minPrice, maxPrice } = req.query;
  
  if (!q) {
    return res.status(400).json({
      success: false,
      message: 'Search query is required'
    });
  }

  let query = {
    status: 'published',
    isActive: true,
    $text: { $search: q }
  };

  if (category) query.category = category;
  if (level) query.level = level;
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = parseFloat(minPrice);
    if (maxPrice) query.price.$lte = parseFloat(maxPrice);
  }

  const courses = await Course.find(query)
    .populate('creator', 'name avatar')
    .populate('lessonCount')
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);

  res.json({
    success: true,
    data: { courses }
  });
});

// @desc    Get courses by category
// @route   GET /api/courses/category/:category
// @access  Public
const getCoursesByCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  const query = {
    category,
    status: 'published',
    isActive: true
  };

  const courses = await Course.find(query)
    .populate('creator', 'name avatar')
    .populate('lessonCount')
    .sort({ 'rating.average': -1, enrollmentCount: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Course.countDocuments(query);

  res.json({
    success: true,
    data: {
      courses,
      category,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Enroll in course
// @route   POST /api/courses/:id/enroll
// @access  Private (Learner)
const enrollInCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user._id;

  const course = await Course.findOne({
    _id: courseId,
    status: 'published',
    isActive: true
  });

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  const user = await User.findById(userId);

  // Check if already enrolled
  const alreadyEnrolled = user.enrolledCourses.some(
    enrollment => enrollment.course.toString() === courseId
  );

  if (alreadyEnrolled) {
    return res.status(400).json({
      success: false,
      message: 'Already enrolled in this course'
    });
  }

  // Add course to user's enrolled courses
  user.enrolledCourses.push({
    course: courseId,
    enrolledAt: new Date(),
    progress: 0,
    completedLessons: []
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

// @desc    Get enrolled courses
// @route   GET /api/courses/enrolled/my-courses
// @access  Private (Learner)
const getEnrolledCourses = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate({
      path: 'enrolledCourses.course',
      select: 'title description thumbnail category level duration rating creator',
      populate: {
        path: 'creator',
        select: 'name'
      }
    });

  res.json({
    success: true,
    data: user.enrolledCourses
  });
});

// @desc    Rate course
// @route   POST /api/courses/:id/rate
// @access  Private (Learner)
const rateCourse = asyncHandler(async (req, res) => {
  const { rating } = req.body;
  const courseId = req.params.id;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5'
    });
  }

  const user = await User.findById(req.user._id);
  const enrollment = user.enrolledCourses.find(
    e => e.course.toString() === courseId
  );

  if (!enrollment) {
    return res.status(400).json({
      success: false,
      message: 'You must be enrolled in this course to rate it'
    });
  }

  // For simplicity, we'll just update the course rating
  // In a real app, you'd want to store individual ratings
  const course = await Course.findById(courseId);
  
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  // Simple rating calculation (in real app, store individual ratings)
  const currentTotal = course.rating.average * course.rating.count;
  course.rating.count += 1;
  course.rating.average = (currentTotal + rating) / course.rating.count;

  await course.save();

  res.json({
    success: true,
    message: 'Course rated successfully',
    data: {
      rating: course.rating
    }
  });
});

module.exports = {
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadThumbnail,
  submitCourse,
  getMyCourses,
  searchCourses,
  getCoursesByCategory,
  enrollInCourse,
  getEnrolledCourses,
  rateCourse
};