# Assetain

**Assetain** is a professional, offline-first Asset Management and Verification platform designed for high-stakes environments. Built with Next.js, Tailwind CSS, and a hybrid Firebase architecture, it provides a robust solution for tracking, auditing, and maintaining large-scale asset inventories.

## 🚀 Quick Start (Local Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/johnnym5/ntblcp-asset-manager.git
   cd ntblcp-asset-manager
   ```

2. **Configure Environment**:
   - Rename `.env.example` to `.env`.
   - Populate the keys with your Firebase Project credentials.

3. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

4. **Initial Login**:
   - **Login Name**: `admin`
   - **Password**: `setup`
   - *Note: Change these immediately in the Settings > Users panel after first sign-in.*

## 🛠 Deployment Guide

### Pushing to GitHub

To push your latest changes to your repository:

```bash
# Initialize git if not already done
git init

# Link to your repository
git remote remove origin
git remote add origin https://github.com/johnnym5/ntblcp-asset-manager.git

# Stage and Commit
git add .
git commit -m "Prepare for production deployment"

# Push to Main
git push -u origin main
```

### Web Deployment (Vercel / Firebase)

1. **Vercel**: Connect your GitHub repository. Vercel will automatically detect Next.js settings. **Crucial**: Add all variables from your `.env` file to the "Environment Variables" section in the Vercel Dashboard.
2. **Firebase App Hosting**: This project includes an `apphosting.yaml` and `firebase.json` for seamless deployment to Google's Firebase infrastructure.

## 🏗 Architecture

### 🌐 Hybrid Data Sync
*   **Primary Layer**: Cloud Firestore (Real-time querying and configuration).
*   **Backup Layer**: Realtime Database (High-speed "Shadow Mirroring" for redundancy).
*   **Local Layer**: IndexedDB (Browser-based persistence for 100% offline capability).

### 📊 Infrastructure Console
The inbuilt **Infrastructure Console** allows administrators to:
*   Perform full CRUD on cloud records.
*   Execute manual Cloud Snapshots (Firestore → RTDB).
*   Restore data from snapshots or JSON backups.
*   Perform bulk exports and emergency system purges.

---

© 2024 Assetain. Professional Asset Intelligence.
