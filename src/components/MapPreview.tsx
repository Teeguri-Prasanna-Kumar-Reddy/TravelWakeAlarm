import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapPreviewProps {
  location: { latitude: number; longitude: number } | null;
  onMapPress?: (e: any) => void;
  height?: number;
}

const MapPreview: React.FC<MapPreviewProps> = ({ location, height = 300 }) => {
  const webviewRef = useRef<WebView | null>(null);

  const lat = location?.latitude ?? 37.78825;
  const lng = location?.longitude ?? -122.4324;

  const html = useMemo(() => `
    <!doctype html>
    <html>
      <head>
        <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0"/>
        <style>html,body,#map{height:100%;margin:0;padding:0;background:#0b0f19}</style>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          const map = L.map('map', { zoomControl: true }).setView([${lat}, ${lng}], 14);
          L.tileLayer('https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
            maxZoom: 19,
            tileSize: 512,
            zoomOffset: -1,
          }).addTo(map);
          const marker = L.marker([${lat}, ${lng}]).addTo(map);

          // respond to RN messages to update the marker
          function handleMessage(e) {
            try {
              const msg = JSON.parse(e.data);
              if (msg.type === 'setLocation') {
                const { latitude, longitude } = msg.payload;
                map.setView([latitude, longitude], 14);
                marker.setLatLng([latitude, longitude]);
              }
            } catch (err) {}
          }

          // for Android and iOS
          document.addEventListener('message', handleMessage);
          window.addEventListener('message', handleMessage);
        </script>
      </body>
    </html>
  `, [lat, lng]);

  useEffect(() => {
    if (!webviewRef.current || !location) return;
    const msg = JSON.stringify({ type: 'setLocation', payload: { latitude: location.latitude, longitude: location.longitude } });
    // slight delay to ensure webview loaded
    setTimeout(() => {
      webviewRef.current?.postMessage(msg);
    }, 300);
  }, [location]);

  return (
    <View style={[styles.container, { height }]}>
      <WebView
        ref={(r) => (webviewRef.current = r)}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#0b0f19',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
});

export default MapPreview;
