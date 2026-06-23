import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AiService, { Place } from '../services/AiService';
import * as Location from 'expo-location';
import Button from '../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONTS, SIZES } from '../constants/theme';

const NearbyPlacesScreen = ({ navigation }: any) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNearbyPlaces = async () => {
    try {
      setError(null);
      setLoading(true);
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      const p = await AiService.getNearbyPlaces(lat, lng, 800);
      setPlaces(p);
    } catch (e) {
      console.warn('Nearby places error', e);
      setError(e instanceof Error ? e.message : 'Could not load nearby places.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNearbyPlaces();
  }, []);

  const openDetails = (place: Place) => {
    navigation.navigate('PlaceDetails', { place });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Places</Text>
        <Button title="Refresh" onPress={loadNearbyPlaces} loading={loading} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} />
      ) : error ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>AI guide could not connect</Text>
          <Text style={styles.messageText}>{error}</Text>
          <Button title="TRY AGAIN" onPress={loadNearbyPlaces} />
        </View>
      ) : (
        <FlatList
          data={places}
          ListEmptyComponent={<Text style={styles.emptyText}>No nearby places found.</Text>}
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
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  header: { gap: SIZES.md, marginBottom: SIZES.lg },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
  item: { padding: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  name: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
  cat: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  messageBox: { gap: SIZES.md, marginTop: SIZES.xl },
  messageTitle: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 18 },
  messageText: { color: COLORS.textMuted, fontFamily: FONTS.regular, lineHeight: 20 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: SIZES.xl },
});

export default NearbyPlacesScreen;
