# Auth Endpoints

Base path: `/api/auth`

## POST /register
- Body: `{ name, email, password, bio?, role? }`
- Success: `201` `{ success, message, data: { user, token } }`

Example:
```bash
curl -X POST http://localhost:4001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane","email":"jane@example.com","password":"secret123"}'
```

## POST /login
- Body: `{ email, password }`
- Success: `200` `{ success, message, data: { user, token } }`

## POST /logout
- Clears `token` cookie.

## GET /profile
- Auth: `protect`
- Success: `200` `{ success, data: { user } }`

## PUT /profile
- Auth: `protect`
- Body: `{ name?, bio? }`

## PUT /change-password
- Auth: `protect`
- Body: `{ currentPassword, newPassword }`

## POST /apply-creator
- Auth: `protect`
- Body: `{ expertise, experience, portfolio? }`
