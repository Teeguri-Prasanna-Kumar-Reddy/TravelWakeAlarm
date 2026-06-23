import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AiService from '../services/AiService';
import Button from '../components/Button';
import { COLORS, FONTS, SIZES } from '../constants/theme';

const PlaceDetails = ({ route }: any) => {
  const { place } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDescription = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await AiService.describePlace(place);
      setData(resp);
    } catch (e) {
      console.warn('Place AI description error', e);
      setError(e instanceof Error ? e.message : 'Could not load the AI place guide.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDescription();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{place.name}</Text>
        {error ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageTitle}>AI description unavailable</Text>
            <Text style={styles.messageText}>{error}</Text>
            <Button title="TRY AGAIN" onPress={loadDescription} />
          </View>
        ) : loading || !data ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : (
          <>
            <Text style={styles.summary}>{data.summary}</Text>
            {data.tips && data.tips.length > 0 && (
              <View>
                <Text style={styles.sub}>Tips</Text>
                {data.tips.map((t: string, i: number) => (
                  <Text key={i} style={styles.tip}>• {t}</Text>
                ))}
              </View>
            )}
            {data.safety && (
              <>
                <Text style={styles.sub}>Safety</Text>
                <Text style={styles.safety}>{data.safety}</Text>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 8 },
  summary: { fontSize: 16, color: COLORS.text, marginBottom: 12, lineHeight: 22 },
  sub: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary, marginTop: 12 },
  tip: { fontSize: 14, color: COLORS.text, marginLeft: 8, marginTop: 4, lineHeight: 20 },
  safety: { color: COLORS.danger, marginTop: 6, lineHeight: 20 },
  messageBox: { gap: SIZES.md, marginTop: SIZES.xl },
  messageTitle: { color: COLORS.text, fontFamily: FONTS.bold, fontSize: 18 },
  messageText: { color: COLORS.textMuted, fontFamily: FONTS.regular, lineHeight: 20 },
});

export default PlaceDetails;
