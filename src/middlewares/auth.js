const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in cookies first, then in headers
  if (req.cookies.token) {
    token = req.cookies.token;
    console.log('Token found in cookies:', !!token);
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token found in headers:', !!token);
  }

  if (!token) {
    console.log('No token found in request');
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified successfully for user:', decoded.id);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      console.log('User not found for token:', decoded.id);
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User found:', req.user.name, 'Role:', req.user.role, 'Active:', req.user.isActive, 'Blocked:', req.user.isBlocked);

    // Check if user account is active and not blocked
    if (!req.user.isActive || req.user.isBlocked || req.user.accountStatus === 'blocked' || req.user.accountStatus === 'deleted') {
      console.log('User account is inactive or blocked');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated or blocked'
      });
    }

    console.log('User authorized successfully');
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
});

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// Check if user is creator or admin (for course management)
const creatorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  if (!['creator', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Creator or Admin role required.'
    });
  }

  next();
};

// Check if user owns the resource or is admin
const ownerOrAdmin = (Model, paramName = 'id') => {
  return asyncHandler(async (req, res, next) => {
    const resource = await Model.findById(req.params[paramName]);
    
    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      req.resource = resource;
      return next();
    }

    // Check ownership
    const isOwner = resource.creator ? 
      resource.creator.toString() === req.user._id.toString() :
      resource._id.toString() === req.user._id.toString();

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own resources.'
      });
    }

    req.resource = resource;
    next();
  });
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

module.exports = {
  protect,
  authorize,
  creatorOrAdmin,
  ownerOrAdmin,
  generateToken
};