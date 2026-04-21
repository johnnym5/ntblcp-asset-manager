# Build & Deployment Instructions for NTBLCP Asset Manager v1.0

**Status:** ✅ Code Ready for Build  
**Date:** April 17, 2026

---

## 🔐 Security & Secrets Management

**CRITICAL:** All API keys and administrative passcodes have been removed from the source code. The application now relies exclusively on environment variables.

### Configuration Steps
1.  **Local Development**: Define secrets in `.env.local`.
2.  **Firebase App Hosting**: Add secrets via the Firebase Console (Environment Variables section).
3.  **CI/CD**: Ensure GitHub secrets are configured for automated builds.

---

## 🚀 Git Authentication (GitHub)

GitHub no longer supports password authentication for HTTPS operations. When pushing your code, you must use a **Personal Access Token (PAT)**.

### How to push to GitHub:
1.  **Generate a PAT**: Go to GitHub > Settings > Developer Settings > Personal Access Tokens.
2.  **Update Remote**: Run this command replacing `YOUR_TOKEN` with your PAT:
    ```bash
    git remote set-url origin https://YOUR_TOKEN@github.com/johnnym5/ntblcp-asset-manager.git
    ```
3.  **Push**: `git push -u origin main`

---

## 📋 Build Instructions

### Prerequisites
```bash
# Install dependencies
npm install --legacy-peer-deps
```

### Build Web App
```bash
# Standard Next.js build
npm run build
```

---

## 🔥 Firebase Deployment

### Deploy Firestore & Hosting
```bash
# project configured in .firebaserc
firebase deploy
```

---

*Generated: April 17, 2026*  
*Asset Manager v1.0 - Hardened for Production*
