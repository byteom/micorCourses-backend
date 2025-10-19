# Middleware

## protect
- Verifies JWT from cookie `token` or `Authorization: Bearer <JWT>`.
- Rejects inactive/blocked/deleted users.

## authorize(...roles)
- Ensures `req.user.role` is one of the allowed roles.

## creatorOrAdmin
- Shortcut for allowing creators or admins.

## ownerOrAdmin(Model, paramName='id')
- Loads the resource by `req.params[paramName]` and allows if admin or resource owner.

## validation
- `validateRegister`, `validateLogin`: basic auth input checks.
- `validateCourse`: trims, normalizes, checks constraints for course create/update.
- `validateLesson`: checks title; validates order/duration rules.
- `validateCreatorApplication`: checks expertise/experience.
- `validatePagination`: clamps `page`/`limit` to sane bounds.
