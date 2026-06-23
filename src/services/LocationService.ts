import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateDistance } from '../utils/haversine';
import NotificationService from './NotificationService';
import AudioService from './AudioService';

export const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';

export interface ActiveTracking {
  name: string;
  latitude: number;
  longitude: number;
  threshold: number;
}

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    const latestLocation = locations[0];

    try {
      const destString = await AsyncStorage.getItem('@destination');
      const thresholdString = await AsyncStorage.getItem('@threshold');
      const isAlarmTriggered = await AsyncStorage.getItem('@alarm_triggered');

      if (destString && thresholdString && isAlarmTriggered !== 'true') {
        const destination = JSON.parse(destString);
        const threshold = parseInt(thresholdString, 10);

        const distance = calculateDistance(
          latestLocation.coords.latitude,
          latestLocation.coords.longitude,
          destination.latitude,
          destination.longitude
        );

        if (distance <= threshold) {
          // Trigger Alarm
          await AsyncStorage.setItem('@alarm_triggered', 'true');
          await NotificationService.scheduleAlarmNotification(Math.round(distance));
          await AudioService.playAlarm();
        }
      }
    } catch (e) {
      console.error('Error in background location task', e);
    }
  }
});

class LocationService {
  async requestPermissions() {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return false;
    }
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    return backgroundStatus === 'granted';
  }

  async startTracking(destination: { name?: string; latitude: number; longitude: number }, thresholdMeters: number) {
    await AsyncStorage.setItem('@destination', JSON.stringify(destination));
    await AsyncStorage.setItem('@threshold', thresholdMeters.toString());
    await AsyncStorage.setItem('@alarm_triggered', 'false');

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 50, // update every 50 meters
      deferredUpdatesInterval: 10000, // minimum time between updates
      foregroundService: {
        notificationTitle: 'Travel Wake Alarm Active',
        notificationBody: 'Tracking your location to wake you up.',
        notificationColor: '#38BDF8',
      },
    });
  }

  async stopTracking() {
    const hasTask = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
    if (hasTask) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
    await AsyncStorage.removeItem('@destination');
    await AsyncStorage.removeItem('@threshold');
    await AsyncStorage.removeItem('@alarm_triggered');
    await AudioService.stopAlarm();
  }

  async getActiveTracking(): Promise<ActiveTracking | null> {
    const destString = await AsyncStorage.getItem('@destination');
    const thresholdString = await AsyncStorage.getItem('@threshold');

    if (!destString || !thresholdString) {
      return null;
    }

    const destination = JSON.parse(destString);

    return {
      name: destination.name || 'Selected destination',
      latitude: destination.latitude,
      longitude: destination.longitude,
      threshold: parseInt(thresholdString, 10),
    };
  }
}

export default new LocationService();
