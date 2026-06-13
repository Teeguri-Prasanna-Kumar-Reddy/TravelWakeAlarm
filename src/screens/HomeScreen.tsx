import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS, GLASS_STYLE } from '../constants/theme';
import SearchBar from '../components/SearchBar';
import MapPreview from '../components/MapPreview';
import Button from '../components/Button';
import { Trip, getTrips, saveTrip } from '../services/StorageService';
import LocationService from '../services/LocationService';
import NotificationService from '../services/NotificationService';
import AudioService from '../services/AudioService';
import { MapPin, Clock, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const FadeInView = ({ children, delay, style }: any) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

const THRESHOLDS = [500, 1000, 2000, 5000]; // in meters

const HomeScreen = ({ navigation }: any) => {
  const [destination, setDestination] = useState<{ name: string; latitude: number; longitude: number } | null>(null);
  const [threshold, setThreshold] = useState<number>(1000);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [smartPrediction, setSmartPrediction] = useState<Trip | null>(null);

  useEffect(() => {
    loadTrips();
    setupPermissions();
    AudioService.setAlarmSound();
  }, []);

  const loadTrips = async () => {
    const trips = await getTrips();
    setRecentTrips(trips);
    
    // AI Trip Predictor Mock (Idea B)
    // If they have recent trips, guess based on time of day.
    if (trips.length > 0) {
      const hour = new Date().getHours();
      // Simple heuristic acting as local AI
      const guess = trips[hour > 18 || hour < 5 ? 0 : Math.min(1, trips.length - 1)];
      setSmartPrediction(guess);
    }
  };

  const setupPermissions = async () => {
    await NotificationService.setupAndroidChannel();
    await NotificationService.requestPermissions();
  };

  const handleStartTracking = async () => {

    if (!destination) {
      Alert.alert('Error', 'Please select a destination.');
      return;
    }

    setLoading(true);
    const hasLocationPermission = await LocationService.requestPermissions();
    
    if (!hasLocationPermission) {
      Alert.alert('Permission Denied', 'Background location permission is required to wake you up.');
      setLoading(false);
      return;
    }

    const trip: Trip = {
      id: Date.now().toString(),
      name: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      timestamp: Date.now(),
    };
    await saveTrip(trip);
    AudioService.setAlarmSound();

    await LocationService.startTracking({ latitude: destination.latitude, longitude: destination.longitude }, threshold);
    
    setLoading(false);
    navigation.navigate('Tracking', { destination, threshold });
  };

  const handleMapPress = (e: any) => {
    const coords = e.nativeEvent.coordinate;
    setDestination({
      name: `Pinned Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        <FadeInView delay={100}>
          <Text style={styles.title}>Travel Wake</Text>
          <Text style={styles.subtitle}>Sleep soundly. We'll wake you.</Text>
        </FadeInView>

        {smartPrediction && (
          <FadeInView delay={200} style={styles.predictionCard}>
            <LinearGradient colors={['rgba(0, 242, 254, 0.1)', 'rgba(79, 172, 254, 0.05)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.predictionHeader}>
              <Sparkles color={COLORS.primary} size={16} />
              <Text style={styles.predictionTitle}>Smart Suggestion</Text>
            </View>
            <Text style={styles.predictionName} numberOfLines={1}>Heading to {smartPrediction.name}?</Text>
            <TouchableOpacity 
              style={styles.predictionButton}
              onPress={() => setDestination({ name: smartPrediction.name, latitude: smartPrediction.latitude, longitude: smartPrediction.longitude })}
            >
              <Text style={styles.predictionButtonText}>Select</Text>
            </TouchableOpacity>
          </FadeInView>
        )}

        <FadeInView delay={300} style={[styles.section, { zIndex: 10 }]}>
          <Text style={styles.sectionTitle}>Where to?</Text>
          <SearchBar onSelectLocation={setDestination} />
        </FadeInView>

        <FadeInView delay={400} style={styles.section}>
          <Text style={styles.sectionTitle}>Pin Location</Text>
          <View style={styles.mapWrapper}>
            <MapPreview location={destination} onMapPress={handleMapPress} />
          </View>
          {destination && (
            <Text style={styles.selectedDestText}>
              <MapPin color={COLORS.primary} size={14} /> {destination.name}
            </Text>
          )}
        </FadeInView>

        <FadeInView delay={500} style={styles.section}>
          <Text style={styles.sectionTitle}>Wake me within</Text>
          <View style={styles.thresholdContainer}>
            {THRESHOLDS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.thresholdBadge, threshold === t && styles.thresholdBadgeActive]}
                onPress={() => setThreshold(t)}
              >
                <Text style={[styles.thresholdText, threshold === t && styles.thresholdTextActive]}>
                  {t >= 1000 ? `${t / 1000}km` : `${t}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FadeInView>



        <FadeInView delay={600} style={styles.startContainer}>
          <Button 
            title="SET ALARM" 
            onPress={handleStartTracking} 
            disabled={!destination} 
            loading={loading}
          />
        </FadeInView>

        {recentTrips.length > 0 && (
          <FadeInView delay={700} style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            {recentTrips.slice(0, 3).map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={[styles.tripItem, GLASS_STYLE]}
                onPress={() => setDestination({ name: trip.name, latitude: trip.latitude, longitude: trip.longitude })}
              >
                <View style={styles.tripIcon}>
                  <Clock color={COLORS.primary} size={20} />
                </View>
                <View style={styles.tripDetails}>
                  <Text style={styles.tripName} numberOfLines={1}>{trip.name}</Text>
                  <Text style={styles.tripTime}>{new Date(trip.timestamp).toLocaleDateString()}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </FadeInView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xxl * 2,
  },
  title: {
    fontSize: 36,
    color: COLORS.text,
    fontFamily: FONTS.bold,
    letterSpacing: -1,
    marginTop: SIZES.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.primary,
    fontFamily: FONTS.medium,
    marginBottom: SIZES.xl,
    opacity: 0.9,
  },
  predictionCard: {
    ...GLASS_STYLE,
    borderRadius: 16,
    padding: SIZES.md,
    marginBottom: SIZES.xl,
    overflow: 'hidden',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  predictionTitle: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: 12,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  predictionName: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 16,
    marginBottom: SIZES.sm,
  },
  predictionButton: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
  },
  predictionButtonText: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
    fontSize: 12,
  },
  section: {
    marginBottom: SIZES.xl,
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontFamily: FONTS.bold,
    marginBottom: SIZES.md,
    letterSpacing: 0.5,
  },
  mapWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedDestText: {
    color: COLORS.primary,
    marginTop: SIZES.md,
    fontSize: 13,
    fontFamily: FONTS.medium,
  },
  thresholdContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thresholdBadge: {
    ...GLASS_STYLE,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  thresholdBadgeActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
    borderColor: COLORS.primary,
  },
  thresholdText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  thresholdTextActive: {
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  soundContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  soundBadge: {
    ...GLASS_STYLE,
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  soundBadgeActive: {
    backgroundColor: 'rgba(79, 172, 254, 0.18)',
    borderColor: COLORS.primary,
  },
  soundText: {
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    fontSize: 14,
  },
  startContainer: {
    marginBottom: SIZES.xl,
    marginTop: SIZES.md,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderRadius: 16,
    marginBottom: SIZES.sm,
  },
  tripIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripDetails: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  tripName: {
    color: COLORS.text,
    fontSize: 15,
    fontFamily: FONTS.medium,
  },
  tripTime: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
});

export default HomeScreen;
