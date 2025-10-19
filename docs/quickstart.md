# Quickstart

## Run locally
1. Set environment variables in `.env`:
```
PORT=4001
MONGO_URI=mongodb+srv://...
JWT_SECRET=replace_me
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NODE_ENV=development
```
2. Install and start:
```bash
npm install
npm start
```

## Base URLs
- Local: `http://localhost:4001`
- Health: `GET /api/health`

## Authenticate
You can authenticate via:
- Cookie: Server sets `token` cookie on successful login/register
- Header: Send `Authorization: Bearer <JWT>`

### Example (login)
```bash
curl -X POST http://localhost:4001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"user@example.com","password":"secret123"}' \
  -i
```

### Subsequent request with header auth
```bash
curl http://localhost:4001/api/auth/profile \
  -H 'Authorization: Bearer <JWT>'
```
