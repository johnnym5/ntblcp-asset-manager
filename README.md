
# NTBLCP Asset Assist

A full-featured, offline-first Asset Management Web App for NTBLCP, built with Next.js, Tailwind CSS, and a local-first architecture.

## Application Features & Overview

This application is designed to solve the critical challenge of managing and verifying assets in diverse environments, especially in locations with limited or no internet connectivity.

### Core Features

*   **Offline-First by Default**: The application is built to work completely offline. All data is stored and managed in the browser's local storage, ensuring that work is never lost due to a lack of internet.
*   **Role-Based Access**:
    *   **State/Zone User**: Enters a username and selects an assigned State or Geopolitical Zone. The entire application is then automatically filtered to show only assets relevant to that specific location.
    *   **Admin User**: By entering 'admin' as the username, the user gains access to view and manage all assets across all states and zones without any filters.
*   **Dynamic Excel Import & Export**:
    *   **Intelligent Import**: Parses complex Excel files containing up to 9 different asset sheet formats, automatically detecting headers and mapping data to a unified structure.
    *   **Structure-Preserving Export**: Exports data back into an Excel file that mirrors the original's column structure and naming conventions, with "Verified Status" and "Verified Date" appended at the end.
    *   **Smart Naming**: Exported filenames are automatically generated based on the user's role (e.g., `Lagos-export.xlsx` or `admin-export.xlsx`).
*   **Advanced Data Management**:
    *   **Smart Search**: A global search bar that understands multiple keywords to quickly find assets across all fields and categories.
    *   **Filtering & Sorting**: Powerful popover filters for location, assignee, and status, along with multi-key sorting.
    *   **Batch Editing**: Select multiple assets and apply changes (like updating location or status) to all of them in a single action.
*   **Insightful Dashboard**:
    *   The main dashboard provides a high-level overview of asset verification progress with clear, visual progress bars for both the overall status and individual asset categories.
*   **AI-Ready Backend**: Includes pre-built Genkit flows for AI-powered OCR to extract data from asset labels, laying the groundwork for future scanner integration.

### How It Works (Use Cases & Impact)

*   **Impact**: This tool empowers field officers and administrators by providing a reliable, centralized system for asset management. It dramatically improves data accuracy, streamlines the verification process, and provides clear visibility into asset distribution, even in the most challenging offline environments.
*   **Use Cases**:
    *   **Field Verification**: An officer in a remote area can load the app, work entirely offline to find, view, and update the status of assets, and then export their work when they return to a connected area.
    *   **State Coordination**: A state coordinator can quickly get an overview of all assets within their state, track verification progress, and identify discrepancies.
    *   **National Auditing**: An administrator can use the 'admin' view to see the complete national asset register, search across all records, and export comprehensive reports by category.

### Current Limitations

*   **Browser Storage Quotas**: While optimized, importing extremely large datasets can still potentially exceed the browser's local storage capacity.
*   **Manual Data Sync**: The application operates in a purely local mode. There is no automatic, real-time synchronization with a central server. Data transfer is handled manually through Excel import/export.
*   **No User Management UI**: The 'admin' user is recognized by its name. There is no backend or UI for creating user accounts, assigning roles, or managing permissions.
*   **No Conflict Resolution**: Because there is no central server, if two users export, modify, and re-import the same data, there is no mechanism to automatically resolve conflicting changes.

### Future Improvements

*   **Full Firebase Integration**: Implement a robust, real-time synchronization system between the local offline data and a central Firestore database.
*   **Camera & OCR Integration**: Build a UI to use the device's camera to scan asset labels, feeding the image directly to the existing AI flow to auto-fill and validate asset details.
*   **Google Sheets Integration**: Allow direct, authenticated import and export with Google Sheets to further streamline data management and collaboration.
*   **Advanced Reporting**: Create a dedicated reporting module to generate and visualize more detailed analytics from the asset data.
*   **Progressive Web App (PWA)**: Enhance PWA features to allow the app to be "installed" on a device's home screen for a more seamless, native-like experience.

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
    Open the `.firebaserc` file and replace `"ntblcp-asset-manager"` with your actual Firebase Project ID.

4.  **Configure Environment Variables**:
    In the Firebase Console, navigate to your project's App Hosting backend. In the settings, add the following environment variables, using the values from your `.env` file:
    - `NEXT_PUBLIC_FIREBASE_API_KEY`
    - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
    - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
    - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
    - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    - `NEXT_PUBLIC_FIREBASE_APP_ID`

### Deploy

Once the prerequisites are met, deploy the app with a single command:

```bash
firebase deploy
```

Firebase will build your Next.js application and deploy it. After the command completes, it will provide you with the URL to your live application.

## Getting Started (Local Development)

First, populate the Firebase configuration variables in the `.env` file with your project's credentials.

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
