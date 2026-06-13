import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS, GLASS_STYLE } from '../constants/theme';
import Button from '../components/Button';
import AudioService from '../services/AudioService';
import { AlarmSound, saveAlarmSound, getAlarmSound } from '../services/StorageService';
import { ArrowLeft } from 'lucide-react-native';

const AlarmSoundSelectionScreen = ({ navigation }: any) => {
  const [selectedSound, setSelectedSound] = useState<AlarmSound | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    async function load() {
      const sound = await getAlarmSound();
      console.log('AlarmSoundSelectionScreen.load - loaded sound:', sound);
      setSelectedSound(sound ?? { name: 'Default Alarm', uri: 'alarm.mp3', isAsset: true });
    }
    load();
  }, []);

  const blobToBase64 = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const prepareCacheUri = async (uri: string, name: string) => {
    const sanitized = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = `${FileSystem.cacheDirectory}${Date.now()}_${sanitized}`;

    if (uri.startsWith(FileSystem.cacheDirectory)) {
      return uri;
    }

    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        return uri;
      }
    } catch {
      // continue to copy/download fallback
    }

    try {
      await FileSystem.copyAsync({ from: uri, to: dest });
      console.log('prepareCacheUri - copied file to cache', dest);
      return dest;
    } catch (copyErr) {
      console.warn('prepareCacheUri - copyAsync failed, trying downloadAsync', copyErr);
    }

    try {
      const downloaded = await FileSystem.downloadAsync(uri, dest);
      console.log('prepareCacheUri - downloaded file to cache', downloaded.uri);
      return downloaded.uri;
    } catch (downloadErr) {
      console.warn('prepareCacheUri - downloadAsync failed, trying fetch fallback', downloadErr);
    }

    if (Platform.OS === 'android' && uri.startsWith('content://')) {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const base64 = await blobToBase64(blob);
        await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
        console.log('prepareCacheUri - fetched content uri to cache', dest);
        return dest;
      } catch (fetchErr) {
        console.warn('prepareCacheUri - fetch fallback failed', fetchErr);
      }
    }

    return uri;
  };

  const pickAudioFile = async () => {
    try {
      setIsSelecting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        const chosenUri = (result as any).fileCopyUri || result.uri;
        console.log('DocumentPicker result:', { resultType: result.type, result, chosenUri });

        if (!chosenUri) {
          Alert.alert('Error', 'Selected file URI is unavailable. Please try another audio file.');
          return;
        }

        const uriToSave = await prepareCacheUri(chosenUri, result.name);
        const newSound: AlarmSound = {
          name: result.name,
          uri: uriToSave,
          isAsset: false,
        };

        setSelectedSound(newSound);
        await saveAlarmSound(newSound);
        const verifySaved = await getAlarmSound();
        console.log('AlarmSoundSelectionScreen.verifySavedSound:', verifySaved);
        AudioService.setAlarmSound(newSound);
        Alert.alert('Audio selected', 'Your selected alarm sound is now saved.');
        navigation.goBack();
      }
    } catch (e) {
      console.log('Audio picker error', e);
      Alert.alert('Error', 'Could not select audio file. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  };

  const playPreview = async () => {
    if (!selectedSound) {
      Alert.alert('No sound selected', 'Please select an audio file first.');
      return;
    }

    try {
      setLoading(true);
      await AudioService.previewSound(selectedSound);
      setIsPreviewing(true);
    } catch (e) {
      console.log('Preview error', e);
      Alert.alert('Error', 'Unable to play preview.');
    } finally {
      setLoading(false);
    }
  };

  const stopPreview = async () => {
    try {
      setLoading(true);
      await AudioService.stopPreview();
    } catch (e) {
      console.log('Stop preview error', e);
    } finally {
      setIsPreviewing(false);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color={COLORS.primary} size={24} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Choose your alarm tone</Text>
        <Text style={styles.subtitle}>Pick a sound from your device and preview it before setting the alarm.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Selected sound</Text>
          <Text style={styles.soundName}>{selectedSound?.name ?? 'No sound selected'}</Text>
          <Text style={styles.soundUri}>{selectedSound?.uri}</Text>
        </View>

        <View style={styles.buttonGroup}>
          <Button title={isSelecting ? 'Selecting...' : 'Select audio file'} onPress={pickAudioFile} disabled={isSelecting} loading={isSelecting} />
          <Button
            title={isPreviewing ? 'Stop preview' : 'Play preview'}
            onPress={isPreviewing ? stopPreview : playPreview}
            disabled={!selectedSound || loading || isSelecting}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SIZES.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 16,
    marginLeft: SIZES.sm,
    fontFamily: FONTS.bold,
  },
  title: {
    fontSize: 28,
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: SIZES.sm,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.medium,
    marginBottom: SIZES.xl,
  },
  card: {
    ...GLASS_STYLE,
    borderRadius: 20,
    padding: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.primary,
    marginBottom: SIZES.sm,
  },
  soundName: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginBottom: SIZES.xs,
  },
  soundUri: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontFamily: FONTS.regular,
  },
  buttonGroup: {
    gap: SIZES.md,
  },
});

export default AlarmSoundSelectionScreen;
