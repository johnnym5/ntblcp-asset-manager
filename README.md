# Assetain

**Assetain** is a professional, offline-first Asset Management and Verification platform. Built with Next.js, Tailwind CSS, and a hybrid Firestore/RTDB architecture, it provides a robust solution for tracking, auditing, and maintaining large-scale inventories.

## 🚀 Deployment Guide

### Step 1: Create Repository on GitHub
1. Go to [github.com/new](https://github.com/new).
2. Create a new repository named `ntblcp-asset-manager`.
3. **Important**: If you initialized it with a README or License on GitHub, follow the "Fixing Rejected Push" section below.

### Step 2: Push to GitHub
Run these commands in your terminal:
```bash
git init
git add .
git commit -m "Initialize Assetain Production v1.0"
git branch -M main

# Use your token to authenticate the remote
git remote add origin https://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@github.com/johnnym5/ntblcp-asset-manager.git
git push -u origin main
```

#### 🛠 Troubleshooting "Rejected Push" (fetch first)
If you get an error saying `Updates were rejected because the remote contains work that you do not have locally`, run this command to merge the remote changes:
```bash
# Force the local code to overwrite the remote (Easiest for new projects)
git push -u origin main --force

# OR: Merge the remote files into your local project
git pull origin main --allow-unrelated-histories
# Then push again
git push -u origin main
```

#### 🛠 Troubleshooting "Authentication Failed" or "ECONNREFUSED"
If you get a credential error or `ECONNREFUSED /tmp/vscode-git...`:

1. **Clear the broken credential helper**:
   ```bash
   git config --global --unset credential.helper
   ```

2. **Update to an Authenticated Remote URL**:
   If you already added the remote, run this to update it with your token:
   ```bash
   git remote set-url origin https://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@github.com/johnnym5/ntblcp-asset-manager.git
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
