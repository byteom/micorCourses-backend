# Creator Endpoints

Base path: `/api/creator`

All routes require: `protect` and `authorize('creator')` (middleware applied at router-level).

## POST /courses
- Multipart form, fields: `title`, `description`, `shortDescription`, `category`, `level`, `price`, `tags?[]`, `requirements?[]`, `outcomes?[]`
- File: `thumbnail` (image)
- Validation: `validateCourse`

## GET /courses
- Query: `page?`, `limit?`, `status?`
- Returns creator's courses with pagination

## PUT /courses/:id
- May include new `thumbnail` file
- Updates normalize arrays (accept JSON strings)

## DELETE /courses/:id

## GET /courses/:id/analytics
- Returns analytics summary for the course

## POST /courses/:id/submit
- Submit drafted/rejected course for review

## GET /courses/:courseId/lessons
- Returns lessons for a course owned by creator

## POST /courses/:courseId/lessons
- Multipart upload using `uploadLesson.fields([{ name:'video' }, { name:'thumbnail' }])`
- Validation: `validateLesson`

## GET /lessons/:id

## PUT /lessons/:id
- Optional `thumbnail` file

## DELETE /lessons/:id

## POST /upload/video
- Single video upload using `uploadVideo`

## GET /students
- Aggregated learner list across creator's courses

## GET /courses/:courseId/students
- Detailed progress for students in one course

## GET /analytics/students
- Aggregated learner analytics across creator's portfolio
