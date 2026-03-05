
# Assetain

A full-featured, offline-first Asset Management Web App, built with Next.js, Tailwind CSS, and Firebase.

## Application Features & Overview

This application is designed to solve the critical challenge of managing and verifying assets in diverse environments, especially in locations with limited or no internet connectivity.

### Core Features

*   **Offline-First by Default**: All data is stored and managed in the browser's local database (IndexedDB), ensuring work is never lost due to lack of internet.
*   **Role-Based Access & Approval Workflow**: Secure login system with roles (Admin, User, Zonal Manager).
*   **Regional Bulk Sync**: Fetches data for all authorized states in a user's region, enabling seamless offline switching.
*   **Asset Insight Engine**: Dynamic dashboard highlighting data quality issues, maintenance alerts, and recent modifications.
*   **Dynamic Excel Import & Export**:
    *   **Intelligent Import**: Parses complex Excel files, automatically detecting headers and mapping data.
    *   **Structure-Preserving Export**: Exports data back into Excel files mirroring the original column structure.
*   **Insightful Dashboard**: 10 key metrics and real-time visual progress bars for asset verification.

---

## 1. Professional Production Roadmap

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

## 2. Branding Options

**Set A: Authority & Vision**
*   **Vantage Asset Manager**: Implies a powerful, high-level perspective.
*   **Sentinel Field Ledger**: Suggests reliability and accurate field-based records.
*   **OmniVerify Global**: Highlights the all-encompassing verification workflow.
*   **Axiom Assets**: Sounds foundational, trustworthy, and authoritative.
*   **AssetNode**: A modern, sleek name for a central information hub.

**Set B: Flow & Precision**
*   **AssetFlow**: Focuses on the movement and lifecycle of assets.
*   **Sentinel Assets**: Evokes a sense of protection and vigilance.
*   **VerifyPro Global**: A direct, action-oriented name for teams.
*   **Global Ledger**: Sounds foundational and authoritative.
*   **Inventory Prime**: Suggests a high-performance, essential tool.

---

## 3. Deployment to assetain.web.app

This project is pre-configured to deploy to the specific Firebase site `assetain`.

### Step 3.1: Verify Site ID
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. Navigate to **Hosting**.
4. Ensure you have a site created with the ID `assetain`.

### Step 3.2: Add Custom Domain
To link `assetain.com`:
1. In Hosting dashboard, click **Add custom domain**.
2. Enter `assetain.com` and follow DNS verification instructions.

### Step 3.3: Deploy
```bash
firebase deploy --only hosting
```

---

## 4. Local Development Setup

### Step 4.1: Create `.env.local` file
Copy the example environment file:
```bash
cp .env.example .env.local
```

### Step 4.2: Fill in your Firebase Credentials
Open `.env.local` and provide your specific Firebase configuration values.

---

## 5. Version Control (Git)

### Step 5.1: Initialize Repository
If you haven't already, initialize your local Git repository:
```bash
git init
```

### Step 5.2: Stage and Commit
```bash
git add .
git commit -m "Initial commit: Assetain offline-first asset manager"
```

### Step 5.3: Push to Remote (GitHub/GitLab)
```bash
git remote add origin <your-repository-url>
git branch -M main
git push -u origin main
```

---

## 6. Data Privacy & Security

### **CRITICAL: Security Weaknesses in the Current Version**

The current codebase is a prototype and **is NOT secure for production use** without these modifications:

1.  **Firebase Authentication**: Replace the custom login system with Firebase Auth to prevent plaintext password storage.
2.  **Strict Security Rules**: Enforce per-user and per-state read/write permissions in `firestore.rules` and `database.rules.json`.
# ntblcp-asset-manager
