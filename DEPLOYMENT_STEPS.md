
# Step-by-Step Deployment Guide

This guide will walk you through deploying your NTBLCP Asset Verificator application to Firebase App Hosting.

---

### Step 1: Install the Firebase CLI

If you haven't already, you need to install the Firebase Command Line Interface (CLI) on your computer. This tool lets you interact with your Firebase project from your terminal.

Open your terminal or command prompt and run this command:
```bash
npm install -g firebase-tools
```

---

### Step 2: Log in to Firebase

Next, you need to log in to your Firebase account through the CLI. This command will open a browser window for you to sign in.

Run this command in your terminal:
```bash
firebase login
```
Follow the on-screen instructions in your browser to complete the login.

---

### Step 3: Set Your Firebase Project ID

Your application needs to know which Firebase project to deploy to.

1.  Open the `.firebaserc` file in your project's root directory.
2.  Replace the placeholder project ID (`ntblcp-asset-manager-k7hy1`) with your actual Firebase Project ID. It should look like this:

    ```json
    {
      "projects": {
        "default": "YOUR-FIREBASE-PROJECT-ID"
      }
    }
    ```

---

### Step 4: Configure Environment Variables in Firebase

This is the most critical step. Your deployed application needs your Firebase API keys to connect to the database and authentication services. You will set these securely in the Firebase Console.

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Select your project (`YOUR-FIREBASE-PROJECT-ID`).
3.  In the left-hand navigation pane, click the **Build** dropdown and select **App Hosting**.
4.  You should see your App Hosting backend listed. Click on it.
5.  Navigate to the **Settings** tab for your backend.
6.  In the "Environment variables" section, click **Add variable**. You need to add the following six variables one by one. You can find these values in your Firebase project settings (click the gear icon ⚙️ > **Project settings** > **General** tab > scroll down to "Your apps").

    | Variable Name                             | Example Value                             |
    | ----------------------------------------- | ----------------------------------------- |
    | `NEXT_PUBLIC_FIREBASE_API_KEY`            | `AIzaSy...`                               |
    | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`        | `your-project-id.firebaseapp.com`         |
    | `NEXT_PUBLIC_FIREBASE_PROJECT_ID`         | `your-project-id`                         |
    | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`     | `your-project-id.appspot.com`             |
    | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`| `1234567890`                              |
    | `NEXT_PUBLIC_FIREBASE_APP_ID`             | `1:1234567890:web:...`                    |

    **Important**: Make sure the variable names are spelled *exactly* as shown above.

---

### Step 5: Deploy the Application

Once all the prerequisites are met, you can deploy your application with a single command from your project's root directory in your terminal.

```bash
firebase deploy
```

This command will automatically build your Next.js application and deploy it to App Hosting. When it's finished, you can access your live application at the following URL:

[https://ntblcp-asset-manager-k7hy1.web.app](https://ntblcp-asset-manager-k7hy1.web.app)

That's it! Your application will be live.
