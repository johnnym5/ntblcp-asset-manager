# Assetain

**Assetain** is a professional, enterprise-grade Asset Management and Verification platform designed for high-integrity operations in geographically dispersed and low-connectivity environments. Built with an "Offline-First" philosophy, it transforms complex physical asset registers into actionable intelligence through automated verification workflows, regional governance, and deep data engineering. By bridging the gap between field inspections and cloud-based analytics, Assetain ensures 100% data fidelity for large-scale inventory audits, maintenance tracking, and regional resource management.

---

## 🛠 Detailed Summary of Features and Functions

### 📡 1. High-Availability & Resilience Architecture
Assetain is engineered to be mission-critical, ensuring field officers and managers never lose data regardless of internet stability.
*   **Offline-First Core**: Built on a high-performance IndexedDB local storage engine. Users can perform full verification, batch edits, and record creation in "Zero-Connectivity" zones without interruption.
*   **Triple-Layer Data Redundancy**:
    *   **Primary Layer (Firestore)**: Cloud Firestore provides structured, real-time query capabilities for regional dashboards and global reporting.
    *   **Redundancy Layer (Realtime Database)**: A shadow-mirror backup that ensures data availability even during primary cloud service interruptions.
    *   **Persistence Layer (Local)**: Intelligent browser persistence handles all active session data, allowing for high-speed local processing.
*   **Intelligent Synchronization Engine**: 
    *   **Manual Sync Control**: Users have full control over when data is sent to the cloud. Edits are saved locally first and pushed only when the user triggers a "Sync Up."
    *   **Conflict Resolution**: The system tracks `lastModified` timestamps to prevent accidental overwrites of newer cloud data by older local caches.

### 🔐 2. Secure Governance & Workflow
Enterprise security and accountability are baked into every layer of Assetain to prevent unauthorized access and data corruption.
*   **Request & Approval System**: Non-admin edits to structural data (descriptions, IDs, locations) are submitted as "Pending Requests." Administrators review these in a central Inbox before they are applied to production.
*   **Role-Based Access Control (RBAC)**:
    *   **Super Administrators**: Full access to global system settings, user management, and the infrastructure workstation.
    *   **Field Officers**: Authorized to perform asset inspection, condition reporting, and status updates within their assigned regional scope.
*   **Regional Scoping**: Users are locked into their authorized geographical scopes (States or Zonal Stores).

---

## 🔄 Syncing with GitHub

If you have made changes to the repository externally (e.g., on GitHub), use the terminal to pull them into this environment:

### Pull Changes
```bash
# Pull from the main branch
git pull origin main

# Or pull from a specific feature branch (e.g., antigravity)
git pull origin antigravity
```

### Push Changes
```bash
git add .
git commit -m "Describe your changes"
git push origin main
```

---

## 📱 Mobile App Build (Android)

I have automated the mobile build process using Capacitor. Follow these steps to generate your native app:

### Step 1: Initialize (Run Once)
```bash
npm run mobile:init
```

### Step 2: Build & Sync
```bash
npm run mobile:build
```

### Step 3: Run on Device
```bash
npm run mobile:open
```

---

## 🚀 Deployment Guide

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Update project features"
git push origin main
```

### Step 2: Deploy Database Config
The app requires specific indexes to handle regional queries. Use the Firebase CLI to deploy them:
```bash
firebase use --add  # Select your project
firebase deploy --only firestore:indexes,firestore:rules,database:rules
```

### Step 3: Web Hosting (Vercel / Firebase)
Link your GitHub repo to Vercel or Firebase App Hosting and configure your environment variables in their dashboard.

## 🏗 Architecture
- **Primary Layer**: Cloud Firestore (Structured regional data).
- **Backup Layer**: Realtime Database (High-availability redundancy).
- **Local Layer**: IndexedDB (100% offline capability).

---
© 2024 Assetain. Professional Asset Intelligence.
