# 🚀 Deployment Guide

This guide will help you deploy your Task Management App to production.

**Stack:**
- Frontend: **Vercel** (free tier)
- Backend + Database: **Railway** (free tier)

---

## Step 1: Push Code to GitHub

First, make sure your code is on GitHub.

```bash
# Initialize git (if not done)
cd d:\task-management-typescript
git init

# Create .gitignore


# Add and commit
git add .
git commit -m "Initial commit: Task Management App"

# Create repo on GitHub and push
git remote add origin https://github.com/YOUR_USERNAME/task-management-app.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### 2.2 Create New Project
1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your repository
4. **Important:** Set the root directory to `apps/server`

### 2.3 Add PostgreSQL Database
1. In your project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway automatically creates the database

### 2.4 Set Environment Variables
Go to your server service → **Variables** tab:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=generate-a-random-64-character-string-here
FRONTEND_URL=https://your-app.vercel.app
```

> **Tip:** For JWT_SECRET, generate with: `openssl rand -base64 64`

### 2.5 Deploy
1. Railway will auto-deploy when you push to main
2. Note your backend URL: `https://your-project.railway.app`

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### 3.2 Import Project
1. Click **"Add New Project"**
2. Import your GitHub repo
3. **Important:** Set **Root Directory** to `apps/client`

### 3.3 Set Environment Variables
In Project Settings → Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://your-project.railway.app
```

### 3.4 Deploy
1. Click **Deploy**
2. Note your frontend URL: `https://your-app.vercel.app`

---

## Step 4: Update CORS (Important!)

Go back to Railway and update the `FRONTEND_URL` variable with your actual Vercel URL:

```env
FRONTEND_URL=https://your-actual-app.vercel.app
```

Railway will auto-redeploy with the new CORS settings.

---

## 🎉 Done!

Your app is now live at:
- **Frontend:** `https://your-app.vercel.app`
- **Backend API:** `https://your-project.railway.app/api`
- **Swagger Docs:** `https://your-project.railway.app/api`

---

## Troubleshooting

### "CORS Error"
- Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Include `https://` in the URL

### "Database connection failed"
- Check that `DATABASE_URL` is set in Railway variables
- Make sure it references `${{Postgres.DATABASE_URL}}`

### "WebSocket not connecting"
- WebSockets may not work on Railway's free tier
- Consider upgrading or using a service like Pusher for real-time

### "Build failed on Vercel"
- Check the build logs in Vercel dashboard
- Make sure root directory is set to `apps/client`

---

## Local Development After Deployment

Create `.env.local` in `apps/client`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Create `.env` in `apps/server`:
```env
DATABASE_URL=postgresql://postgres:Th@kur937@localhost:5432/task_manager_db
JWT_SECRET=your-local-dev-secret
FRONTEND_URL=http://localhost:3000
```
