#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Preparing your application for deployment...${NC}"

# Create deployment directories
echo -e "${YELLOW}Setting up deployment directories...${NC}"
mkdir -p deployment/backend
mkdir -p deployment/frontend

# Copy backend files
echo -e "${YELLOW}Copying backend files...${NC}"
cp -r backend/*.py deployment/backend/
cp backend/requirements.txt deployment/backend/
cp backend/Procfile deployment/backend/

# Copy frontend files
echo -e "${YELLOW}Preparing frontend for deployment...${NC}"
cd frontend/auth-app
npm run build
cd ../..
cp -r frontend/auth-app/build/* deployment/frontend/
cp frontend/auth-app/netlify.toml deployment/frontend/

echo -e "${GREEN}Deployment preparation complete!${NC}"
echo -e "${YELLOW}Your backend files are packaged in 'deployment/backend/'${NC}"
echo -e "${YELLOW}Your frontend build is in 'deployment/frontend/'${NC}"
echo -e "${YELLOW}Follow the instructions in DEPLOYMENT_GUIDE.md to deploy your application.${NC}"