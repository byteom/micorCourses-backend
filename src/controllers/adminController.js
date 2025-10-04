const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalCreators = await User.countDocuments({ role: 'creator' });
  const totalLearners = await User.countDocuments({ role: 'learner' });
  const totalCourses = await Course.countDocuments();
  const publishedCourses = await Course.countDocuments({ status: 'published' });
  const submittedCourses = await Course.countDocuments({ status: 'submitted' });
  const draftCourses = await Course.countDocuments({ status: 'draft' });
  const rejectedCourses = await Course.countDocuments({ status: 'rejected' });
  const pendingCreatorApplications = await User.countDocuments({ 
    'creatorApplication.status': 'pending' 
  });

  // Get recent activity
  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email role createdAt');

  const recentCourses = await Course.find()
    .populate('creator', 'name')
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title status creator createdAt');

  const recentApplications = await User.find({ 
    'creatorApplication.status': 'pending' 
  })
    .sort({ 'creatorApplication.appliedAt': -1 })
    .limit(5)
    .select('name email creatorApplication');

  // Calculate total enrollments
  const totalEnrollments = await User.aggregate([
    { $unwind: '$enrolledCourses' },
    { $count: 'total' }
  ]);

  const enrollmentCount = totalEnrollments.length > 0 ? totalEnrollments[0].total : 0;

  // Calculate total revenue from published courses
  const revenueData = await Course.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: null, totalRevenue: { $sum: '$price' } } }
  ]);

  const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

  res.json({
    success: true,
    data: {
      statistics: {
        totalUsers,
        totalCreators,
        totalLearners,
        totalCourses,
        publishedCourses,
        submittedCourses,
        draftCourses,
        rejectedCourses,
        pendingCreatorApplications,
        totalEnrollments: enrollmentCount,
        totalRevenue
      },
      recentActivity: {
        recentUsers,
        recentCourses,
        recentApplications
      }
    }
  });
});

// @desc    Get all users with pagination
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {};
  if (req.query.role) {
    query.role = req.query.role;
  }
  if (req.query.search) {
    query.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { email: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be active or inactive'
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.isActive = status === 'active';
  await user.save();

  res.json({
    success: true,
    message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    }
  });
});

// @desc    Get all courses with pagination
// @route   GET /api/admin/courses
// @access  Private (Admin)
const getAllCourses = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = {};
  if (req.query.status) {
    query.status = req.query.status;
  }
  if (req.query.search) {
    query.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { description: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  const courses = await Course.find(query)
    .populate('creator', 'name email')
    .sort({ createdAt: -1 })
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

// @desc    Review course (approve/reject)
// @route   PUT /api/admin/courses/:id/review
// @access  Private (Admin)
const reviewCourse = asyncHandler(async (req, res) => {
  const { action, rejectionReason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be approve or reject'
    });
  }

  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.status !== 'submitted') {
    return res.status(400).json({
      success: false,
      message: 'Course is not in submitted status'
    });
  }

  if (action === 'approve') {
    course.status = 'published';
    course.rejectionReason = undefined;
  } else {
    course.status = 'rejected';
    course.rejectionReason = rejectionReason || 'Course did not meet quality standards';
  }

  course.reviewedBy = req.user._id;
  course.reviewedAt = new Date();
  await course.save();

  const populatedCourse = await Course.findById(course._id)
    .populate('creator', 'name email');

  res.json({
    success: true,
    message: `Course ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    data: { course: populatedCourse }
  });
});

// @desc    Get creator applications
// @route   GET /api/admin/creator-applications
// @access  Private (Admin)
const getCreatorApplications = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  let query = { 'creatorApplication.status': 'pending' };
  if (req.query.status) {
    query['creatorApplication.status'] = req.query.status;
  }

  const users = await User.find(query)
    .select('-password')
    .sort({ 'creatorApplication.appliedAt': -1 })
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      applications: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

// @desc    Review creator application
// @route   PUT /api/admin/creator-applications/:id/review
// @access  Private (Admin)
const reviewCreatorApplication = asyncHandler(async (req, res) => {
  const { action, rejectionReason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be approve or reject'
    });
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.creatorApplication.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Application is not in pending status'
    });
  }

  if (action === 'approve') {
    user.role = 'creator';
    user.creatorApplication.status = 'approved';
    user.creatorApplication.rejectionReason = undefined;
  } else {
    user.creatorApplication.status = 'rejected';
    user.creatorApplication.rejectionReason = rejectionReason || 'Application did not meet requirements';
  }

  user.creatorApplication.reviewedBy = req.user._id;
  user.creatorApplication.reviewedAt = new Date();
  await user.save();

  res.json({
    success: true,
    message: `Creator application ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        creatorApplication: user.creatorApplication
      }
    }
  });
});

