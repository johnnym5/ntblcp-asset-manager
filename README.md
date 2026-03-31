
# Assetain

**Assetain** is a professional, enterprise-grade Asset Management and Verification platform designed for high-integrity operations in geographically dispersed and low-connectivity environments. Built with an "Offline-First" philosophy, it transforms complex physical asset registers into actionable intelligence through automated verification workflows, regional governance, and deep data engineering.

---

## 🛠 Feature & Operational Summary

### 📡 1. High-Availability & Resilience Architecture
Assetain is engineered to be mission-critical, ensuring field officers and managers never lose data regardless of internet stability.
*   **Triple-Layer Data Redundancy**:
    *   **Cloud Authority (Firestore)**: Real-time query capabilities for regional dashboards and global reporting.
    *   **Shadow Mirror (RTDB)**: Hot-standby replication that ensures availability even during primary cloud service interruptions.
    *   **Local Persistence (IDB)**: Browser-level IndexedDB engine for 100% offline-first productivity.
*   **Failover Engine**: Administrators can manually pivot the primary read authority between the Cloud and the Mirror pulse during latency events.

### 🔐 2. Secure Governance & Field Accountability
*   **Forensic Signature Capture**: verifications are anchored with digital custodian signatures and spatial (GPS) geotags.
*   **One-Tap Verification**: Optimized mobile interface for auditors on the move to mark assets as "Verified" or "Discrepancy" instantly.
*   **Identity Scanner**: Targeted QR scanning to instantly open digital record profiles from physical asset labels.
*   **Role-Based Access (RBAC)**: Secure multi-tenant logic ensuring auditors are locked into their authorized states or zonal scopes.

### 📊 3. Executive Intelligence & Fidelity
*   **Integrity Engine**: Heuristic scanner that proactively identifies duplicate serials, inconsistent location naming, and data quality gaps.
*   **Coverage Trends**: Real-time trajectory charts tracking the velocity of field assessments across the project lifecycle.
*   **Professional Documentation**: Automated generation of technical profiles (PDF), high-risk exception compendiums (PDF), and executive travel reports (DOCX).

### 📁 4. Advanced Data Engineering
*   **Hierarchical Workbook Scanner**: Proprietary ingestion engine that auto-detects complex sheet structures and preserves document sections/subsections.
*   **Structure-Preserving Export**: Generates Excel reports that mirror the project's original column layouts and naming conventions.
*   **Disaster Recovery Workspace**: One-click manual snapshots and state reconstruction tools for extreme offline scenarios.

---

## 📱 Mobile App Build (Android)

Assetain is fully compatible with Capacitor for native deployment.

### Step 1: Initialize (Run Once)
```bash
npm run mobile:init
```

### Step 2: Build & Sync
```bash
npm run mobile:build
```

### Step 3: Run on Device
Open the project in Android Studio:
```bash
npm run mobile:open
```

### 🔑 PWA Installation
Assetain is a Progressive Web App. Visit the site in Chrome (Android) or Safari (iOS) and select **"Add to Home Screen"** to install it as a standalone high-speed pulse.

---

## 🚀 Deployment Guide

### 1. Environment Configuration
Create a `.env.local` file with your production Firebase keys:
*   `NEXT_PUBLIC_FIREBASE_API_KEY`
*   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
*   `NEXT_PUBLIC_FIREBASE_DATABASE_URL` (Required for Shadow Mirror)

### 2. Hosting
Link your repository to **Vercel** or **Firebase App Hosting**. The `apphosting.yaml` is pre-configured for high-availability scaling.

---
© 2024 Assetain. Professional Asset Intelligence.
