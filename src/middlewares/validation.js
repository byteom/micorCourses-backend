const asyncHandler = require('express-async-handler');

// Validate course creation/update
const validateCourse = asyncHandler(async (req, res, next) => {
  const { title, description, shortDescription, category, level, price } = req.body;

  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  } else if (title.length > 100) {
    errors.push('Title cannot exceed 100 characters');
  }

  if (!description || description.trim().length === 0) {
    errors.push('Description is required');
  } else if (description.length > 2000) {
    errors.push('Description cannot exceed 2000 characters');
  }

  if (!shortDescription || shortDescription.trim().length === 0) {
    errors.push('Short description is required');
  } else if (shortDescription.length > 200) {
    errors.push('Short description cannot exceed 200 characters');
  }

  const validCategories = [
    'Programming', 'Design', 'Business', 'Marketing', 
    'Photography', 'Music', 'Health', 'Language', 'Other'
  ];
  if (!category || !validCategories.includes(category)) {
    errors.push('Valid category is required');
  }

  const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
  if (!level || !validLevels.includes(level)) {
    errors.push('Valid level is required');
  }

  if (price === undefined || price === null) {
    errors.push('Price is required');
  } else if (isNaN(price) || price < 0) {
    errors.push('Price must be a valid number and cannot be negative');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
});

// Validate lesson creation/update
const validateLesson = asyncHandler(async (req, res, next) => {
  const { title, order, duration } = req.body;

  const errors = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  } else if (title.length > 100) {
    errors.push('Title cannot exceed 100 characters');
  }

  if (!order) {
    errors.push('Lesson order is required');
  } else if (isNaN(order) || order < 1) {
    errors.push('Order must be a positive number');
  }

  if (!duration) {
    errors.push('Duration is required');
  } else if (isNaN(duration) || duration < 1) {
    errors.push('Duration must be at least 1 minute');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
});

// Validate user registration
const validateRegistration = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  const errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  } else if (name.length > 50) {
    errors.push('Name cannot exceed 50 characters');
  }

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  } else {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email');
    }
  }

  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
});

// Validate creator application
const validateCreatorApplication = asyncHandler(async (req, res, next) => {
  const { expertise, experience } = req.body;

  const errors = [];

  if (!expertise || expertise.trim().length === 0) {
    errors.push('Expertise is required');
  } else if (expertise.length > 500) {
    errors.push('Expertise cannot exceed 500 characters');
  }

  if (!experience || experience.trim().length === 0) {
    errors.push('Experience is required');
  } else if (experience.length > 1000) {
    errors.push('Experience cannot exceed 1000 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
});

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Ensure reasonable limits
  req.query.page = Math.max(1, page);
  req.query.limit = Math.min(Math.max(1, limit), 50); // Max 50 items per page

  next();
};

// Validate user login
const validateLogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!email || email.trim().length === 0) {
    errors.push('Email is required');
  }

  if (!password || password.trim().length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
});

// Alias for registration validation
const validateRegister = validateRegistration;

module.exports = {
  validateCourse,
  validateLesson,
  validateRegistration,
  validateRegister,
  validateLogin,
  validateCreatorApplication,
  validatePagination
};