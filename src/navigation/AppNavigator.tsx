import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import TrackingScreen from '../screens/TrackingScreen';
import AlarmScreen from '../screens/AlarmScreen';
import NearbyPlacesScreen from '../screens/NearbyPlacesScreen';
import PlaceDetails from '../screens/PlaceDetails';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Tracking" component={TrackingScreen} />
        <Stack.Screen name="NearbyPlaces" component={NearbyPlacesScreen} />
        <Stack.Screen name="PlaceDetails" component={PlaceDetails} />
        <Stack.Screen 
          name="Alarm" 
          component={AlarmScreen} 
          options={{
            gestureEnabled: false, // Prevent swiping away the alarm
            animation: 'fade',
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
