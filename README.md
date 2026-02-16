# NTBLCP Asset Manager

A full-featured, offline-first Asset Management Web App, built with Next.js, Tailwind CSS, and Firebase.

## Application Features & Overview

This application is designed to solve the critical challenge of managing and verifying assets in diverse environments, especially in locations with limited or no internet connectivity.

### Core Features

*   **Offline-First by Default**: The application is built to work completely offline. All data is stored and managed in the browser's local database (IndexedDB), ensuring that work is never lost due to a lack of internet.
*   **Role-Based Access & Approval Workflow**: A secure, password-based login system grants access based on user roles. Changes from non-admin users are submitted to an approval queue for an administrator to review, ensuring data integrity.
*   **Dynamic Excel Import & Export**:
    *   **Intelligent Import**: Parses complex Excel files, automatically detecting headers and mapping data to a unified structure. Imports are sandboxed in a "Locked Offline" store for review before merging.
    *   **Structure-Preserving Export**: Exports data back into an Excel file that mirrors the original's column structure and naming conventions.
*   **Advanced Data Management**: Features smart search, powerful filtering and sorting, and batch editing capabilities.
*   **Insightful Dashboard**: Provides a high-level overview of asset verification progress with clear, visual progress bars.
*   **Selective Sync with Confirmation**: Users can select one or more assets or entire categories and push/pull only those specific items to the cloud, with a clear confirmation step that summarizes all pending changes.

---

## 1. Local Development Setup

The Firebase project configuration is embedded directly into the application, so no extra setup is required for local development.

### Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

---

## 2. Deployment to Firebase App Hosting

This project is pre-configured for one-click deployment to Firebase App Hosting.

### Step 2.1: Install the Firebase CLI

If you haven't already, install the Firebase Command Line Interface (CLI).

```bash
npm install -g firebase-tools
```

### Step 2.2: Log in to Firebase

Log in to your Firebase account through the CLI. This command will open a browser window for you to sign in.

```bash
firebase login
```

### Step 2.3: Set Your Firebase Project

From your project's root directory, run the following command to associate your local project with your Firebase project.

```bash
firebase use ntblcp-asset-manager-k7hy1
```

### Step 2.4: Deploy the Application

Run this single command from your project's root directory.

```bash
firebase deploy
```

This command will automatically build your Next.js application and deploy it to App Hosting. Your live application will be available at `https://ntblcp-asset-manager-k7hy1.web.app`.

---

## 3. Data Privacy & Security

This section outlines the application's data handling practices and highlights critical security considerations for a production environment.

### Data Storage

*   **Local (Client-Side)**: The application uses the browser's **IndexedDB** to store all asset data and settings. This enables full offline functionality. This data is private to the user's device and browser profile and is not accessible by other websites.
*   **Cloud (Firebase)**: When online, the app syncs with **Firebase Realtime Database** (primary) and **Cloud Firestore** (backup). All data, including user credentials and asset information, is stored in these cloud databases.

### **CRITICAL: Security Weaknesses in the Current Version**

The current codebase is a prototype and **is NOT secure for production use** without significant modifications. The following are known vulnerabilities:

1.  **Open Database Rules**: The Firebase security rules (`firestore.rules`) are configured to allow open read and write access to the entire database (`allow read, write: if true;`). This means **anyone** with your Firebase project credentials can read, modify, or delete all of your data.
2.  **Plaintext Passwords**: User passwords are **stored in plaintext** in the Firebase database within the `config/settings` document. This is a major security risk. If your database is compromised, all user passwords will be exposed.

### Recommendations for Production Deployment

Before deploying this application to a production environment with real data, it is **essential** to address the security issues above:

*   **Implement Strict Security Rules**: Rewrite your `firestore.rules` file to enforce proper access control.
    *   Only authenticated users should be able to read or write data.
    *   Implement role-based access (e.g., only admins can write to the `config` document).
    *   Use rules to validate data integrity on write operations.
*   **Use Firebase Authentication**: The current custom user management system should be replaced with **Firebase Authentication**. This service provides a secure, managed solution for user sign-up, sign-in, and password management, including industry-standard password hashing and recovery flows.
*   **Review Data Collection**: Ensure you are only collecting and storing data that is necessary for the application's functionality. Avoid storing sensitive Personally Identifiable Information (PII) unless absolutely required and properly secured.

---

## 4. Initial Setup & Default Credentials

A "super admin" user is hardcoded into the application for initial setup and emergency access.

*   **Login Name:** `admin`
*   **Password:** `setup`

This account provides full administrative access. It is highly recommended that you change this password or remove the hardcoded user from the code (`src/components/user-profile-setup.tsx`) once you have established your own administrative accounts using the in-app user management tools.

Leaving default, hardcoded credentials in a production application is a significant security risk.
