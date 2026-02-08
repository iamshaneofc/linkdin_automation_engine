# 🚀 Easiest Deployment Guide: Railway.app

This guide explains the quickest way to deploy your full-stack app (React + Node + Puppeteer + Postgres) using **Railway**.

## Why Railway?
- **Auto-Detects Dockerfiles:** We created Dockerfiles for Frontend and Backend, so Railway knows exactly how to build them.
- **Built-in Database:** One-click PostgreSQL setup.
- **Puppeteer Support:** The Backend Dockerfile uses a special image that includes Chrome, so scraping works out of the box.

---

## Step 1: Push Your Code to GitHub
Ensure your latest code (with the new `Dockerfile`s) is on GitHub.
*(You just did this with the `git push` command!)*

## Step 2: Create Railway Project
1. Go to [Railway.app](https://railway.app/) and sign up/login.
2. Click **"New Project"**.
3. Select **"Deploy from GitHub repo"**.
4. Select your repository: `linkdin_automation_engine`.
5. Click **"Deploy Now"**.

## Step 3: Configure Services
Railway will detect two directories (`frontend` and `backend`).

### A. Database (PostgreSQL)
1. In your project canvas, right-click (or click "New") -> **Database** -> **Add PostgreSQL**.
2. Wait for it to initialize.

### B. Backend Service
1. Click the **Backend** service card (it might be named `backend` or `repo-name`).
2. Go to **Settings** -> **General** -> scroll to "Root Directory" -> ensure it is `/backend`.
3. Go to **Variables**:
   - Add all your `.env` variables here (copy from your local `.env`):
     - `PORT`: `5000` (Optional, Railway sets PORT automatically, but good to set)
     - `DATABASE_URL`: **IMPORTANT!** Railway provides this variable from the Postgres service. 
       - Go to the **PostgreSQL** service -> **Connect** tab -> Copy "Postgres Connection URL".
       - Paste it into your Backend Variables as `DATABASE_URL`.
     - `LINKEDIN_SESSION_COOKIE`: `...`
     - `OPENAI_API_KEY`: `...`
     - `PHANTOMBUSTER_API_KEY`: `...`
     - `...`: (Add all others)

### C. Frontend Service
1. Click the **Frontend** service card.
2. Go to **Settings** -> **General** -> scroll to "Root Directory" -> ensure it is `/frontend`.
3. Go to **Variables**:
   - `VITE_API_URL`: Set this to the **Public Domain** of your Backend service.
     - Go to Backend service -> **Settings** -> **Networking** -> Generate Domain.
     - Copy that domain (e.g., `https://backend-production.up.railway.app`) and use it here.

## Step 4: Verify Deployment
1. Wait for builds to complete (green checks).
2. Open the **Frontend** URL (from Networking tab).
3. Test logging in and fetching leads!

---

## 💡 Troubleshooting
- **Backend Build Fails?** Check logs. The Dockerfile installs chrome dependencies automatically.
- **Database Connection Error?** Ensure `DATABASE_URL` is correct in Backend variables.
- **Puppeteer Crashes?** Increase RAM in Railway settings (Scraping needs memory!). Or set `PUPPETEER_EXECUTABLE_PATH: google-chrome-stable` (though our Dockerfile handles this).

**Support:**
If you get stuck, reply here and I can help debug the build logs! 🚀