// @desc    Get system logs (mock)
// @route   GET /api/admin/logs
// @access  Private (Admin)
const getSystemLogs = asyncHandler(async (req, res) => {
  // Mock system logs - in real app, this would come from a logging system
  const logs = [
    {
      id: 1,
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      level: 'info',
      message: 'User john@example.com logged in',
      userId: '507f1f77bcf86cd799439011',
      ip: '192.168.1.1'
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      level: 'warning',
      message: 'Failed login attempt for user admin@example.com',
      userId: null,
      ip: '192.168.1.2'
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      level: 'info',
      message: 'Course "React Fundamentals" was published',
      userId: '507f1f77bcf86cd799439012',
      ip: '192.168.1.3'
    },
    {
      id: 4,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      level: 'error',
      message: 'Payment processing failed for user jane@example.com',
      userId: '507f1f77bcf86cd799439013',
      ip: '192.168.1.4'
    }
  ];

  res.json({
    success: true,
    data: { logs }
  });
});

// @desc    Get course enrollment details
// @route   GET /api/admin/courses/:id/enrollments
// @access  Private (Admin)
const getCourseEnrollments = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  const enrollments = await User.find({
    'enrolledCourses.course': course._id
  })
    .select('name email enrolledCourses.$')
    .populate('enrolledCourses.course', 'title');

  const enrollmentDetails = enrollments.map(user => {
    const enrollment = user.enrolledCourses.find(e => e.course._id.toString() === course._id.toString());
    return {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress,
      completedLessons: enrollment.completedLessons.length,
      certificateIssued: enrollment.certificateIssued
    };
  });

  res.json({
    success: true,
    data: {
      course: {
        _id: course._id,
        title: course.title,
        enrollmentCount: course.enrollmentCount
      },
      enrollments: enrollmentDetails
    }
  });
});

// @desc    Get all courses pending approval
// @route   GET /api/admin/courses/pending
// @access  Private (Admin)
const getPendingCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({
    status: { $in: ['submitted', 'pending_review'] }
  })
    .populate('creator', 'name email')
    .populate('lessons')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: courses
  });
});

// @desc    Approve a course
// @route   PUT /api/admin/courses/:id/approve
// @access  Private (Admin)
const approveCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const { feedback } = req.body;

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.status !== 'submitted' && course.status !== 'pending_review') {
    return res.status(400).json({
      success: false,
      message: 'Course is not pending approval'
    });
  }

  // Approve the course
  course.status = 'published';
  course.reviewedBy = req.user._id;
  course.reviewedAt = new Date();
  course.requiresReapproval = false;
  course.modificationReason = null;

  await course.save();

  res.json({
    success: true,
    message: 'Course approved successfully',
    data: course
  });
});

// @desc    Reject a course
// @route   PUT /api/admin/courses/:id/reject
// @access  Private (Admin)
const rejectCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  if (course.status !== 'submitted' && course.status !== 'pending_review') {
    return res.status(400).json({
      success: false,
      message: 'Course is not pending approval'
    });
  }

  // Reject the course
  course.status = 'rejected';
  course.reviewedBy = req.user._id;
  course.reviewedAt = new Date();
  course.rejectionReason = reason;
  course.requiresReapproval = false;
  course.modificationReason = null;

  await course.save();

  res.json({
    success: true,
    message: 'Course rejected successfully',
    data: course
  });
});

