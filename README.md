
# NTBLCP Asset Manager

This is a full-featured Asset Management Web App for NTBLCP, built with Next.js, Firebase, and Tailwind CSS.

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
