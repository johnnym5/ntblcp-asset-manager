
# Offline Asset Assist

A full-featured, offline-first Asset Management Web App for NTBLCP, built with Next.js, Tailwind CSS, and a local-first architecture.

## Application Features & Overview

This application is designed to solve the critical challenge of managing and verifying assets in diverse environments, especially in locations with limited or no internet connectivity.

### Core Features

*   **Offline-First by Default**: The application is built to work completely offline. All data is stored and managed in the browser's local database (IndexedDB), ensuring that work is never lost due to a lack of internet.
*   **Role-Based Access**: A simple, passwordless login screen grants access based on a predefined list of users. Each user is locked to the assets of their assigned state(s), while admins can view all assets.
*   **Dynamic Excel Import & Export**:
    *   **Intelligent Import**: Parses complex Excel files containing multiple asset sheet formats, automatically detecting headers and mapping data to a unified structure. This works both online and offline.
    *   **Structure-Preserving Export**: Exports data back into an Excel file that mirrors the original's column structure and naming conventions, with "Verified Status" and "Verified Date" appended at the end.
*   **Advanced Data Management**:
    *   **Smart Search**: A global search bar that understands multiple keywords to quickly find assets across all fields and categories.
    *   **Filtering & Sorting**: Powerful popover filters for location, assignee, and status, along with multi-key sorting.
    *   **Batch Editing**: Select multiple assets and apply changes (like updating location or status) to all of them in a single action.
*   **Insightful Dashboard**:
    *   The main dashboard provides a high-level overview of asset verification progress with clear, visual progress bars for both the overall status and individual asset categories.
*   **Selective Sync**: Users can select one or more assets or entire categories and push only those specific items to the cloud database, providing granular control over data synchronization.

### How It Works (Use Cases & Impact)

*   **Impact**: This tool empowers field officers and administrators by providing a reliable, centralized system for asset management. It dramatically improves data accuracy, streamlines the verification process, and provides clear visibility into asset distribution, even in the most challenging offline environments.
*   **Use Cases**:
    *   **Field Verification**: An officer in a remote area can import a new list of assets from an Excel file, work entirely offline to update their status, and then selectively push only their updated records to the cloud once they regain connectivity.
    *   **State Coordination**: A state coordinator can quickly get an overview of all assets within their state, track verification progress, and identify discrepancies.
    *   **National Auditing**: An administrator can use the 'admin' view to see the complete national asset register, search across all records, and export comprehensive reports by category.

---

## Deployment to Firebase App Hosting

This project is configured for deployment to Firebase App Hosting.

### Prerequisites

1.  **Install Firebase CLI**:
    ```bash
    npm install -g firebase-tools
    ```

2.  **Login to Firebase**:
    ```bash
    firebase login
    ```

3.  **Set Project ID**:
    Open the `.firebaserc` file and replace the placeholder with your actual Firebase Project ID.

4.  **Configure Environment Variables**:
    In the Firebase Console, navigate to your project's App Hosting backend. In the settings, add the following environment variables. You can find these values in your Firebase project settings under "General".

    *   `NEXT_PUBLIC_FIREBASE_API_KEY`
    *   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    *   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    *   `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    *   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    *   `NEXT_PUBLIC_FIREBASE_APP_ID`

### Deploy

Once the prerequisites are met, deploy the app with a single command:

```bash
firebase deploy
```

Firebase will build your Next.js application and deploy it. After the command completes, you can access your live application at the following URL:

[https://ntblcp-asset-manager-k7hy1.web.app](https://ntblcp-asset-manager-k7hy1.web.app)

## Getting Started (Local Development)

**CRITICAL STEP:** Before you can run the app locally, you must provide your Firebase project's credentials.

1.  **Copy the example file**:
    Make a copy of the `.env.example` file and rename it to `.env`.

2.  **Fill in your credentials**:
    Open the new `.env` file. You will see placeholders like `YOUR_API_KEY`. Go to your Firebase project's settings page in the Firebase Console. Under the "General" tab, find the "Your apps" section, select your web app, and copy the corresponding values into the `.env` file.

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