// @desc    Approve creator application
// @route   PUT /api/admin/creators/:id/approve
// @access  Private (Admin)
const approveCreator = asyncHandler(async (req, res) => {
  const creatorId = req.params.id;

  const creator = await User.findById(creatorId);
  if (!creator) {
    return res.status(404).json({
      success: false,
      message: 'Creator not found'
    });
  }

  if (creator.creatorApplication.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Creator application is not pending'
    });
  }

  creator.creatorApplication.status = 'approved';
  creator.creatorApplication.reviewedBy = req.user._id;
  creator.creatorApplication.reviewedAt = new Date();
  creator.role = 'creator'; // Change user role to creator

  await creator.save();

  res.json({
    success: true,
    message: 'Creator application approved successfully',
    data: creator
  });
});

// @desc    Reject creator application
// @route   PUT /api/admin/creators/:id/reject
// @access  Private (Admin)
const rejectCreator = asyncHandler(async (req, res) => {
  const creatorId = req.params.id;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Rejection reason is required'
    });
  }

  const creator = await User.findById(creatorId);
  if (!creator) {
    return res.status(404).json({
      success: false,
      message: 'Creator not found'
    });
  }

  if (creator.creatorApplication.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Creator application is not pending'
    });
  }

  creator.creatorApplication.status = 'rejected';
  creator.creatorApplication.reviewedBy = req.user._id;
  creator.creatorApplication.reviewedAt = new Date();
  creator.creatorApplication.rejectionReason = reason;

  await creator.save();

  res.json({
    success: true,
    message: 'Creator application rejected successfully',
    data: creator
  });
});

// @desc    Block a user
// @route   PUT /api/admin/users/:id/block
// @access  Private (Admin)
const blockUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      message: 'Block reason is required'
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role === 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot block admin users'
    });
  }

  user.isBlocked = true;
  user.accountStatus = 'blocked';
  user.blockedAt = new Date();
  user.blockedBy = req.user._id;
  user.blockReason = reason;

  await user.save();

  res.json({
    success: true,
    message: 'User blocked successfully',
    data: user
  });
});

// @desc    Unblock a user
// @route   PUT /api/admin/users/:id/unblock
// @access  Private (Admin)
const unblockUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  user.isBlocked = false;
  user.accountStatus = 'active';
  user.blockedAt = null;
  user.blockedBy = null;
  user.blockReason = null;

  await user.save();

  res.json({
    success: true,
    message: 'User unblocked successfully',
    data: user
  });
});

// @desc    Delete a user (soft delete)
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  if (user.role === 'admin') {
    return res.status(400).json({
      success: false,
      message: 'Cannot delete admin users'
    });
  }

  user.accountStatus = 'deleted';
  user.isActive = false;
  user.deletedAt = new Date();
  user.deletedBy = req.user._id;

  await user.save();

  res.json({
    success: true,
    message: 'User deleted successfully',
    data: user
  });
});

// @desc    Restrict user from specific courses
// @route   PUT /api/admin/users/:id/restrict-courses
// @access  Private (Admin)
const restrictUserCourses = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { courseIds, reason } = req.body;

  if (!courseIds || !Array.isArray(courseIds)) {
    return res.status(400).json({
      success: false,
      message: 'Course IDs array is required'
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Add courses to restricted list
  const newRestrictions = courseIds.filter(courseId => 
    !user.restrictedCourses.includes(courseId)
  );
  
  user.restrictedCourses.push(...newRestrictions);

  await user.save();

  res.json({
    success: true,
    message: 'User course restrictions updated successfully',
    data: {
      user,
      restrictedCourses: user.restrictedCourses,
      newRestrictions
    }
  });
});

// @desc    Remove course restrictions from user
// @route   PUT /api/admin/users/:id/unrestrict-courses
// @access  Private (Admin)
const unrestrictUserCourses = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { courseIds } = req.body;

  if (!courseIds || !Array.isArray(courseIds)) {
    return res.status(400).json({
      success: false,
      message: 'Course IDs array is required'
    });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Remove courses from restricted list
  user.restrictedCourses = user.restrictedCourses.filter(courseId => 
    !courseIds.includes(courseId.toString())
  );

  await user.save();

  res.json({
    success: true,
    message: 'User course restrictions removed successfully',
    data: {
      user,
      restrictedCourses: user.restrictedCourses
    }
  });
});

