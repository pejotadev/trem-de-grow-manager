# Firebase Setup Guide

## Overview

GrowControl uses Firebase for:
- **Authentication**: User login/registration
- **Firestore**: NoSQL database for all app data

---

## Database Structure

### Collections

#### `users/{uid}`
Stores user profile information.

**Fields:**
- `uid` (string): User's unique ID
- `email` (string): User's email address
- `createdAt` (number): Timestamp of account creation

**Example:**
```json
{
  "uid": "abc123xyz",
  "email": "grower@example.com",
  "createdAt": 1699564800000
}
```

---

#### `plants/{plantId}`
Stores plant information.

**Fields:**
- `id` (string): Plant's unique ID
- `userId` (string): Owner's user ID
- `name` (string): Plant name
- `strain` (string): Strain name
- `startDate` (number): Timestamp when plant was started
- `currentStage` (string): Current growth stage
- `stageId` (string, optional): Current stage document ID

**Example:**
```json
{
  "id": "plant_123",
  "userId": "abc123xyz",
  "name": "Northern Lights #1",
  "strain": "Northern Lights",
  "startDate": 1699564800000,
  "currentStage": "Veg"
}
```

**Indexes Needed:**
- `userId` (ascending) + `startDate` (descending)

---

#### `stages/{stageId}`
Tracks growth stage changes for each plant.

**Fields:**
- `id` (string): Stage record ID
- `plantId` (string): Parent plant ID
- `name` (string): Stage name (Seedling, Veg, Flower, Drying, Curing)
- `startDate` (number): Timestamp when stage started

**Example:**
```json
{
  "id": "stage_456",
  "plantId": "plant_123",
  "name": "Flower",
  "startDate": 1699564800000
}
```

**Indexes Needed:**
- `plantId` (ascending) + `startDate` (descending)

---

#### `wateringLogs/{logId}`
Records watering events and nutrients used.

**Fields:**
- `id` (string): Log record ID
- `plantId` (string): Plant ID
- `date` (number): Timestamp of watering
- `ingredients` (array): List of ingredients/nutrients used
- `notes` (string): Additional notes

**Example:**
```json
{
  "id": "water_789",
  "plantId": "plant_123",
  "date": 1699564800000,
  "ingredients": ["Water", "Nutrient A", "Cal-Mag"],
  "notes": "Full feeding, pH 6.5"
}
```

**Indexes Needed:**
- `plantId` (ascending) + `date` (descending)

---

#### `environmentLogs/{logId}`
Records environmental conditions.

**Fields:**
- `id` (string): Log record ID
- `plantId` (string): Plant ID
- `date` (number): Timestamp of reading
- `temp` (number): Temperature in Celsius
- `humidity` (number): Humidity percentage
- `lightHours` (number): Hours of light per day
- `notes` (string): Additional notes

**Example:**
```json
{
  "id": "env_101",
  "plantId": "plant_123",
  "date": 1699564800000,
  "temp": 24.5,
  "humidity": 65,
  "lightHours": 18,
  "notes": "Optimal conditions"
}
```

**Indexes Needed:**
- `plantId` (ascending) + `date` (descending)

---

## Creating Firestore Indexes

The app uses compound queries that require indexes. Firebase will prompt you to create these automatically when you first use the app, or you can create them manually:

### Via Firebase Console:

1. Go to **Firestore Database** > **Indexes** tab
2. Click "Add Index"
3. Create these indexes:

**Index 1: Plants by User**
- Collection: `plants`
- Fields:
  - `userId` (Ascending)
  - `startDate` (Descending)

**Index 2: Stages by Plant**
- Collection: `stages`
- Fields:
  - `plantId` (Ascending)
  - `startDate` (Descending)

**Index 3: Watering Logs by Plant**
- Collection: `wateringLogs`
- Fields:
  - `plantId` (Ascending)
  - `date` (Descending)

**Index 4: Environment Logs by Plant**
- Collection: `environmentLogs`
- Fields:
  - `plantId` (Ascending)
  - `date` (Descending)

### Via Console Click-Through:

Easier method - just use the app and when you see an error like:
```
"The query requires an index"
```

Click the provided link to automatically create the index.

---

## Security Rules

