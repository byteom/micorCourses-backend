const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const { uploadToS3, deleteFromS3 } = require('../config/s3');

// @desc    Apply to become a creator
// @route   POST /api/creator/apply
// @access  Private (Learner)
const applyCreator = asyncHandler(async (req, res) => {
  const { expertise, experience, portfolio } = req.body;

  const user = await User.findById(req.user._id);

  // Check if user is already a creator or admin
  if (user.role === 'creator' || user.role === 'admin') {
    return res.status(400).json({
      success: false,
      message: 'You are already a creator or admin'
    });
  }

  // Check if user has already applied
  if (user.creatorApplication.status === 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Your creator application is already pending review'
    });
  }

  if (user.creatorApplication.status === 'approved') {
    return res.status(400).json({
      success: false,
      message: 'Your creator application has already been approved'
    });
  }

  // Update user with application details
  user.creatorApplication = {
    status: 'pending',
    appliedAt: new Date(),
    expertise: expertise.trim(),
    experience: experience.trim(),
    portfolio: portfolio?.trim()
  };

  await user.save();

  res.json({
    success: true,
    message: 'Creator application submitted successfully. Please wait for admin review.',
    data: {
      application: user.creatorApplication
    }
  });
});

// @desc    Get creator dashboard data
// @route   GET /api/creator/dashboard
// @access  Private (Creator/Admin)
const getCreatorDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get course statistics
  const totalCourses = await Course.countDocuments({ creator: userId });
  const publishedCourses = await Course.countDocuments({ 
    creator: userId, 
    status: 'published' 
  });
  const draftCourses = await Course.countDocuments({ 
    creator: userId, 
    status: 'draft' 
  });
  const submittedCourses = await Course.countDocuments({ 
    creator: userId, 
    status: 'submitted' 
  });

  // Get total enrollments across all courses
  const courses = await Course.find({ creator: userId });
  const totalEnrollments = courses.reduce((sum, course) => sum + course.enrollmentCount, 0);

  // Get total lessons
  const totalLessons = await Lesson.countDocuments({
    course: { $in: courses.map(c => c._id) }
  });

  // Get recent courses
  const recentCourses = await Course.find({ creator: userId })
    .populate('lessonCount')
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('title status enrollmentCount rating createdAt updatedAt');

  // Calculate total revenue (mock calculation)
  const totalRevenue = courses.reduce((sum, course) => {
    return sum + (course.enrollmentCount * course.price);
  }, 0);

  // Get monthly enrollment data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const enrollmentData = await User.aggregate([
    { $unwind: '$enrolledCourses' },
    {
      $lookup: {
        from: 'courses',
        localField: 'enrolledCourses.course',
        foreignField: '_id',
        as: 'courseInfo'
      }
    },
    { $unwind: '$courseInfo' },
    {
      $match: {
        'courseInfo.creator': userId,
        'enrolledCourses.enrolledAt': { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$enrolledCourses.enrolledAt' },
          month: { $month: '$enrolledCourses.enrolledAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.json({
    success: true,
    data: {
      statistics: {
        totalCourses,
        publishedCourses,
        draftCourses,
        submittedCourses,
        totalEnrollments,
        totalLessons,
        totalRevenue: totalRevenue.toFixed(2)
      },
      recentCourses,
      enrollmentData
    }
  });
});

// @desc    Get creator profile
// @route   GET /api/creator/profile
// @access  Private (Creator/Admin)
const getCreatorProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .select('-password');

  const courses = await Course.find({ creator: req.user._id })
    .populate('lessonCount')
    .sort({ createdAt: -1 });

  // Calculate total students across all courses
  const totalStudents = courses.reduce((sum, course) => sum + course.enrollmentCount, 0);

  // Calculate average rating
  const coursesWithRatings = courses.filter(course => course.rating.count > 0);
  const averageRating = coursesWithRatings.length > 0 
    ? coursesWithRatings.reduce((sum, course) => sum + course.rating.average, 0) / coursesWithRatings.length
    : 0;

  res.json({
    success: true,
    data: {
      creator: {
        ...user.toObject(),
        totalCourses: courses.length,
        totalStudents,
        averageRating: averageRating.toFixed(1)
      },
      courses
    }
  });
});

