const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { generateToken } = require('../middlewares/auth');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password, bio, role } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    return res.status(400).json({
      success: false,
      message: 'User already exists with this email'
    });
  }

  // Validate role
  const validRoles = ['learner', 'creator'];
  const userRole = role && validRoles.includes(role) ? role : 'learner';

  // Create user
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    bio: bio?.trim(),
    role: userRole
  });

  if (user) {
    const token = generateToken(user._id);
    
    // Set cookie (accessible by JavaScript for frontend)
    res.cookie('token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          bio: user.bio,
          avatar: user.avatar,
          createdAt: user.createdAt
        },
        token
      }
    });
  } else {
    res.status(400).json({
      success: false,
      message: 'Invalid user data'
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }

  // Check for user and include password for comparison
  const user = await User.findOne({ email: email.toLowerCase().trim() })
    .select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user account is active and not blocked
  if (!user.isActive || user.isBlocked || user.accountStatus === 'blocked' || user.accountStatus === 'deleted') {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated or blocked. Please contact support.'
    });
  }

  // Check password
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  const token = generateToken(user._id);
  
  // Set cookie (accessible by JavaScript for frontend)
  res.cookie('token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/'
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        avatar: user.avatar,
        creatorApplication: user.creatorApplication,
        createdAt: user.createdAt
      },
      token
    }
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('enrolledCourses.course', 'title thumbnail category level');

  res.json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        avatar: user.avatar,
        creatorApplication: user.creatorApplication,
        enrolledCourses: user.enrolledCourses,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  });
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio } = req.body;

  const user = await User.findById(req.user._id);

  if (user) {
    user.name = name?.trim() || user.name;
    user.bio = bio?.trim() || user.bio;

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          bio: updatedUser.bio,
          avatar: updatedUser.avatar,
          creatorApplication: updatedUser.creatorApplication,
          updatedAt: updatedUser.updatedAt
        }
      }
    });
  } else {
    res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
});

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Please provide current password and new password'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters'
    });
  }

  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = asyncHandler(async (req, res) => {
  res.cookie('token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    expires: new Date(0)
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// @desc    Apply for creator role
// @route   POST /api/auth/apply-creator
// @access  Private
const applyForCreator = asyncHandler(async (req, res) => {
  const { expertise, experience, portfolio } = req.body;

  if (!expertise || !experience) {
    return res.status(400).json({
      success: false,
      message: 'Please provide expertise and experience'
    });
  }

  const user = await User.findById(req.user._id);

  if (user.role !== 'learner') {
    return res.status(400).json({
      success: false,
      message: 'Only learners can apply for creator role'
    });
  }

  if (user.creatorApplication.status === 'pending') {
    return res.status(400).json({
      success: false,
      message: 'You already have a pending creator application'
    });
  }

  if (user.creatorApplication.status === 'approved') {
    return res.status(400).json({
      success: false,
      message: 'You are already a creator'
    });
  }

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
    message: 'Creator application submitted successfully',
    data: {
      creatorApplication: user.creatorApplication
    }
  });
});

module.exports = {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  applyForCreator
};