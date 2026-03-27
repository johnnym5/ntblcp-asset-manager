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
    *   **Super Administrators**: Full access to global system settings, user management, and the low-level Infrastructure Workstation.
    *   **Zonal Managers**: Authorized to oversee multiple states, view verification progress pulses, and manage regional assignments.
    *   **Field Officers**: Locked into specific state scopes with permissions focused on asset inspection, condition reporting, and status updates.
*   **Regional Scoping & Data Locking**: Users are cryptographically locked into their authorized geographical scopes (States or Zonal Stores). This ensures data privacy and operational focus, preventing users from seeing or modifying assets outside their jurisdiction.
*   **Audit & Revert System**: Every modification is tracked. The system maintains a "Previous State" buffer for every asset. Administrators can review the "Recent Activity" log and revert any accidental or bulk changes with a single click.
*   **Session Management**: Secure, credential-based entry with session persistence that survives page refreshes and browser restarts.

### 📊 3. Intelligence & Field Reporting
Data is transformed from raw entries into actionable insights through visual pulse tracking.
*   **Inventory Pulse Dashboard**: A real-time executive overview presenting:
    *   **Verification Coverage**: High-level visual percentage trackers for overall project health.
    *   **Critical Health Alerts**: Automated identification of "Stolen," "Burnt," or "Unsalvageable" assets.
    *   **Data Quality Exceptions**: Intelligent flags for assets missing Manufacturer Serials, Tag IDs, or important technical specifications.
*   **Verification Pulse**: Visual progress tracking across different asset categories (e.g., Vehicles, IT Equipment, Medical Devices) and specific locations.
*   **Travel Report Generator**: An automated tool that compiles field findings into professional `.docx` documents. It automatically generates summary statistics, achievement lists, challenges, and specific asset remarks into a ready-to-print format.

### 📁 4. Advanced Data Engineering
Assetain simplifies the handling of complex legacy Excel registers through intelligent automation.
*   **Intelligent Workbook Scanner**: A proprietary parsing engine that automatically detects and maps complex Excel templates to the system schema. It recognizes header aliases (e.g., mapping "TAG NO" to "ASSET ID") to ensure seamless imports.
*   **Sandbox Environment (Locked Offline Store)**: New data imports are isolated in a local sandbox for review. This allows administrators to sanitize and validate data in a "Locked" state before merging it into the global cloud repository.
*   **Structure-Preserving Export**: Generates Excel reports that mirror the original column layouts and naming conventions of specialized project templates (e.g., IHVN or NTBLCP specific formats).

### 🛠 5. Infrastructure & Database Management
A low-level suite for technical administrators to maintain system health.
*   **Integrated Database Console**: A "Workstation" for administrators to browse collections, edit raw document fields, and manage composite query indexes without leaving the application.
*   **Cloud Snapshots**: One-click manual snapshots and restores between the Firestore and Realtime Database layers for extreme disaster recovery scenarios.
*   **Dynamic Schema Management**: Admins can add or remove custom fields from documents on-the-fly, allowing the system to evolve with changing project requirements.

---

## 📱 Mobile App Build (Android)

I have automated the mobile build process using Capacitor. Follow these steps to generate your native app:

### Step 1: Initialize (Run Once)
Install the necessary mobile dependencies and create the Android project:
```bash
npm run mobile:init
```

### Step 2: Build & Sync
Run this whenever you make changes to your code to update the mobile app:
```bash
npm run mobile:build
```

### Step 3: Run on Device
Open the project in Android Studio to run it on your phone or emulator:
```bash
npm run mobile:open
```

### 🔑 Important Firebase Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Add an **Android App** to your project with package name: `com.assetain.app`.
3. Download `google-services.json`.
4. Place it in `android/app/google-services.json`.

---

## 🚀 Deployment Guide

### Step 1: Push to GitHub
Run these commands in your terminal to sync this code with your repository:
```bash
git config --global user.email "jegbase@gmail.com"
git config --global user.name "Johnmary"
git add .
git commit -m "Resolved merge conflict and updated build guides"
git push origin main
```

### Step 2: Deploy Database Config
The app requires specific indexes to handle regional queries. Use the Firebase CLI to deploy them:
```bash
firebase use --add  # Select your project
firebase deploy --only firestore:indexes,firestore:rules,database:rules
```

### Step 3: Web Hosting (Vercel / Firebase)
1. **Connect**: Link your GitHub repo to Vercel or Firebase App Hosting.
2. **Environment Variables**: Add all keys from your `.env` file to the "Environment Variables" section in your hosting provider's dashboard.

## 🏗 Architecture
- **Primary Layer**: Cloud Firestore (Used for all live queries and structured data).
- **Backup Layer**: Realtime Database (Shadow mirroring for high-availability redundancy).
- **Local Layer**: IndexedDB (Browser persistence for 100% offline capability).

---
© 2024 Assetain. Professional Asset Intelligence.