// @desc    Update creator profile
// @route   PUT /api/creator/profile
// @access  Private (Creator/Admin)
const updateCreatorProfile = asyncHandler(async (req, res) => {
  const { name, bio, expertise, portfolio } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  
  // Update creator application info if provided
  if (expertise) user.creatorApplication.expertise = expertise.trim();
  if (portfolio !== undefined) user.creatorApplication.portfolio = portfolio.trim();

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        creatorApplication: user.creatorApplication,
        updatedAt: user.updatedAt
      }
    }
  });
});

// @desc    Get creator earnings (mock)
// @route   GET /api/creator/earnings
// @access  Private (Creator/Admin)
const getCreatorEarnings = asyncHandler(async (req, res) => {
  const courses = await Course.find({ creator: req.user._id })
    .select('title price enrollmentCount createdAt');

  const earnings = courses.map(course => ({
    courseId: course._id,
    courseTitle: course.title,
    price: course.price,
    enrollments: course.enrollmentCount,
    revenue: (course.price * course.enrollmentCount).toFixed(2),
    createdAt: course.createdAt
  }));

  const totalRevenue = earnings.reduce((sum, earning) => sum + parseFloat(earning.revenue), 0);
  const totalEnrollments = earnings.reduce((sum, earning) => sum + earning.enrollments, 0);

  // Mock monthly earnings for the last 12 months
  const monthlyEarnings = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    
    // Mock earnings calculation (in real app, this would be based on actual enrollment dates)
    const monthlyRevenue = Math.random() * (totalRevenue / 12);
    
    monthlyEarnings.push({
      month: monthName,
      revenue: monthlyRevenue.toFixed(2),
      enrollments: Math.floor(Math.random() * 20)
    });
  }

  res.json({
    success: true,
    data: {
      summary: {
        totalRevenue: totalRevenue.toFixed(2),
        totalEnrollments,
        totalCourses: courses.length,
        averageRevenuePerCourse: courses.length > 0 ? (totalRevenue / courses.length).toFixed(2) : '0.00'
      },
      courseEarnings: earnings,
      monthlyEarnings
    }
  });
});

// @desc    Create new course
// @route   POST /api/creator/courses
// @access  Private (Creator)
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


  // Check if creator is blocked
  if (req.user.isBlocked || req.user.accountStatus === 'blocked') {
    return res.status(403).json({
      success: false,
      message: 'Your account is blocked. You cannot create courses.'
    });
  }

  try {
    // Handle thumbnail upload
    let thumbnailData = {};
    if (req.file) {
      const uploadResult = await uploadToS3(req.file, 'microcourses/thumbnails');
      thumbnailData = {
        url: uploadResult.url,
        publicId: uploadResult.key // Store S3 key as publicId for compatibility
      };
    }

    // Parse JSON strings for arrays
    let parsedTags = [];
    let parsedRequirements = [];
    let parsedOutcomes = [];

    try {
      parsedTags = tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [];
      parsedRequirements = requirements ? (typeof requirements === 'string' ? JSON.parse(requirements) : requirements) : [];
      parsedOutcomes = outcomes ? (typeof outcomes === 'string' ? JSON.parse(outcomes) : outcomes) : [];
    } catch (parseError) {
      console.error('Error parsing JSON arrays:', parseError);
      return res.status(400).json({
        success: false,
        message: 'Invalid data format for tags, requirements, or outcomes'
      });
    }

    const course = await Course.create({
      title: title.trim(),
      description: description.trim(),
      shortDescription: shortDescription.trim(),
      category,
      level,
      price: parseFloat(price),
      creator: req.user._id,
      thumbnail: thumbnailData,
      tags: parsedTags.map(tag => tag.trim()),
      requirements: parsedRequirements.map(req => req.trim()),
      outcomes: parsedOutcomes.map(outcome => outcome.trim()),
      duration: 0 // Will be calculated when lessons are added
    });

    // Calculate total duration (will be 0 initially since no lessons exist yet)
    await course.calculateTotalDuration();

    const populatedCourse = await Course.findById(course._id)
      .populate('creator', 'name avatar bio');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course: populatedCourse }
    });
  } catch (error) {
    console.error('Course creation error:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    throw error;
  }
});

