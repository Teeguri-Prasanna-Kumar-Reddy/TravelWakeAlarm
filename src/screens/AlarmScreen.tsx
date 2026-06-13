import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Button from '../components/Button';
import AudioService from '../services/AudioService';
import { BellRing } from 'lucide-react-native';

const AlarmScreen = ({ navigation }: any) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const hasStoppedRef = useRef(false);

  useEffect(() => {
    AudioService.playAlarm();
  }, []);

  useEffect(() => {
    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 50, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, easing: Easing.linear, useNativeDriver: true })
      ])
    );

    // Strobe background effect
    const colorLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 0, duration: 200, useNativeDriver: false })
      ])
    );

    shakeLoop.start();
    colorLoop.start();

    return () => {
      shakeLoop.stop();
      colorLoop.stop();
      AudioService.stopAlarm();
    };
  }, [colorAnim, shakeAnim]);

  const handleStop = async () => {
    if (hasStoppedRef.current) {
      return;
    }

    hasStoppedRef.current = true;
    await AudioService.stopAlarm();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10]
  });

  const shakeRotate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg']
  });

  const animatedIconStyle = {
    transform: [{ translateX: shakeTranslate }, { rotate: shakeRotate }],
  };

  const animatedBgStyle = {
    backgroundColor: colorAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [COLORS.danger, '#8B0000']
    }),
  };

  return (
    <Animated.View style={[styles.container, animatedBgStyle]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
            <BellRing color={COLORS.background} size={80} />
          </Animated.View>
          
          <Text style={styles.title}>WAKE UP!</Text>
          <Text style={styles.subtitle}>You have reached your destination.</Text>
        </View>

        <View style={styles.bottomContainer}>
          <Button 
            title="SLIDE TO STOP ALARM" 
            onPress={handleStop} 
            variant="primary" 
          />
          {/* Note: I used a standard button here, but visually tweaked to look like a stop action. 
              A real slide-to-stop could be built with PanGestureHandler for future iteration. */}
        </View>
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  iconWrapper: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: COLORS.text,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    fontSize: 48,
    color: COLORS.text,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.text,
    fontFamily: FONTS.medium,
    textAlign: 'center',
    marginTop: SIZES.md,
    opacity: 0.9,
  },
  bottomContainer: {
    padding: SIZES.xl,
    paddingBottom: SIZES.xxl * 2,
  },
});

export default AlarmScreen;
