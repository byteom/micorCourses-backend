# Course Endpoints

Base path: `/api/courses`

## GET /
- Query: `page?`, `limit?`, `search?`, `category?`, `level?`, `minPrice?`, `maxPrice?`, `sort? (popular|rating|price_low|price_high|newest)`
- Success: `{ success, data: { courses, pagination } }`

## GET /search
- Query: `q` (required), plus filters like `category`, `level`, `minPrice`, `maxPrice`

## GET /category/:category
- Paginates courses within a category

## GET /:id
- Returns one published course with lessons summary

## POST /:id/enroll
- Auth: `protect`, `authorize('learner')`

## GET /enrolled/my-courses
- Auth: `protect`, `authorize('learner')`

## POST /:id/rate
- Auth: `protect`, `authorize('learner')`
- Body: `{ rating: 1..5 }`
