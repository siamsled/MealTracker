# MealTracker - Cloud Deployment Guide

## 🚀 Recommended Hosting: Vercel + Turso / Neon or Render / Railway

### Option 1: Render.com / Railway (Easiest - Keeps Current Database & Photos Out-of-the-Box)
With Render or Railway, your current SQLite database and receipt photos work seamlessly without configuring an external cloud database.

1. Push this repository to your **GitHub** account:
   ```bash
   git add .
   git commit -m "Deploy Flat 6A MealTracker"
   git push origin main
   ```
2. Go to [render.com](https://render.com) or [railway.app](https://railway.app).
3. Click **New +** ➜ **Web Service** ➜ Select your GitHub repository `MealTracker`.
4. Configure Build & Start settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Disks / Storage**: Attach a persistent disk to `/data` (optional for keeping SQLite database permanent).
5. Done! You get a live HTTPS domain (e.g. `https://mealtracker.onrender.com`).

---

### Option 2: Deploy to Vercel (Fast Global CDN)
Vercel is serverless. To use Vercel with permanent database storage:

1. Push your repository to **GitHub**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"** ➜ Select your repository.
3. In **Settings ➜ General**, deploy the project.
4. If you'd like a free permanent cloud SQLite database with zero server management, connect [Turso](https://turso.tech) (Free 9GB Cloud SQLite).
5. To initialize or reset the seed data on the live deployment, send a POST request or visit:
   `https://your-domain.vercel.app/api/seed`

---

### 🔑 Flat 6A Live Login Credentials

| User | Username | Password | Role / Access |
| :--- | :--- | :--- | :--- |
| **Siam** | `siam` | `111` | Personal Dashboard, Meal Planner, Bazaar Logging |
| **Raiyan** | `raiyan` | `222` | Personal Dashboard, Meal Planner, Bazaar Logging |
| **Jubayer** | `jubayer` | `333` | Personal Dashboard, Meal Planner, Bazaar Logging |
| **Admin** | `admin` | `999` | Full Household Configuration & Settings |
| **Khala** | *No login needed* | *None* | **Direct Public Link:** `https://your-domain.vercel.app/cook` |