// @desc    Get creator's courses
// @route   GET /api/creator/courses
// @access  Private (Creator)
const getMyCourses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = { creator: req.user._id };

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

// @desc    Update course
// @route   PUT /api/creator/courses/:id
// @access  Private (Creator)
const updateCourse = asyncHandler(async (req, res) => {
  let course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this course'
    });
  }

  // Allow updates to published courses but mark for re-approval
  const isPublishedCourse = course.status === 'published';

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

  if (title) course.title = title.trim();
  if (description) course.description = description.trim();
  if (shortDescription) course.shortDescription = shortDescription.trim();
  if (category) course.category = category;
  if (level) course.level = level;
  if (price !== undefined) course.price = parseFloat(price);
  
  // Parse JSON strings for arrays
  if (tags) {
    try {
      const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      course.tags = parsedTags.map(tag => tag.trim());
    } catch (error) {
      console.error('Error parsing tags:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid tags format'
      });
    }
  }
  
  if (requirements) {
    try {
      const parsedRequirements = typeof requirements === 'string' ? JSON.parse(requirements) : requirements;
      course.requirements = parsedRequirements.map(req => req.trim());
    } catch (error) {
      console.error('Error parsing requirements:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid requirements format'
      });
    }
  }
  
  if (outcomes) {
    try {
      const parsedOutcomes = typeof outcomes === 'string' ? JSON.parse(outcomes) : outcomes;
      course.outcomes = parsedOutcomes.map(outcome => outcome.trim());
    } catch (error) {
      console.error('Error parsing outcomes:', error);
      return res.status(400).json({
        success: false,
        message: 'Invalid outcomes format'
      });
    }
  }

  // Handle thumbnail upload if provided
  if (req.file) {
    try {
      // Delete old thumbnail if exists
      if (course.thumbnail && course.thumbnail.publicId) {
        await deleteFromS3(course.thumbnail.publicId);
      }

      // Upload new thumbnail to S3
      const uploadResult = await uploadToS3(req.file, 'microcourses/thumbnails');
      
      // Update course thumbnail with the uploaded file info
      course.thumbnail = {
        url: uploadResult.url,
        publicId: uploadResult.key // Store S3 key as publicId for compatibility
      };
    } catch (uploadError) {
      console.error('Thumbnail upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Error uploading thumbnail'
      });
    }
  }

  if (course.status === 'rejected') {
    course.status = 'draft';
    course.rejectionReason = undefined;
  }

  // If updating a published course, mark for re-approval
  if (isPublishedCourse && (title || description || category || level)) {
    course.status = 'pending_review';
    course.requiresReapproval = true;
    course.modificationReason = 'Course content modified - requires re-approval';
    course.lastModified = new Date();
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
// @route   DELETE /api/creator/courses/:id
// @access  Private (Creator)
const deleteCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this course'
    });
  }

  if (course.status === 'published' && course.enrollmentCount > 0) {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete published course with active enrollments'
    });
  }

  await course.deleteOne();

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
});

