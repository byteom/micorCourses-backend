# MicroCourses API Documentation

Version: 1.0.0

- Base URL (local): `http://localhost:4001`
- Health: `GET /api/health`
- Test: `GET /api/test`

## Table of contents
- Authentication and authorization: `docs/authentication.md`
- Quickstart: `docs/quickstart.md`
- Error handling: `docs/error-handling.md`
- Middlewares: `docs/middleware.md`
- Data models: `docs/models.md`
- Services: `docs/services.md`
- Endpoints:
  - Auth: `docs/endpoints/auth.md`
  - Courses: `docs/endpoints/courses.md`
  - Lessons: `docs/endpoints/lessons.md`
  - Creator: `docs/endpoints/creator.md`
  - Learner: `docs/endpoints/learner.md`
  - Admin: `docs/endpoints/admin.md`

## Rate limiting
- 100 requests per 15 minutes per IP (HTTP 429 on exceed).

## CORS
- Dynamic allowlist plus Vercel previews.
- Send credentials if using cookie auth.

## Conventions
- All responses are JSON unless otherwise noted.
- Timestamps are ISO-8601.
- Protected routes require JWT via cookie `token` or header `Authorization: Bearer <JWT>`.

See individual endpoint docs for request/response schemas and examples.
