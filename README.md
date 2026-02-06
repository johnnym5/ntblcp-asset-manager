# NTBLCP Asset Manager

A full-featured, offline-first Asset Management Web App for NTBLCP, built with Next.js, Tailwind CSS, and Firebase.

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

Before you can run the app locally, you must provide your Firebase project's credentials.

### Step 1.1: Create `.env.local` file

Create a file named `.env.local` in the root of the project by copying the `.env.example` file.

```bash
cp .env.example .env.local
```

### Step 1.2: Fill in your Firebase Credentials

Open the new `.env.local` file and add your actual Firebase project credentials. You can find these values in your Firebase project's settings page in the Firebase Console.

*   In the Firebase Console, go to **Project settings** (click the gear icon ⚙️).
*   In the **General** tab, scroll down to the "Your apps" section.
*   Select your web app and copy the corresponding configuration values into your `.env.local` file.

### Step 1.3: Install Dependencies & Run

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

### Step 2.3: Set Your Firebase Project ID

Your application needs to know which Firebase project to deploy to.

1.  Open the `.firebaserc` file in your project's root directory.
2.  Replace the placeholder project ID with your actual Firebase Project ID.

    ```json
    {
      "projects": {
        "default": "YOUR-FIREBASE-PROJECT-ID"
      }
    }
    ```

### Step 2.4: Configure Environment Variables in Firebase

Your deployed application needs your Firebase API keys to connect to the database and authentication services.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project (`YOUR-FIREBASE-PROJECT-ID`).
3.  Navigate to the **App Hosting** page.
4.  Select your backend, go to the **Settings** tab.
5.  In the "Environment variables" section, add the same variables from your `.env.local` file (e.g., `NEXT_PUBLIC_FIREBASE_API_KEY`, etc.).

### Step 2.5: Deploy the Application

Run this single command from your project's root directory.

```bash
firebase deploy
```

This command will automatically build your Next.js application and deploy it to App Hosting. Your live application will be available at `https://<your-app-name>.web.app`.