// @desc    Create lesson
// @route   POST /api/creator/courses/:courseId/lessons
// @access  Private (Creator)
const createLesson = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const { title, description, duration, notes } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to add lessons to this course'
    });
  }

  if (course.status === 'published') {
    return res.status(400).json({
      success: false,
      message: 'Cannot add lessons to published course'
    });
  }

  // Check if video file is uploaded
  if (!req.files || !req.files.video || req.files.video.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a video file'
    });
  }

  const videoFile = req.files.video[0];
  const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

  try {
    // Upload video to S3
    console.log('Uploading video file:', {
      filename: videoFile.originalname,
      mimetype: videoFile.mimetype,
      size: videoFile.size,
      hasBuffer: !!videoFile.buffer
    });

    const videoResult = await uploadToS3(videoFile, 'microcourses/videos');

    // Upload thumbnail to S3 if provided
    let thumbnailResult = null;
    if (thumbnailFile) {
      console.log('Uploading thumbnail file:', {
        filename: thumbnailFile.originalname,
        mimetype: thumbnailFile.mimetype,
        size: thumbnailFile.size,
        hasBuffer: !!thumbnailFile.buffer
      });

      thumbnailResult = await uploadToS3(thumbnailFile, 'microcourses/thumbnails');
    }

    const nextOrder = await Lesson.getNextOrder(courseId);

    const lesson = await Lesson.create({
      title: title.trim(),
      description: description?.trim(),
      course: courseId,
      order: nextOrder,
      video: {
        url: videoResult.url,
        publicId: videoResult.key, // Store S3 key as publicId for compatibility
        duration: 0 // Video duration would need to be extracted separately if needed
      },
      thumbnail: thumbnailResult ? {
        url: thumbnailResult.url,
        publicId: thumbnailResult.key // Store S3 key as publicId for compatibility
      } : undefined,
      duration: parseInt(duration),
      notes: notes?.trim()
    });

    await course.calculateTotalDuration();
    await course.save();

    const populatedLesson = await Lesson.findById(lesson._id)
      .populate('course', 'title');

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      data: { lesson: populatedLesson }
    });

  } catch (uploadError) {
    console.error('Upload error:', uploadError);
    console.error('Upload error details:', {
      message: uploadError.message,
      http_code: uploadError.http_code,
      name: uploadError.name
    });
    return res.status(500).json({
      success: false,
      message: 'Error uploading files to S3',
      error: uploadError.message
    });
  }
});

// @desc    Update lesson
// @route   PUT /api/creator/lessons/:id
// @access  Private (Creator)
const updateLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('course');

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  if (lesson.course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this lesson'
    });
  }

  // Allow lesson updates but mark course for re-approval if published
  const isPublishedCourse = lesson.course.status === 'published';

  const { title, description, duration, notes } = req.body;

  if (title) lesson.title = title.trim();
  if (description !== undefined) lesson.description = description.trim();
  if (notes !== undefined) lesson.notes = notes.trim();
  if (duration) lesson.duration = parseInt(duration);

  // Handle thumbnail update if provided
  if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
    const thumbnailFile = req.files.thumbnail[0];
    
    try {
      // Delete old thumbnail if exists
      if (lesson.thumbnail && lesson.thumbnail.publicId) {
        await deleteFromS3(lesson.thumbnail.publicId);
      }

      // Upload new thumbnail to S3
      const thumbnailResult = await uploadToS3(thumbnailFile, 'microcourses/thumbnails');

      // Update lesson thumbnail
      lesson.thumbnail = {
        url: thumbnailResult.url,
        publicId: thumbnailResult.key // Store S3 key as publicId for compatibility
      };
    } catch (uploadError) {
      console.error('Thumbnail upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Error uploading thumbnail'
      });
    }
  }

  await lesson.save();

  if (duration) {
    await lesson.course.calculateTotalDuration();
  }

  // If updating lesson in published course, mark course for re-approval
  if (isPublishedCourse && (title || description)) {
    lesson.course.status = 'pending_review';
    lesson.course.requiresReapproval = true;
    lesson.course.modificationReason = 'Lesson content modified - requires re-approval';
    lesson.course.lastModified = new Date();
  }

  await lesson.course.save();

  res.json({
    success: true,
    message: 'Lesson updated successfully',
    data: { lesson }
  });
});

// @desc    Delete lesson
// @route   DELETE /api/creator/lessons/:id
// @access  Private (Creator)
const deleteLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('course');

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  if (lesson.course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this lesson'
    });
  }

  if (lesson.course.status === 'published') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete lessons from published course'
    });
  }

  await lesson.deleteOne();

  await lesson.course.calculateTotalDuration();
  await lesson.course.save();

  res.json({
    success: true,
    message: 'Lesson deleted successfully'
  });
});

