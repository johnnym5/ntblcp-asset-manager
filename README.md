# Assetain | Professional Asset Intelligence

**Assetain** is a mission-critical Asset Management and Verification platform designed for high-integrity operations. Built with a "Local-First" philosophy, it ensures 100% data availability even in remote areas without internet, while providing forensic-level traceability for all registry modifications.

---

## 🏗 System Overview

Assetain uses a triple-layer storage architecture to ensure maximum resilience:
1.  **Cloud Database**: The central source of truth for global reporting and reconciliation.
2.  **Shadow Mirror**: A real-time standby replica providing high-availability failover.
3.  **Local Storage**: Device-level encrypted persistence allowing for seamless offline work.

---

## 🛠 Initial Setup & Security

To maintain forensic integrity, Assetain does not include hardcoded credentials in the source code.

### 1. Environment Configuration
Create a `.env.local` file in the project root (ensure this file is gitignored):

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_rtdb_url
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket

# Administrative Bootstrap Credentials
# Use these to log in as the initial system administrator
NEXT_PUBLIC_INITIAL_ADMIN_USER=your_admin_username
NEXT_PUBLIC_INITIAL_ADMIN_PASSWORD=your_secure_passcode
```

### 2. Deployment
When deploying to Firebase App Hosting, ensure these variables are added to the **Secrets Manager** or configured in the **Firebase Console Environment Settings**.

---

## 🖥 Workstation Breakdown

### 1. Dashboard (Overview)
Your primary mission-control hub.
*   **Asset Summary**: Real-time statistical counters for the entire registry.
*   **Problem Assets**: Interactive scanner highlighting discrepancies or critical conditions.

### 2. Asset Registry (Inventory)
The core database workspace for managing asset folders.
*   **Multi-Project Support**: View concurrent grants (e.g., TB and C19) in one unified view.
*   **Technical Dossier**: Comprehensive profile view for every asset.

---
© 2024 Assetain. Professional. Resilient. Secure.