// @desc    Get detailed user information
// @route   GET /api/admin/users/:id/details
// @access  Private (Admin)
const getUserDetails = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findById(userId)
    .select('-password')
    .populate('enrolledCourses.course', 'title status creator')
    .populate('restrictedCourses', 'title status creator')
    .populate('blockedBy', 'name email')
    .populate('deletedBy', 'name email');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // Get additional statistics
  const totalEnrollments = user.enrolledCourses.length;
  const completedCourses = user.enrolledCourses.filter(e => e.certificateIssued).length;
  const totalProgress = user.enrolledCourses.reduce((sum, e) => sum + e.progress, 0);
  const averageProgress = totalEnrollments > 0 ? totalProgress / totalEnrollments : 0;

  // Get courses created (if creator)
  let createdCourses = [];
  if (user.role === 'creator') {
    const Course = require('../models/Course');
    createdCourses = await Course.find({ creator: userId })
      .select('title status enrollmentCount rating createdAt')
      .sort({ createdAt: -1 });
  }

  res.json({
    success: true,
    data: {
      user,
      statistics: {
        totalEnrollments,
        completedCourses,
        averageProgress,
        createdCourses: createdCourses.length
      },
      createdCourses,
      recentActivity: {
        lastLogin: user.updatedAt,
        accountCreated: user.createdAt,
        blockedAt: user.blockedAt,
        deletedAt: user.deletedAt
      }
    }
  });
});

// @desc    Get all learners with detailed information
// @route   GET /api/admin/learners
// @access  Private (Admin)
const getAllLearners = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const skip = (page - 1) * limit;

  let query = { role: 'learner' };
  
  if (status === 'active') query.accountStatus = 'active';
  if (status === 'blocked') query.isBlocked = true;
  if (status === 'deleted') query.accountStatus = 'deleted';
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const learners = await User.find(query)
    .select('-password')
    .populate('enrolledCourses.course', 'title')
    .populate('blockedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  // Add statistics for each learner
  const learnersWithStats = learners.map(learner => ({
    ...learner.toObject(),
    stats: {
      totalEnrollments: learner.enrolledCourses.length,
      completedCourses: learner.enrolledCourses.filter(e => e.certificateIssued).length,
      averageProgress: learner.enrolledCourses.length > 0 ? 
        learner.enrolledCourses.reduce((sum, e) => sum + e.progress, 0) / learner.enrolledCourses.length : 0
    }
  }));

  res.json({
    success: true,
    data: {
      learners: learnersWithStats,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Get all creators with detailed information
// @route   GET /api/admin/creators
// @access  Private (Admin)
const getAllCreators = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const skip = (page - 1) * limit;

  let query = { role: 'creator' };
  
  if (status === 'active') query.accountStatus = 'active';
  if (status === 'blocked') query.isBlocked = true;
  if (status === 'deleted') query.accountStatus = 'deleted';
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const creators = await User.find(query)
    .select('-password')
    .populate('blockedBy', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await User.countDocuments(query);

  // Get course statistics for each creator
  const Course = require('../models/Course');
  const creatorsWithStats = await Promise.all(creators.map(async (creator) => {
    const courses = await Course.find({ creator: creator._id });
    const totalCourses = courses.length;
    const publishedCourses = courses.filter(c => c.status === 'published').length;
    const totalEnrollments = courses.reduce((sum, c) => sum + c.enrollmentCount, 0);

    return {
      ...creator.toObject(),
      stats: {
        totalCourses,
        publishedCourses,
        draftCourses: totalCourses - publishedCourses,
        totalEnrollments,
        averageRating: courses.length > 0 ? 
          courses.reduce((sum, c) => sum + c.rating.average, 0) / courses.length : 0
      }
    };
  }));

  res.json({
    success: true,
    data: {
      creators: creatorsWithStats,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    }
  });
});

// @desc    Get course details by ID
// @route   GET /api/admin/courses/:id
// @access  Private (Admin)
const getCourseDetails = asyncHandler(async (req, res) => {
  const courseId = req.params.id;

  const course = await Course.findById(courseId)
    .populate('creator', 'name email')
    .populate('lessons', 'title description duration order isFree');

  if (!course) {
    return res.status(404).json({
      success: false,
      message: 'Course not found'
    });
  }

  res.json({
    success: true,
    data: course
  });
});


module.exports = {
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
};