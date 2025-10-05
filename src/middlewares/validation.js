const asyncHandler = require('express-async-handler');

// Validate course creation/update (robust to multipart/form-data, trims and normalizes)
const validateCourse = asyncHandler(async (req, res, next) => {
  const raw = req.body || {};
  const title = typeof raw.title === 'string' ? raw.title.trim() : raw.title;
  const description = typeof raw.description === 'string' ? raw.description.trim() : raw.description;
  const shortDescription = typeof raw.shortDescription === 'string' ? raw.shortDescription.trim() : raw.shortDescription;
  const categoryInput = typeof raw.category === 'string' ? raw.category.trim() : raw.category;
  const levelInput = typeof raw.level === 'string' ? raw.level.trim() : raw.level;
  const priceInput = raw.price;

  const errors = [];

  if (!title || title.length === 0) {
    errors.push('Title is required');
  } else if (title.length > 100) {
    errors.push('Title cannot exceed 100 characters');
  }

  if (!description || description.length === 0) {
    errors.push('Description is required');
  } else if (description.length > 2000) {
    errors.push('Description cannot exceed 2000 characters');
  }

  if (!shortDescription || shortDescription.length === 0) {
    errors.push('Short description is required');
  } else if (shortDescription.length > 200) {
    errors.push('Short description cannot exceed 200 characters');
  }

  const validCategories = [
    'Programming', 'Design', 'Business', 'Marketing',
    'Photography', 'Music', 'Health', 'Language', 'Other'
  ];
  const categoryMatch = typeof categoryInput === 'string'
    ? validCategories.find(c => c.toLowerCase() === categoryInput.toLowerCase())
    : undefined;
  if (!categoryMatch) {
    errors.push('Valid category is required');
  } else {
    req.body.category = categoryMatch; // normalize
  }

  const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
  const levelMatch = typeof levelInput === 'string'
    ? validLevels.find(l => l.toLowerCase() === levelInput.toLowerCase())
    : undefined;
  if (!levelMatch) {
    errors.push('Valid level is required');
  } else {
    req.body.level = levelMatch; // normalize
  }

  const priceNumber = typeof priceInput === 'string' ? parseFloat(priceInput) : priceInput;
  if (priceNumber === undefined || priceNumber === null || isNaN(priceNumber)) {
    errors.push('Price is required and must be a valid number');
  } else if (priceNumber < 0) {
    errors.push('Price cannot be negative');
  } else {
    req.body.price = priceNumber; // normalize
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
  const raw = req.body || {};
  const title = typeof raw.title === 'string' ? raw.title.trim() : raw.title;
  const duration = raw.duration;
  const order = raw.order;

  const errors = [];

  if (!title || title.length === 0) {
    errors.push('Title is required');
  } else if (title.length > 100) {
    errors.push('Title cannot exceed 100 characters');
  }

  // For creation (POST to /courses/:courseId/lessons), order is computed server-side
  const isCreate = req.method === 'POST' && !!req.params.courseId;
  if (!isCreate) {
    if (order === undefined || order === null) {
      errors.push('Lesson order is required');
    } else if (isNaN(order) || Number(order) < 1) {
      errors.push('Order must be a positive number');
    }
  }

  // Duration is optional on create (we can infer from uploaded video); if provided, validate
  if (duration !== undefined && duration !== null && duration !== '') {
    if (isNaN(duration) || Number(duration) < 1) {
      errors.push('Duration must be at least 1 minute when provided');
    }
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