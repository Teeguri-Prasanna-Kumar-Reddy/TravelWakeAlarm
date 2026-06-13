# Travel Wake Alarm

A production-ready React Native application built with Expo to help you travel at night by tracking your location and triggering a loud alarm before you reach your destination.

## Features
- **OpenStreetMap Integration**: Search and select destinations using Nominatim.
- **Background Location Tracking**: Continuously tracks location using `expo-location` and `expo-task-manager`, even when the app is minimized.
- **Dynamic Alarm**: Calculates Haversine distance and triggers an alarm and vibration when within the user-defined threshold.
- **Offline Support**: Continues to calculate distance without internet after destination is selected (GPS only).
- **Dark Mode UI**: Clean, minimal UI optimized for night-time viewing to reduce eye strain.

## Project Structure
```
/src
  /components    - Reusable UI elements (Button, SearchBar, MapPreview)
  /constants     - Theme colors, spacing, fonts
  /navigation    - React Navigation stack (Home, Tracking, Alarm)
  /screens       - Core screens
  /services      - Background logic (LocationService, AudioService, NotificationService, Storage)
  /utils         - Haversine distance calculation
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or newer recommended)
- Expo CLI
- Android Studio / Xcode (or Expo Go app on your physical device)

### Installation
1. Clone the repository and navigate to the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm start
   ```

### Running on Device (Recommended for Background Location)
Background location tracking behaves differently on simulators vs physical devices. It is highly recommended to test this on a real device.
- Download the **Expo Go** app on your phone.
- Scan the QR code presented by `npm start` in your terminal.

**Note for Android Users:** Ensure you grant "Allow all the time" location permissions in your Android settings for the background task to run smoothly when the app is closed.

### Production Build
To create a standalone production app, you will need to use Expo Application Services (EAS).
1. Install EAS CLI: `npm install -g eas-cli`
2. Configure project: `eas build:configure`
3. Build for Android: `eas build --platform android --profile production`
4. Build for iOS: `eas build --platform ios --profile production`

## Permissions Handled
- Foreground Location
- Background Location (ACCESS_BACKGROUND_LOCATION)
- Push Notifications
- Foreground Service (Android)
- Vibrate

## Customization
- **Theme**: Modify `src/constants/theme.ts` to change the colors and sizing.
- **Alarm Sound**: To add a custom alarm sound, place your `.mp3` file in `/assets` and update `src/services/AudioService.ts` to load it using `expo-av`.
