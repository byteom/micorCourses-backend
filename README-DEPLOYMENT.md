# MicroCourses Backend - Render Deployment Guide

## 🚀 Deploy to Render

### Prerequisites
1. MongoDB Atlas account (for production database)
2. Render account
3. GitHub repository with your code

### Step 1: Prepare Your Database
1. Create a MongoDB Atlas cluster
2. Get your connection string (it will look like: `mongodb+srv://username:password@cluster.mongodb.net/microcourses`)
3. Note down your JWT secret and Cloudinary credentials

### Step 2: Deploy to Render

#### Option A: Using Render Dashboard
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `microcourses-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: `18` or higher

#### Option B: Using render.yaml (Recommended)
1. Push your code to GitHub with the `render.yaml` file
2. Go to Render Dashboard
3. Click "New +" → "Blueprint"
4. Connect your repository
5. Render will automatically detect and use the `render.yaml` configuration

### Step 3: Set Environment Variables
In your Render service dashboard, go to "Environment" tab and add:

```
NODE_ENV=production
PORT=10000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/microcourses
JWT_SECRET=your-super-secret-jwt-key-here
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Step 4: Deploy
1. Click "Deploy" or push to your main branch
2. Wait for deployment to complete
3. Your API will be available at: `https://your-app-name.onrender.com`

### API Endpoints
- Health Check: `GET /api/health`
- Test: `GET /api/test`
- Authentication: `POST /api/auth/*`
- Courses: `GET/POST /api/courses/*`
- Lessons: `GET/POST /api/lessons/*`

### Troubleshooting
- Check Render logs if deployment fails
- Ensure all environment variables are set
- Verify MongoDB Atlas connection string
- Make sure your MongoDB Atlas IP whitelist includes `0.0.0.0/0` for Render

### Production Notes
- Render free tier has sleep mode (service sleeps after 15 minutes of inactivity)
- Consider upgrading to paid plan for always-on service
- Monitor your MongoDB Atlas usage
- Set up proper error monitoring and logging