// @desc    Get course analytics
// @route   GET /api/creator/courses/:id/analytics
// @access  Private (Creator)
const getCourseAnalytics = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view analytics for this course'
    });
  }

  const totalLessons = await Lesson.countDocuments({ course: course._id });
  const totalRevenue = (course.enrollmentCount * course.price).toFixed(2);

  // Mock completion rate (in real app, calculate from user progress)
  const completionRate = Math.floor(Math.random() * 40) + 60; // 60-100%

  res.json({
    success: true,
    data: {
      course: {
        title: course.title,
        status: course.status,
        enrollmentCount: course.enrollmentCount,
        rating: course.rating,
        price: course.price
      },
      analytics: {
        totalLessons,
        totalRevenue,
        completionRate,
        averageRating: course.rating.average,
        totalRatings: course.rating.count
      }
    }
  });
});

// @desc    Upload video for lesson
// @route   POST /api/creator/upload/video
// @access  Private (Creator)
const uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a video file'
    });
  }

  try {
    const uploadResult = await uploadToS3(req.file, 'microcourses/videos');
    
    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        url: uploadResult.url,
        publicId: uploadResult.key,
        duration: 0 // Video duration would need to be extracted separately if needed
      }
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading video',
      error: error.message
    });
  }
});

// @desc    Submit course for review
// @route   POST /api/creator/courses/:id/submit
// @access  Private (Creator)
const submitCourse = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

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


// @desc    Get lesson details
// @route   GET /api/creator/lessons/:id
// @access  Private (Creator)
const getLesson = asyncHandler(async (req, res) => {
  const lesson = await Lesson.findById(req.params.id).populate('course');

  if (!lesson) {
    return res.status(404).json({
      success: false,
      message: 'Lesson not found'
    });
  }

  if (lesson.course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this lesson'
    });
  }

  res.json({
    success: true,
    data: { lesson }
  });
});

// @desc    Get course lessons
// @route   GET /api/creator/courses/:courseId/lessons
// @access  Private (Creator)
const getCourseLessons = asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view lessons for this course'
    });
  }

  const lessons = await Lesson.find({ course: courseId, isActive: true })
    .sort({ order: 1 });

  res.json({
    success: true,
    data: { lessons }
  });
});

// @desc    Get students enrolled in creator's courses
// @route   GET /api/creator/students
// @access  Private (Creator)
const getStudents = asyncHandler(async (req, res) => {
  const creatorId = req.user._id;
  
  // Get all courses created by this creator
  const courses = await Course.find({ creator: creatorId }).select('_id title');
  
  if (courses.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        students: [],
        totalStudents: 0,
        courses: []
      }
    });
  }

  const courseIds = courses.map(course => course._id);

  // Get all users enrolled in these courses
  const users = await User.find({
    'enrolledCourses.course': { $in: courseIds }
  }).select('name email enrolledCourses avatar');

  // Process student data
  const students = users.map(user => {
    const enrollments = user.enrolledCourses.filter(enrollment => 
      courseIds.includes(enrollment.course)
    );

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      enrollments: enrollments.map(enrollment => {
        const course = courses.find(c => c._id.toString() === enrollment.course.toString());
        return {
          courseId: enrollment.course,
          courseTitle: course ? course.title : 'Unknown Course',
          enrolledAt: enrollment.enrolledAt,
          progress: enrollment.progress,
          completedLessons: enrollment.completedLessons.length,
          certificateIssued: enrollment.certificateIssued
        };
      }),
      totalEnrollments: enrollments.length,
      totalProgress: enrollments.length > 0 ? 
        enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length : 0
    };
  });

  res.status(200).json({
    success: true,
    data: {
      students,
      totalStudents: students.length,
      courses: courses.map(course => ({
        _id: course._id,
        title: course.title
      }))
    }
  });
});

