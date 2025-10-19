# Lesson Endpoints

Base path: `/api/lessons`

## GET /:id
- Auth: `protect`, `authorize('learner')`
- Returns lesson if enrolled or creator/admin

## POST /:id/complete
- Auth: `protect`, `authorize('learner')`
- Marks lesson complete; may issue certificate if course completed

## GET /:id/progress
- Auth: `protect`, `authorize('learner')`
- Returns completion status and overall course progress
