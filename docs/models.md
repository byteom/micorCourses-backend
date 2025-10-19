# Data Models

## User
Fields:
- **name**: string, required, max 50
- **email**: string, required, unique, validated
- **password**: string, required, min 6 (not selected by default)
- **role**: enum `learner|creator|admin` (default `learner`)
- **avatar**: string
- **bio**: string, max 500
- **isActive**: boolean (default true)
- **isBlocked**, **blockedAt**, **blockedBy**, **blockReason**
- **restrictedCourses**: [Course]
- **accountStatus**: enum `active|blocked|suspended|deleted`
- **deletedAt**, **deletedBy**
- **creatorApplication**: { status, appliedAt, reviewedAt, reviewedBy, expertise, experience, portfolio }
- **enrolledCourses**: [{ course, enrolledAt, progress (0-100), completedLessons [Lesson], certificateIssued, certificateHash }]

Methods:
- `comparePassword(candidatePassword)`
- `getCourseProgress(courseId)`

## Course
Fields:
- **title**, **description**, **shortDescription**
- **thumbnail**: { url, publicId }
- **category**: enum
- **level**: enum `Beginner|Intermediate|Advanced`
- **price**: number >= 0
- **duration**: minutes
- **creator**: User ref
- **status**: enum `draft|submitted|published|rejected|pending_review`
- **isActive**: boolean
- **enrollmentCount**: number
- **rating**: { average (0-5), count }
- Review fields: **reviewedBy**, **reviewedAt**, **rejectionReason**
- Change tracking: **lastModified**, **requiresReapproval**, **modificationReason**
- SEO: **tags**
- **requirements**, **outcomes**

Virtuals:
- `lessons` (list)
- `lessonCount` (count)

Methods:
- `calculateTotalDuration()`
- `updateEnrollmentCount()`

## Lesson
Fields:
- **title**, **description**
- **course**: Course ref
- **order**: positive integer (unique per course)
- **video**: { url (required), publicId (required), duration (seconds) }
- **thumbnail**: { url, publicId }
- **transcript**: string
- **duration**: minutes (>=1)
- **isActive**: boolean
- **resources**: [{ title, url, type: pdf|link|file|other }]
- **notes**: string

Statics:
- `getNextOrder(courseId)`
- `reorderLessons(courseId, deletedOrder)`

Hooks:
- Pre-save unique order check
- Pre-delete reorder maintenance

## Certificate
Fields:
- **serialHash**: unique ID (auto-generated)
- **learner**: User ref
- **course**: Course ref
- **learnerName**, **courseTitle**
- **completionDate**
- **issuedBy**: User ref
- **isValid**: boolean
- **totalLessons**, **courseDuration**
- **grade**: enum

Methods:
- `verify()`

Statics:
- `generateCertificate(learner, course)`
