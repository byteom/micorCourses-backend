# Learner Endpoints

Base path: `/api/learner`

All routes require: `protect` and `authorize('learner')` (middleware applied at router-level).

## POST /courses/:id/enroll
- Enrolls learner into published course

## POST /courses/:courseId/lessons/:lessonId/complete
- Marks a lesson as completed; auto-updates progress

## GET /courses
- Returns enrolled courses array with course summaries

## GET /courses/:id/lessons
- Returns lessons for a specific enrolled course

## GET /courses/:id/progress
- Returns detailed progress for a course

## GET /courses/:id/certificate
- Returns a PDF (application/pdf) certificate download

## GET /courses/:id/certificate/preview
- Returns HTML certificate preview

## GET /recommendations
- Personalized recommendations by categories and popularity

## GET /stats
- Returns aggregate learning statistics
