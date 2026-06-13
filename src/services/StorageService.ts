import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

export interface Trip {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface AlarmSound {
  name: string;
  uri: string;
  isAsset?: boolean;
}

const TRIPS_KEY = '@travel_wake_alarm_trips';
const ALARM_SOUND_KEY = '@travel_wake_alarm_sound';
const ALARM_SOUND_FILE = `${FileSystem.documentDirectory}alarm_sound.json`;

export const saveTrip = async (trip: Trip) => {
  try {
    const existing = await getTrips();
    const updated = [trip, ...existing.filter(t => t.id !== trip.id)].slice(0, 10); // Keep last 10
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save trip', e);
  }
};

export const getTrips = async (): Promise<Trip[]> => {
  try {
    const value = await AsyncStorage.getItem(TRIPS_KEY);
    return value ? JSON.parse(value) : [];
  } catch (e) {
    console.error('Failed to get trips', e);
    return [];
  }
};

export const saveAlarmSound = async (sound: AlarmSound) => {
  try {
    const json = JSON.stringify(sound);
    await AsyncStorage.setItem(ALARM_SOUND_KEY, json);
    await FileSystem.writeAsStringAsync(ALARM_SOUND_FILE, json, { encoding: FileSystem.EncodingType.UTF8 });
    console.log('StorageService.saveAlarmSound - saved to AsyncStorage and file:', sound);
  } catch (e) {
    console.error('Failed to save alarm sound', e);
  }
};

export const getAlarmSound = async (): Promise<AlarmSound | null> => {
  try {
    let value = await AsyncStorage.getItem(ALARM_SOUND_KEY);
    if (!value) {
      const exists = await FileSystem.getInfoAsync(ALARM_SOUND_FILE);
      if (exists.exists) {
        value = await FileSystem.readAsStringAsync(ALARM_SOUND_FILE, { encoding: FileSystem.EncodingType.UTF8 });
        console.log('StorageService.getAlarmSound - recovered from file:', ALARM_SOUND_FILE);
      }
    }

    const parsed = value ? JSON.parse(value) : null;
    console.log('StorageService.getAlarmSound - read:', parsed);
    return parsed;
  } catch (e) {
    console.error('Failed to get alarm sound', e);
    return null;
  }
};

export const clearAlarmSound = async () => {
  try {
    await AsyncStorage.removeItem(ALARM_SOUND_KEY);
  } catch (e) {
    console.error('Failed to clear alarm sound', e);
  }
};
