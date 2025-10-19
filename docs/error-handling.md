# Error Handling

Errors are normalized by a global error handler.

## Response shape
```json
{
  "success": false,
  "message": "Human-readable error",
  "stack": "included only in development"
}
```

## Common cases
- 400: Validation errors, duplicate keys, bad input
- 401: No token / invalid token / inactive or blocked account
- 403: Not authorized for the resource
- 404: Resource not found
- Multer codes: `LIMIT_FILE_SIZE`, `LIMIT_UNEXPECTED_FILE`
- Cloud upload: HTTP-style `http_code` with message
