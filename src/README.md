# NTBLCP ASSET VERIFICATOR

A full-featured, offline-first Asset Management Web App for NTBLCP, built with Next.js, Tailwind CSS, and a local-first architecture.

## Application Features & Overview

This application is designed to solve the critical challenge of managing and verifying assets in diverse environments, especially in locations with limited or no internet connectivity.

### Core Features

*   **Offline-First by Default**: The application is built to work completely offline. All data is stored and managed in the browser's local storage, ensuring that work is never lost due to a lack of internet.
*   **Installable App (PWA)**: The application is a Progressive Web App, which means it can be 'installed' on your mobile device or desktop for a fast, reliable, and app-like experience.
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
*   **User Activity Logging**: For admin users, the inbox shows a real-time feed of user logins and logouts, providing valuable oversight.

### How It Works (Use Cases & Impact)

*   **Impact**: This tool empowers field officers and administrators by providing a reliable, centralized system for asset management. It dramatically improves data accuracy, streamlines the verification process, and provides clear visibility into asset distribution, even in the most challenging offline environments.
*   **Use Cases**:
    *   **Field Verification**: An officer in a remote area can load the app, work entirely offline to find, view, and update the status of assets, and then export their work when they return to a connected area.
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
    Open the `.firebaserc` file and replace `"globalassethub"` with your actual Firebase Project ID.

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

Firebase will build your Next.js application and deploy it. After the command completes, it will provide you with the URL to your live application.

## Getting Started (Local Development)

First, create a `.env` file in the root of the project by copying the `.env.example` file. Then, populate the Firebase configuration variables in the `.env` file with your project's credentials.

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.
