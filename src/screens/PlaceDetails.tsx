import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AiService from '../services/AiService';

const PlaceDetails = ({ route }: any) => {
  const { place } = route.params;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const resp = await AiService.describePlace(place);
      setData(resp);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{place.name}</Text>
        {!data ? (
          <ActivityIndicator size="large" />
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
  container: { flex: 1 },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  summary: { fontSize: 16, marginBottom: 12 },
  sub: { fontSize: 14, fontWeight: '700', marginTop: 12 },
  tip: { fontSize: 14, marginLeft: 8, marginTop: 4 },
  safety: { color: 'red', marginTop: 6 },
});

export default PlaceDetails;
