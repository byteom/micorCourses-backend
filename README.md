# MicroCourses API

A comprehensive Learning Management System (LMS) backend built with Node.js, Express, and MongoDB.

## Features

- **User Management**: Registration, authentication, and role-based access control
- **Course Management**: Create, update, and manage courses with lessons
- **Learning Progress**: Track student progress and issue certificates
- **Admin Panel**: Comprehensive admin controls for user and content management
- **File Upload**: Video and image upload with AWS S3 integration

## User Roles

- **Learner**: Can enroll in courses, track progress, and earn certificates
- **Creator**: Can create and manage courses and lessons
- **Admin**: Full system access and management capabilities

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/apply-creator` - Apply for creator role

### Courses (Public)
- `GET /api/courses` - Get all published courses
- `GET /api/courses/:id` - Get single course
- `GET /api/courses/search` - Search courses
- `GET /api/courses/category/:category` - Get courses by category

### Courses (Learner)
- `POST /api/courses/:id/enroll` - Enroll in course
- `GET /api/courses/enrolled/my-courses` - Get enrolled courses
- `POST /api/courses/:id/rate` - Rate a course

### Lessons (Learner)
- `GET /api/lessons/:id` - Get lesson details
- `POST /api/lessons/:id/complete` - Mark lesson as complete
- `GET /api/lessons/:id/progress` - Get lesson progress

### Creator Routes
- `POST /api/creator/courses` - Create new course
- `GET /api/creator/courses` - Get creator's courses
- `PUT /api/creator/courses/:id` - Update course
- `DELETE /api/creator/courses/:id` - Delete course
- `POST /api/creator/courses/:courseId/lessons` - Create lesson
- `PUT /api/creator/lessons/:id` - Update lesson
- `DELETE /api/creator/lessons/:id` - Delete lesson
- `GET /api/creator/courses/:id/analytics` - Get course analytics
- `POST /api/creator/upload/video` - Upload video

### Learner Routes
- `GET /api/learner/courses` - Get enrolled courses
- `GET /api/learner/courses/:id/progress` - Get course progress
- `GET /api/learner/courses/:id/certificate` - Get certificate
- `GET /api/learner/recommendations` - Get course recommendations
- `GET /api/learner/stats` - Get learning statistics

### Admin Routes
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/courses` - Get all courses
- `PUT /api/admin/courses/:id/review` - Review course
- `GET /api/admin/creator-applications` - Get creator applications
- `PUT /api/admin/creator-applications/:id/review` - Review creator application
- `GET /api/admin/logs` - Get system logs

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure your environment variables
4. Start the server: `npm run dev`

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT secret key
- `AWS_ACCESS_KEY_ID` - AWS access key ID
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_S3_BUCKET_NAME` - S3 bucket name for file storage
- `NODE_ENV` - Environment (development/production)

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data

## Database Models

- **User**: User accounts with role-based permissions
- **Course**: Course information and metadata
- **Lesson**: Individual lessons within courses
- **Certificate**: Completion certificates for learners

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Handling

The API returns consistent error responses with appropriate HTTP status codes and descriptive messages.

## File Upload

Video and image uploads are handled through AWS S3 integration with automatic file management and CDN delivery.