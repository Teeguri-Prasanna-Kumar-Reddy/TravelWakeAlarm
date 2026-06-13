import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, BackHandler, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS, GLASS_STYLE } from '../constants/theme';
import Button from '../components/Button';
import LocationService from '../services/LocationService';
import { calculateDistance } from '../utils/haversine';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { MapPin, Navigation as NavIcon } from 'lucide-react-native';
// react-native-reanimated removed
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  navigation: NavigationProp<any>;
  route: RouteProp<any, any>;
}

const TrackingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { destination, threshold } = route.params as any;
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start radar animation
    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Initial location fetch
    fetchInitialLocation();

    // Prevent back button from stopping tracking by accident
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(
        'Stop Tracking?',
        'Are you sure you want to stop the alarm and return to the home screen?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Stop', style: 'destructive', onPress: handleStop },
        ]
      );
      return true;
    });

    // We can poll foreground location here for smoother UI updates
    const interval = setInterval(fetchInitialLocation, 5000);

    return () => {
      backHandler.remove();
      clearInterval(interval);
    };
  }, []);

  const fetchInitialLocation = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const dist = calculateDistance(
        loc.coords.latitude,
        loc.coords.longitude,
        destination.latitude,
        destination.longitude
      );
      setCurrentDistance(dist);

      if (dist <= threshold) {
        // Just in case background task missed it, trigger it here too.
        navigation.reset({ index: 0, routes: [{ name: 'Alarm' }] });
      }
    } catch (e) {
      console.warn('Could not fetch foreground location', e);
    }
  };

  const handleStop = async () => {
    await LocationService.stopTracking();
    navigation.goBack();
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2]
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0]
  });

  const animatedPulseStyle = {
    transform: [{ scale: pulseScale }],
    opacity: pulseOpacity,
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.background, '#0a192f']} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Tracking Active</Text>
        <Text style={styles.subtitle}>You can lock your screen.</Text>
      </View>

      <View style={styles.radarContainer}>
        {/* Radar Pulse Rings */}
        <Animated.View style={[styles.pulseRing, animatedPulseStyle]} />
        <View style={styles.radarCenter}>
          <NavIcon color={COLORS.primary} size={32} />
        </View>
      </View>

      <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
        <View style={styles.infoRow}>
          <MapPin color={COLORS.primary} size={20} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Destination</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{destination.name}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <NavIcon color={COLORS.primary} size={20} />
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Distance Remaining</Text>
            <Text style={styles.distanceValue}>
              {currentDistance !== null
                ? currentDistance > 1000
                  ? `${(currentDistance / 1000).toFixed(1)} km`
                  : `${Math.round(currentDistance)} m`
                : 'Calculating...'}
            </Text>
          </View>
        </View>
        
        <View style={styles.progressWrapper}>
          <Text style={styles.wakeLabel}>Wake at: {threshold >= 1000 ? threshold/1000 + 'km' : threshold + 'm'}</Text>
        </View>
      </Animated.View>

      <View style={styles.bottomContainer}>
        <Button title="STOP TRACKING" onPress={handleStop} variant="danger" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    alignItems: 'center',
    marginTop: SIZES.xl,
  },
  title: {
    fontSize: 28,
    color: COLORS.primary,
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontFamily: FONTS.medium,
    marginTop: 4,
  },
  radarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.primary,
  },
  radarCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(11, 15, 25, 0.9)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  infoCard: {
    ...GLASS_STYLE,
    marginHorizontal: SIZES.lg,
    padding: SIZES.lg,
    borderRadius: 20,
    marginBottom: SIZES.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  infoLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: FONTS.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 18,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  distanceValue: {
    color: COLORS.primary,
    fontSize: 28,
    fontFamily: FONTS.bold,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SIZES.md,
  },
  progressWrapper: {
    marginTop: SIZES.md,
    alignItems: 'flex-end',
  },
  wakeLabel: {
    color: COLORS.success,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  bottomContainer: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xxl,
  },
});

export default TrackingScreen;
