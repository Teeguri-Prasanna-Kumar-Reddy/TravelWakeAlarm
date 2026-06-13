import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import * as TaskManager from 'expo-task-manager';
import AppNavigator from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { COLORS } from './src/constants/theme';

// Import services to ensure background tasks are registered early
import './src/services/LocationService';
import AudioService from './src/services/AudioService';
import NotificationService from './src/services/NotificationService';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote notifications) functionality',
]);

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await AudioService.init();
        await NotificationService.setupAndroidChannel();
      } catch (e) {
        console.log('App preparation note:', e);
      } finally {
        setIsReady(true);
      }
    }
    prepare();
  }, []);

  if (!fontsLoaded || !isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="light" />
        <AppNavigator />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
