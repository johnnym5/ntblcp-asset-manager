# Assetain

**Assetain** is a professional, offline-first Asset Management and Verification platform. Built for robust performance in demanding environments, it provides a high-integrity solution for tracking, auditing, and maintaining large-scale inventories across multiple geographical regions.

## 🌟 Core Features

### 📡 High-Availability Architecture
- **Offline-First Resilience**: Full functionality in zero-connectivity environments using high-performance IndexedDB local storage.
- **Triple-Layer Data Integrity**:
    - **Primary**: Cloud Firestore for structured, real-time regional queries.
    - **Redundancy**: Realtime Database shadow-mirroring for high-availability backups.
    - **Local**: Intelligent browser persistence for 100% field uptime.

### 🔐 Secure Governance & Workflow
- **Role-Based Access Control (RBAC)**: Distinct permissions for Administrators, Zonal Managers, and Field Verification Officers.
- **Regional Scoping**: Users are locked into authorized geographical scopes (States/Zones) to ensure data privacy and operational focus.
- **Audit & Revert System**: Every change is tracked. Administrators can review activity logs and revert individual or bulk changes with a single click.

### 📊 Intelligence & Reporting
- **Inventory Pulse Dashboard**: Real-time insights into verification coverage, maintenance alerts, and data quality exceptions.
- **Verification Pulse**: Visual progress tracking for inspections across categories and locations.
- **Travel Report Generator**: Automated generation of professional `.docx` field reports, compiling verification findings, observations, and challenges.

### 📁 Advanced Data Engineering
- **Intelligent Workbook Scanner**: Automatically detects and maps complex Excel templates to the system schema.
- **Structure-Preserving Export**: Generates Excel reports that mirror original column layouts and naming conventions.
- **Sandbox Environment**: New data imports are isolated in a "Locked Offline" store for review before being merged into the global cloud database.

### 🛠 Infrastructure Management
- **Integrated Database Console**: A low-level "Workstation" for administrators to browse collections, edit raw document fields, and manage composite query indexes without leaving the app.
- **Cloud Snapshots**: One-click manual snapshots and restores between database layers for extreme disaster recovery.

---
© 2024 Assetain. Professional Asset Intelligence.