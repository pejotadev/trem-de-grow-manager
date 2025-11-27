# GrowControl 🌱

A full-featured cannabis cultivation management app built with Expo, TypeScript, Expo Router, and Firebase.

## Features

- 🔐 **User Authentication**: Email/Password authentication with Firebase
- 🌿 **Plant Management**: Create, view, update, and delete plants
- 📊 **Growth Stages**: Track plants through Seedling, Veg, Flower, Drying, and Curing stages
- 💧 **Watering Logs**: Record watering schedules and nutrients
- 🌡️ **Environment Logs**: Track temperature, humidity, and light hours
- 👤 **Multi-user Support**: Each user has their own plants and data

## Tech Stack

- **Expo** ~51.0.0
- **React Native** 0.74.0
- **TypeScript** 5.1.3
- **Expo Router** ~3.5.0 (File-based routing)
- **Firebase** 10.7.1 (Auth + Firestore)
- **date-fns** 3.0.0

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Firebase account

## Installation

1. Clone the repository:
```bash
cd grow-manager
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use an existing one
   - Enable Authentication (Email/Password)
   - Create a Firestore Database
   - Copy your Firebase config
   - Update `firebase/firebaseConfig.ts` with your credentials

4. Run the app:
```bash
npx expo start
```

## Firebase Setup

### Authentication
1. Go to Firebase Console > Authentication
2. Enable Email/Password sign-in method

### Firestore Database
1. Go to Firebase Console > Firestore Database
2. Create database in test mode (or production mode with security rules)
3. The app will automatically create the following collections:
   - `users/{uid}` - User profiles
   - `plants/{plantId}` - Plant information
   - `stages/{stageId}` - Growth stage records
   - `wateringLogs/{logId}` - Watering records
   - `environmentLogs/{logId}` - Environment records

### Recommended Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /plants/{plantId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    match /stages/{stageId} {
      allow read, write: if request.auth != null;
    }
    
    match /wateringLogs/{logId} {
      allow read, write: if request.auth != null;
    }
    
    match /environmentLogs/{logId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Project Structure

```
grow-manager/
├── app/                          # Expo Router app directory
│   ├── (auth)/                   # Authentication group
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Plants list
│   │   ├── plants/
│   │   │   ├── new.tsx           # Create new plant
│   │   │   └── [id].tsx          # Plant details
│   │   └── logs/
│   │       ├── index.tsx         # Logs hub
│   │       ├── watering.tsx      # Watering logs
│   │       └── environment.tsx   # Environment logs
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   └── Loading.tsx
├── contexts/                     # React contexts
│   └── AuthContext.tsx
├── firebase/                     # Firebase configuration
│   ├── firebaseConfig.ts
│   ├── auth.ts
│   └── firestore.ts
├── types/                        # TypeScript types
│   └── index.ts
└── package.json
```

## Data Models

### User
```typescript
{
  uid: string
  email: string
  createdAt: number
}
```

### Plant
```typescript
{
  id: string
  userId: string
  name: string
  strain: string
  startDate: number
  currentStage?: StageName
}
```

### Stage
```typescript
{
  id: string
  plantId: string
  name: "Seedling" | "Veg" | "Flower" | "Drying" | "Curing"
  startDate: number
}
```

### WaterRecord
```typescript
{
  id: string
  plantId: string
  date: number
  ingredients: string[]
  notes: string
}
```

### EnvironmentRecord
```typescript
{
  id: string
  plantId: string
  date: number
  temp: number
  humidity: number
  lightHours: number
  notes: string
}
```

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Add Plant**: Tap "Add New Plant" to create your first plant
3. **Track Progress**: Update growth stages as your plant progresses
4. **Log Data**: Record watering and environment data regularly
5. **View History**: Access all historical data for each plant

## Development

### Run on iOS
```bash
npx expo start --ios
```

### Run on Android
```bash
npx expo start --android
```

### Run on Web
```bash
npx expo start --web
```

## Building for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## Troubleshooting

### Firebase Configuration Error
- Ensure you've replaced the placeholder values in `firebase/firebaseConfig.ts`
- Verify your Firebase project settings

### Authentication Issues
- Check that Email/Password authentication is enabled in Firebase Console
- Verify your network connection

### Firestore Permission Denied
- Ensure you've set up proper Firestore security rules
- Check that the user is authenticated

## Contributing

This is a personal project, but feel free to fork and customize for your needs!

## License

MIT

## Disclaimer

This app is for educational purposes. Please ensure compliance with local laws regarding cannabis cultivation.

