import * as Notifications from 'expo-notifications';
import { Platform, PermissionsAndroid } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  async requestPermissions() {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Request POST_NOTIFICATIONS directly to bypass expo-notifications push token crash in Expo Go
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      
      if (Platform.OS === 'ios') {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
      }

      return true; // Older Android versions don't need runtime permission for this
    } catch (e) {
      console.log('Notification permission request handled:', e);
      return true;
    }
  }

  async scheduleAlarmNotification(distance: number) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Wake Up! Destination Approaching',
        body: `You are less than ${distance} meters away from your destination.`,
        // Use Android-specific options to ensure channel + sound are applied in background
        android: {
          channelId: 'alarm',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        },
        // For iOS the top-level `sound` flag will be respected
        sound: true,
      },
      trigger: null, // Send immediately
    });
  }

  async setupAndroidChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarm', {
        name: 'Alarm Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }
  }
}

export default new NotificationService();
