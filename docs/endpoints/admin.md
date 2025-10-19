# Admin Endpoints

Base path: `/api/admin`

All routes require: `protect` and `authorize('admin')` (middleware applied at router-level).

## GET /dashboard
- Platform-wide stats and recent activity

## Users
- GET /users — list users (query: `role?`, `search?`, `page?`, `limit?`)
- GET /users/:id/details — detailed user profile and stats
- PUT /users/:id/status — body `{ status: 'active'|'inactive' }`
- PUT /users/:id/block — body `{ reason }`
- PUT /users/:id/unblock
- DELETE /users/:id
- PUT /users/:id/restrict-courses — body `{ courseIds: string[], reason? }`
- PUT /users/:id/unrestrict-courses — body `{ courseIds: string[] }`

## Courses
- GET /courses — list courses (query: `status?`, `search?`, `page?`, `limit?`)
- GET /courses/pending — list submitted/pending_review courses
- PUT /courses/:id/review — body `{ action: 'approve'|'reject', rejectionReason? }`
- PUT /courses/:id/approve
- PUT /courses/:id/reject — body `{ reason }`
- GET /courses/:id/enrollments — enrollment details
- GET /courses/:id — course details

## Creator Applications
- GET /creator-applications — pending or by status
- PUT /creator-applications/:id/review — body `{ action: 'approve'|'reject', rejectionReason? }`
- PUT /creators/:id/approve
- PUT /creators/:id/reject — body `{ reason }`

## System
- GET /logs — mock logs for demonstration
