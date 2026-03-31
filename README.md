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
*   **Fidelity Scoring**: A global health index that monitors the completeness and precision of the entire registry pulse.

### 📁 4. Advanced Data Engineering
*   **Hierarchical Workbook Scanner**: Proprietary ingestion engine that auto-detects complex sheet structures and preserves document sections/subsections.
*   **Schema Mapper**: Interactive interface to align incoming legacy spreadsheet columns with the production registry contract.
*   **Structure-Preserving Export**: Generates Excel reports that mirror the project's original column layouts and naming conventions.

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

---

## 🚀 Troubleshooting & Version Control

### Git "Fetch First" Error
If you encounter a `! [rejected] main -> main (fetch first)` error during a push, it means the remote GitHub repository has updates you don't have yet.
**Solution:**
1. Run `git pull` to fetch and merge remote changes.
2. Resolve any local conflicts if prompted.
3. Run `git push` to broadcast your local work.

### System Heartbeat Issues
If the cloud indicator is red, the system has entered **Offline Mode**. Work will continue to be saved to Local Persistence and will automatically sync once a Cloud Pulse is detected.

---
© 2024 Assetain. Professional Asset Intelligence.
