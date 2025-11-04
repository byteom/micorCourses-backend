const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const creatorRoutes = require('./routes/creatorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const learnerRoutes = require('./routes/learnerRoutes');

const app = express();

// Security middleware
app.use(helmet());

// Dynamic CORS allowlist (supports env var, localhost, and Vercel preview domains)
const baseAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://micro-course-frontend-2n2o-7gar33vtd-byteoms-projects.vercel.app',
  'https://microocourse-frontendd.vercel.app',
  process.env.CORS_ORIGINS
];

const envAllowed = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...baseAllowedOrigins, ...envAllowed])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests and same-origin
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isVercelPreview = /\.vercel\.app$/.test(origin);

    if (isExplicitlyAllowed || isVercelPreview) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// Ensure preflight works for all routes in various hosting setups
app.options('*', cors(corsOptions));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/learner', learnerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'MicroCourses API is healthy!' });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MicroCourses API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      test: '/api/test',
      auth: '/api/auth',
      courses: '/api/courses',
      lessons: '/api/lessons',
      creator: '/api/creator',
      admin: '/api/admin',
      learner: '/api/learner'
    },
    documentation: 'https://github.com/byteom/micorCourses-backend'
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

module.exports = app;