### Development (Test Mode)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2024, 12, 31);
    }
  }
}
```

⚠️ **Warning**: Test mode allows anyone to read/write your data. Only use during development!

---

### Production (Secure)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }
    
    // Plants collection
    match /plants/{plantId} {
      allow read: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() && 
        resource.data.userId == request.auth.uid;
    }
    
    // Stages collection (linked to plants)
    match /stages/{stageId} {
      allow read, write: if isAuthenticated();
      // Note: In production, you'd want to verify the plantId 
      // belongs to the user, but this requires an additional read
    }
    
    // Watering logs (linked to plants)
    match /wateringLogs/{logId} {
      allow read, write: if isAuthenticated();
      // Note: Same as stages - ideally verify plant ownership
    }
    
    // Environment logs (linked to plants)
    match /environmentLogs/{logId} {
      allow read, write: if isAuthenticated();
      // Note: Same as stages - ideally verify plant ownership
    }
  }
}
```

---

## Advanced Security Rules (Most Secure)

For production apps with high security requirements:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isPlantOwner(plantId) {
      return isAuthenticated() && 
        get(/databases/$(database)/documents/plants/$(plantId)).data.userId == request.auth.uid;
    }
    
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }
    
    match /plants/{plantId} {
      allow read: if isPlantOwner(plantId);
      allow create: if isAuthenticated() && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if isPlantOwner(plantId);
    }
    
    match /stages/{stageId} {
      allow read, write: if isPlantOwner(resource.data.plantId);
    }
    
    match /wateringLogs/{logId} {
      allow read, write: if isPlantOwner(resource.data.plantId);
    }
    
    match /environmentLogs/{logId} {
      allow read, write: if isPlantOwner(resource.data.plantId);
    }
  }
}
```

⚠️ **Note**: These rules use `get()` which counts as an extra document read and may increase costs.

---

## Firebase Authentication Setup

### Enable Email/Password Authentication:

1. Firebase Console > **Authentication**
2. Click **Get started**
3. **Sign-in method** tab
4. Click **Email/Password**
5. Toggle **Enable**
6. Click **Save**

### Optional: Enable Email Verification

1. In **Authentication** > **Templates**
2. Customize email verification template
3. In your app, call:
```typescript
await sendEmailVerification(auth.currentUser);
```

### Optional: Password Reset

The app doesn't implement this yet, but you can add:

```typescript
import { sendPasswordResetEmail } from 'firebase/auth';

await sendPasswordResetEmail(auth, email);
```

---

## Monitoring & Analytics

### View Database Usage:
Firebase Console > **Firestore Database** > **Usage** tab

### View Authentication:
Firebase Console > **Authentication** > **Users** tab

### Enable Analytics (Optional):
1. Firebase Console > **Analytics**
2. Enable Google Analytics
3. Install: `expo install @react-native-firebase/analytics`

---

## Backup Your Data

### Export Firestore Data:
```bash
gcloud firestore export gs://[BUCKET_NAME]
```

### Scheduled Backups:
Set up in Firebase Console > **Firestore** > **Import/Export**

---

## Cost Optimization Tips

1. **Use indexes wisely** - Only create needed indexes
2. **Limit queries** - Use pagination for large datasets
3. **Cache data** - Store frequently accessed data locally
4. **Batch writes** - Combine multiple writes when possible
5. **Monitor usage** - Check Firebase Console regularly

### Free Tier Limits (Spark Plan):
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day
- 1 GB storage

This is sufficient for personal use and small teams!

---

## Testing

### Use Firebase Emulator Suite (Optional):

```bash
npm install -g firebase-tools
firebase init emulators
firebase emulators:start
```

Then update `firebaseConfig.ts` to connect to emulator in development.

---

## Troubleshooting

### "Missing or insufficient permissions"
- Check security rules
- Verify user is authenticated
- Check userId matches document owner

### "The query requires an index"
- Click the provided link in error message
- Or manually create index in Firebase Console

### "Firebase: Error (auth/invalid-email)"
- Email format is invalid
- Check for spaces or special characters

### "Firebase: Error (auth/weak-password)"
- Password must be at least 6 characters

---

## Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Authentication Guide](https://firebase.google.com/docs/auth)
- [Firestore Pricing](https://firebase.google.com/pricing)

---

Happy growing! 🌱