// @desc    Get detailed student progress for a specific course
// @route   GET /api/creator/courses/:courseId/students
// @access  Private (Creator)
const getCourseStudents = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const creatorId = req.user._id;

  // Verify course belongs to creator
  const course = await Course.findById(courseId).populate('lessons');
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.creator.toString() !== creatorId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view students for this course'
    });
  }

  // Get all students enrolled in this course
  const users = await User.find({
    'enrolledCourses.course': courseId
  }).select('name email enrolledCourses avatar');

  const students = users.map(user => {
    const enrollment = user.enrolledCourses.find(e => 
      e.course.toString() === courseId
    );

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress,
      completedLessons: enrollment.completedLessons.length,
      totalLessons: course.lessons.length,
      certificateIssued: enrollment.certificateIssued,
      lastActivity: enrollment.enrolledAt // Could be enhanced with actual last activity
    };
  });

  // Sort by progress (highest first)
  students.sort((a, b) => b.progress - a.progress);

  res.status(200).json({
    success: true,
    data: {
      course: {
        _id: course._id,
        title: course.title,
        totalLessons: course.lessons.length
      },
      students,
      totalStudents: students.length,
      averageProgress: students.length > 0 ? 
        students.reduce((sum, s) => sum + s.progress, 0) / students.length : 0,
      completedStudents: students.filter(s => s.certificateIssued).length
    }
  });
});

// @desc    Get student analytics for creator
// @route   GET /api/creator/analytics/students
// @access  Private (Creator)
const getStudentAnalytics = asyncHandler(async (req, res) => {
  const creatorId = req.user._id;
  
  // Get all courses created by this creator
  const courses = await Course.find({ creator: creatorId }).select('_id title');
  const courseIds = courses.map(course => course._id);

  if (courseIds.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalStudents: 0,
        totalEnrollments: 0,
        averageProgress: 0,
        completionRate: 0,
        studentsByCourse: [],
        monthlyEnrollments: []
      }
    });
  }

  // Get enrollment statistics
  const users = await User.find({
    'enrolledCourses.course': { $in: courseIds }
  }).select('enrolledCourses');

  let totalStudents = 0;
  let totalEnrollments = 0;
  let totalProgress = 0;
  let completedCourses = 0;

  const studentsByCourse = courses.map(course => {
    const courseEnrollments = users.filter(user => 
      user.enrolledCourses.some(e => e.course.toString() === course._id.toString())
    );

    const courseStats = courseEnrollments.reduce((stats, user) => {
      const enrollment = user.enrolledCourses.find(e => 
        e.course.toString() === course._id.toString()
      );
      
      stats.totalEnrollments++;
      stats.totalProgress += enrollment.progress;
      if (enrollment.certificateIssued) stats.completed++;
      
      return stats;
    }, { totalEnrollments: 0, totalProgress: 0, completed: 0 });

    return {
      courseId: course._id,
      courseTitle: course.title,
      totalStudents: courseEnrollments.length,
      totalEnrollments: courseStats.totalEnrollments,
      averageProgress: courseStats.totalEnrollments > 0 ? 
        courseStats.totalProgress / courseStats.totalEnrollments : 0,
      completedStudents: courseStats.completed
    };
  });

  // Calculate overall statistics
  users.forEach(user => {
    const creatorEnrollments = user.enrolledCourses.filter(e => 
      courseIds.includes(e.course)
    );
    
    if (creatorEnrollments.length > 0) {
      totalStudents++;
      totalEnrollments += creatorEnrollments.length;
      totalProgress += creatorEnrollments.reduce((sum, e) => sum + e.progress, 0);
      completedCourses += creatorEnrollments.filter(e => e.certificateIssued).length;
    }
  });

  res.status(200).json({
    success: true,
    data: {
      totalStudents,
      totalEnrollments,
      averageProgress: totalEnrollments > 0 ? totalProgress / totalEnrollments : 0,
      completionRate: totalEnrollments > 0 ? (completedCourses / totalEnrollments) * 100 : 0,
      studentsByCourse,
      monthlyEnrollments: [] // Could be enhanced with actual monthly data
    }
  });
});

module.exports = {
  applyCreator,
  getCreatorDashboard,
  getCreatorProfile,
  updateCreatorProfile,
  getCreatorEarnings,
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
};