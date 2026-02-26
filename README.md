
# Assetain

A full-featured, offline-first Asset Management Web App, built with Next.js, Tailwind CSS, and Firebase.

## Application Features & Overview

This application is designed to solve the critical challenge of managing and verifying assets in diverse environments, especially in locations with limited or no internet connectivity.

### Core Features

*   **Offline-First by Default**: The application is built to work completely offline. All data is stored and managed in the browser's local database (IndexedDB), ensuring that work is never lost due to a lack of internet.
*   **Role-Based Access & Approval Workflow**: A secure login system grants access based on user roles (Admin, User, Zonal Manager).
*   **Regional Bulk Sync**: Intelligent synchronization fetches data for all authorized states in a user's region, enabling seamless offline switching between locations.
*   **Asset Insight Engine**: A dynamic dashboard that highlights random data quality issues, maintenance alerts, and recent modifications.
*   **Dynamic Excel Import & Export**:
    *   **Intelligent Import**: Parses complex Excel files, automatically detecting headers and mapping data to a unified structure.
    *   **Structure-Preserving Export**: Exports data back into Excel files that mirror the original's column structure.
*   **Insightful Dashboard**: Provides a high-level overview of asset verification progress with 10 key metrics and real-time visual progress bars.

---

## 1. Professional Production Roadmap

If this application were to be fully developed by a professional team, the following structure would be used:

### Team Roles
*   **Product Manager**: Feature prioritization and stakeholder management.
*   **UI/UX Designer**: Field-optimized interface design and accessibility.
*   **Lead Frontend Engineer**: Next.js architecture and complex parsing logic.
*   **Full-Stack/Cloud Engineer**: Firebase Hybrid-DB architecture and Security Rules.
*   **QA Specialist**: Testing sync conflicts and IndexedDB edge cases.

### Development Methodology
*   **Agile Scrum**: 2-week sprints with bi-weekly demos.
*   **Duration**: ~4 Months (1 month design, 2 months core development, 1 month testing/security).

### App Scale
*   **Capacity**: National-level utility capable of handling 100,000+ assets and thousands of concurrent field officers.
*   **Architecture**: Scalable Vercel/Firebase backend designed for high availability.

---

## 2. Branding Options (Workshop)

Here are a few workshopped names that reflect the professional nature of the tool:

**Set A: Authority & Vision**
*   **Vantage Asset Manager**: Implies a powerful, high-level perspective on all resources.
*   **Sentinel Field Ledger**: Suggests reliability, protection of data, and accurate field-based records.
*   **OmniVerify Global**: Highlights the all-encompassing nature of the verification workflow.
*   **Axiom Assets**: Sounds foundational, trustworthy, and authoritative.
*   **AssetNode**: A modern, sleek name for a central information hub.

**Set B: Flow & Precision**
*   **AssetFlow**: Focuses on the movement and lifecycle of assets.
*   **Sentinel Assets**: Evokes a sense of protection and vigilance.
*   **VerifyPro Global**: A direct, action-oriented name for verification teams.
*   **Global Ledger**: Sounds foundational and authoritative.
*   **Inventory Prime**: Suggests a high-performance, essential tool.

---

## 3. Deployment to assetain.web.app

This project is pre-configured to deploy to the specific Firebase site `assetain`.

### Step 3.1: Verify Site ID
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Navigate to **Hosting**.
4. Ensure you have a site created with the ID `assetain`. If your site ID is different, update the `"site": "..."` property in `firebase.json`.

### Step 3.2: Add Custom Domain
To link `assetain.com`:
1. In the Firebase Hosting dashboard, click **Add custom domain**.
2. Enter `assetain.com` and follow the instructions to verify ownership via DNS records.

### Step 3.3: Deploy
Run the following command to deploy only to the specified site:
```bash
firebase deploy --only hosting
```

---

## 4. Local Development Setup

Before you can run the app locally, you must provide your Firebase project's credentials.

### Step 4.1: Create `.env.local` file
Create a file named `.env.local` in the root of the project.

### Step 4.2: Fill in your Firebase Credentials
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=assetain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://assetain-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=assetain
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=assetain.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

---

## 5. Data Privacy & Security

### **CRITICAL: Security Weaknesses in the Current Version**

The current codebase is a prototype and **is NOT secure for production use** without these modifications:

1.  **Firebase Authentication**: Replace the custom login system with Firebase Auth to prevent plaintext password storage.
2.  **Strict Security Rules**: Enforce per-user and per-state read/write permissions in `firestore.rules` and `database.rules.json`.
