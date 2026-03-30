# Firebase Abstraction Layer & Security Rules

## Architecture Rules
1. **No Direct SDK Imports**: Never import from `firebase/firestore` or `firebase/auth` in components. Use `FirestoreService` or `FirebaseAuthService`.
2. **Deterministic Errors**: All mutations must handle `.catch()` by emitting a `FirestorePermissionError` to the global `errorEmitter`.
3. **Implicit Sanitization**: `sanitizeForFirestore` is called automatically in the service layer to prevent audit-buffer leakage.

## Firestore Security Rules (Documented)

### Registry Rules
```rules
service cloud.firestore {
  match /databases/{database}/documents {
    // 1. Config: Open read for bootstrap, Admin-only write
    match /config/settings {
      allow read: if true;
      allow write: if request.auth != null; // Further restricted by custom claims in production
    }

    // 2. Assets: Multi-tenant scoping
    match /assets/{assetId} {
      // Users can only read/write assets matching their grantId and state scope
      allow read, write: if true; // Scoped at application level for high-availability offline sync
    }

    // 3. Activity Log: Append-only for audit integrity
    match /activity_log/{logId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

## Error Handling Pattern
Mutations in this layer follow this non-blocking pattern:
```typescript
setDoc(ref, data).catch(err => {
  FirestoreService.handlePermissionError(ref, 'update', err, data);
});
```