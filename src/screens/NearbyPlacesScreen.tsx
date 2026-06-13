import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AiService, { Place } from '../services/AiService';
import * as Location from 'expo-location';
import Button from '../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

const NearbyPlacesScreen = ({ navigation }: any) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      try {
        const p = await AiService.getNearbyPlaces(lat, lng, 800);
        setPlaces(p);
      } catch (e) {
        console.warn('Nearby places error', e);
      }
      setLoading(false);
    })();
  }, []);

  const openDetails = (place: Place) => {
    navigation.navigate('PlaceDetails', { place });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Places</Text>
        <Button title="Refresh" onPress={() => { /* TODO: refresh */ }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={places}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => openDetails(item)}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.cat}>{item.tags && item.tags.amenity ? item.tags.amenity : ''}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  cat: { color: '#666', fontSize: 12 },
});

export default NearbyPlacesScreen;
