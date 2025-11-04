# Quickstart

## Run locally
1. Set environment variables in `.env`:
```
PORT=4001
MONGO_URI=mongodb+srv://...
JWT_SECRET=replace_me
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
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
