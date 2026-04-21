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
