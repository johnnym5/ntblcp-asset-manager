# Assetain

**Assetain** is a professional, offline-first Asset Management and Verification platform. Built with Next.js, Tailwind CSS, and a hybrid Firestore/RTDB architecture, it provides a robust solution for tracking, auditing, and maintaining large-scale inventories.

## 🚀 Deployment Guide

### Step 1: Create Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Create a new repository named `ntblcp-asset-manager`.
3. **Important**: Do not initialize it with a README, license, or gitignore (keep it empty).

### Step 2: Push to GitHub
Run these commands in your terminal:
```bash
git init
git add .
git commit -m "Initialize Assetain Production v1.0"
git remote add origin https://github.com/johnnym5/ntblcp-asset-manager.git
git branch -M main
git push -u origin main
```

#### 🛠 Troubleshooting "Authentication Failed"
If you get a credential error or `ECONNREFUSED`:
1. **Use a Personal Access Token (PAT)**: GitHub no longer accepts your account password for terminal commands. Generate one at [Settings > Developer Settings > Personal Access Tokens](https://github.com/settings/tokens).
2. **When prompted for a password**, paste your Token instead.
3. **To save your credentials** so you don't have to type them again:
   ```bash
   git config --global credential.helper store
   ```

### Step 3: Deploy Database Config
The app requires specific indexes to handle regional queries. Use the Firebase CLI to deploy them:
```bash
# Install CLI if needed: npm install -g firebase-tools
firebase login
firebase use --add  # Select your project
firebase deploy --only firestore:indexes,firestore:rules,database:rules
```

### Step 4: Web Hosting (Vercel / Firebase)
1. **Connect**: Link your GitHub repo to Vercel or Firebase App Hosting.
2. **Environment Variables**: Add all keys from your `.env` file to the "Environment Variables" section in your hosting provider's dashboard.

## 🏗 Architecture
- **Primary Layer**: Cloud Firestore (Used for all live queries and structured data).
- **Backup Layer**: Realtime Database (Shadow mirroring for high-availability redundancy).
- **Local Layer**: IndexedDB (Browser persistence for 100% offline capability).

---
© 2024 Assetain. Professional Asset Intelligence.
