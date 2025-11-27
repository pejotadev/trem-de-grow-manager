# GrowControl Setup Instructions

## Quick Start Guide

Follow these steps to get your GrowControl app up and running.

---

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Expo framework and router
- Firebase SDK
- React Navigation dependencies
- UI icons and utilities

---

## Step 2: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter project name (e.g., "GrowControl")
4. Follow the setup wizard (Analytics is optional)

---

## Step 3: Enable Firebase Authentication

1. In Firebase Console, go to **Build** > **Authentication**
2. Click "Get started"
3. Click on **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click "Save"

---

## Step 4: Create Firestore Database

1. In Firebase Console, go to **Build** > **Firestore Database**
2. Click "Create database"
3. Choose **Test mode** for development (you can add security rules later)
4. Select a region closest to your users
5. Click "Enable"

---

## Step 5: Get Firebase Configuration

1. In Firebase Console, go to **Project settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the **Web** icon (`</>`)
4. Register your app with a nickname (e.g., "GrowControl Web")
5. Copy the `firebaseConfig` object

It will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

---

## Step 6: Update Firebase Configuration

1. Open `firebase/firebaseConfig.ts`
2. Replace the placeholder values with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

---

## Step 7: Run the App

```bash
npx expo start
```

This will start the Expo development server. You'll see a QR code and options to run the app on:

- **iOS Simulator**: Press `i` (requires Xcode on macOS)
- **Android Emulator**: Press `a` (requires Android Studio)
- **Web Browser**: Press `w`
- **Physical Device**: Install "Expo Go" app and scan the QR code

---

## Testing the App

### 1. Create an Account
- Open the app
- You'll see the Login screen
- Tap "Sign up" link
- Enter email and password (min 6 characters)
- Tap "Sign Up"

### 2. Create Your First Plant
- After login, you'll see the home screen
- Tap "+ Add New Plant"
- Enter plant name (e.g., "Northern Lights #1")
- Enter strain (e.g., "Northern Lights")
- Select starting stage
- Tap "Create Plant"

### 3. View Plant Details
- Tap on the plant card from home screen
- See plant information and stage history
- Update the growth stage using the buttons
- View recent watering and environment logs

### 4. Add Logs
- Go to "Logs" tab at the bottom
- Choose "Watering Logs" or "Environment Logs"
- Tap "+ Add [Log Type]"
- Fill in the form
- Tap "Add Log"

---

## Recommended Firestore Security Rules

Once you're ready for production, update your Firestore security rules:

1. Go to **Firestore Database** > **Rules** tab
2. Replace with these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own plants
    match /plants/{plantId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && 
        request.auth.uid == request.resource.data.userId;
    }
    
    // Stages are linked to plants (check ownership indirectly)
    match /stages/{stageId} {
      allow read, write: if request.auth != null;
    }
    
    // Logs are linked to plants (check ownership indirectly)
    match /wateringLogs/{logId} {
      allow read, write: if request.auth != null;
    }
    
    match /environmentLogs/{logId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

---

## Troubleshooting

### "Firebase config not found"
- Make sure you've updated `firebase/firebaseConfig.ts` with your actual credentials
- Don't use the placeholder values

### "Permission denied" errors
- Check Firestore security rules are in Test mode or properly configured
- Ensure you're logged in

### "Module not found" errors
- Run `npm install` again
- Clear cache: `npx expo start -c`

### App doesn't load
- Make sure you're in the correct directory: `cd grow-manager`
- Check Node.js version: `node --version` (should be v18+)
- Try restarting the Metro bundler

### Icons not showing
- Icons should load automatically from @expo/vector-icons
- If not, restart the dev server

---

## Next Steps

### Production Build
When ready to deploy:

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Features to Add
- Photo uploads for plants
- Harvest tracking
- Notes and journal entries
- Charts and analytics
- Push notifications for watering reminders
- Export data to PDF

---

## Need Help?

- [Expo Documentation](https://docs.expo.dev/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)

---

Enjoy growing! 🌱

