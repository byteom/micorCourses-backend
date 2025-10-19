# Authentication and Authorization

## Overview
- JWTs are issued on register/login and set as a `token` cookie (non-HTTPOnly) and also returned in the response body. You may instead send it in `Authorization: Bearer <JWT>`.
- Use `protect` middleware for authentication.
- Use `authorize('role')` for role checks: `learner`, `creator`, `admin`.

## Login
`POST /api/auth/login`
- Body: `{ email, password }`
- On success: sets `token` cookie and returns `{ user, token }`.

## Register
`POST /api/auth/register`
- Body: `{ name, email, password, bio?, role? }` (role defaults to learner)
- On success: sets `token` cookie and returns `{ user, token }`.

## Sending credentials
- Cookie: include credentials automatically in browser; ensure CORS with credentials.
- Header: add `Authorization: Bearer <JWT>`.

## Example
```bash
TOKEN="$(curl -s http://localhost:4001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"secret123"}' | jq -r .data.token)"

curl http://localhost:4001/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```
