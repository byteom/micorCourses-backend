#!/bin/bash

# AWS Deployment Script for MicroCourses Backend
# Usage: ./deploy-backend.sh

set -e

echo "🚀 Starting MicroCourses Backend Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    echo "Please create .env file with required environment variables"
    exit 1
fi

echo -e "${GREEN}✅ Checking Node.js version...${NC}"
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✅ Installing dependencies...${NC}"
npm install --production

echo -e "${GREEN}✅ Starting application with PM2...${NC}"
if pm2 list | grep -q "microcourses-backend"; then
    echo "Updating existing PM2 process..."
    pm2 restart microcourses-backend
else
    echo "Creating new PM2 process..."
    pm2 start src/server.js --name microcourses-backend
    pm2 save
fi

echo -e "${GREEN}✅ Checking application status...${NC}"
pm2 status

echo -e "${GREEN}✅ Viewing logs...${NC}"
pm2 logs microcourses-backend --lines 20

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Useful commands:"
echo "  pm2 logs microcourses-backend    - View logs"
echo "  pm2 restart microcourses-backend - Restart app"
echo "  pm2 stop microcourses-backend    - Stop app"
echo "  pm2 monit                        - Monitor app"

