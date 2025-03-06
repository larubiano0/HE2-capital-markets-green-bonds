# Deployment Guide for FastAPI + React Application

This guide outlines the steps to deploy your application using free-tier services:
- Backend: Render.com (Free Web Service)
- Frontend: Netlify (Free Site)
- Domain: Your GoDaddy Domain

## 1. Backend Deployment (Render.com)

### Prerequisites
- Create a [Render account](https://render.com/) (free tier available)
- Have your GitHub repository ready (or create one and push your code)

### Steps for Backend Deployment

1. **Prepare your backend code**
   - We've already updated the necessary files to make your backend deployment-ready
   - Ensure your `requirements.txt` is up to date
   - The `Procfile` has been added for Render deployment

2. **Create a new Web Service on Render**
   - Log in to your Render account
   - Click "New" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your backend code

3. **Configure the Web Service**
   - **Name**: Choose a name (e.g., "green-bonds-api")
   - **Environment**: Python
   - **Region**: Choose a region close to your target audience
   - **Branch**: main (or your default branch)
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

4. **Add Environment Variables**
   - Click "Advanced" and add the following environment variables:
     - `ENVIRONMENT`: production
     - `SECRET_KEY`: [generate a secure random string]
     - `DATABASE_URL`: (For free tier, keep using SQLite or upgrade to use PostgreSQL)
     - `FRONTEND_URL`: (Your Netlify URL, add after frontend deployment)

5. **Create Web Service**
   - Click "Create Web Service"
   - Wait for the deployment to complete (may take a few minutes)
   - Once deployed, note your service URL (e.g., https://green-bonds-api.onrender.com)

## 2. Frontend Deployment (Netlify)

### Prerequisites
- Create a [Netlify account](https://www.netlify.com/) (free tier available)
- Have your GitHub repository ready

### Steps for Frontend Deployment

1. **Update Environment Variables**
   - We've already created `.env.production` with a placeholder API URL
   - Update the API URL with your actual Render backend URL:
     ```
     REACT_APP_API_URL=https://your-backend-url.onrender.com
     ```

2. **Deploy to Netlify**
   - Log in to your Netlify account
   - Click "New site from Git"
   - Connect to your GitHub repository
   - Select the repository containing your frontend code
   - Configure build settings:
     - **Base directory**: frontend/auth-app
     - **Build command**: npm run build
     - **Publish directory**: frontend/auth-app/build
   - Click "Deploy site"

3. **Configure Environment Variables on Netlify**
   - Go to Site Settings > Build & Deploy > Environment
   - Add the production environment variable:
     - `REACT_APP_API_URL`: https://your-backend-url.onrender.com

4. **Trigger a new deployment**
   - Go to the Deploys tab
   - Click "Trigger deploy" > "Deploy site"
   - Wait for the deployment to complete

5. **Update Backend CORS Settings**
   - Go back to Render.com
   - Add your Netlify site URL to the CORS origins in your backend settings
   - Redeploy your backend to apply the changes

## 3. Connecting Your GoDaddy Domain

### Connect domain to Frontend (Netlify)

1. **Configure DNS on GoDaddy**
   - Log in to your GoDaddy account
   - Navigate to your domain's DNS settings
   - Add the following DNS records:
     - Type: `A`, Name: `@`, Value: `75.2.60.5` (Netlify's load balancer IP)
     - Type: `CNAME`, Name: `www`, Value: `[your-netlify-site-name].netlify.app`

2. **Add Custom Domain on Netlify**
   - Go to your Netlify site settings
   - Navigate to "Domain management" > "Domains"
   - Click "Add custom domain"
   - Enter your domain name (e.g., yourdomain.com)
   - Click "Verify"
   - Choose "Primary domain" for your main domain
   - For the www subdomain, add it as a domain alias

3. **Enable HTTPS**
   - In Netlify domain settings, enable "HTTPS"
   - Choose "Let's Encrypt Certificate" (free)
   - Wait for certificate provisioning (can take up to 24 hours)

### Connect Subdomain to Backend (Optional)

If you want your API to be available at api.yourdomain.com:

1. **Add CNAME Record on GoDaddy**
   - Type: `CNAME`, Name: `api`, Value: `[your-render-app-name].onrender.com`

2. **Update CORS Settings**
   - Add `https://yourdomain.com` and `https://api.yourdomain.com` to your CORS origins in the backend

## 4. Final Configuration

1. **Update Frontend Configuration**
   - If you're using the api.yourdomain.com subdomain for your backend:
     - Update the `.env.production` file:
       ```
       REACT_APP_API_URL=https://api.yourdomain.com
       ```
     - Redeploy your frontend

2. **Verify Everything Works**
   - Test the application by visiting your domain
   - Ensure all API calls work correctly
   - Check that authentication flows properly

## Important Notes for Demo Deployment

1. **Database Considerations**
   - For this demo, we're using SQLite, which is fine for demonstrations
   - For a real production app, you would use PostgreSQL (available on Render paid plans)
   - With the free plan, be aware that the database will reset if the service restarts

2. **Free Tier Limitations**
   - Render free tier services will spin down after 15 minutes of inactivity
   - The first request after inactivity may be slow (30s+) while the service spins up
   - Netlify free tier has 100GB bandwidth/month limit and 300 build minutes/month

3. **Security Considerations**
   - For a real production app, implement proper secrets management
   - Use environment variables for all sensitive information
   - Consider implementing rate limiting for API endpoints