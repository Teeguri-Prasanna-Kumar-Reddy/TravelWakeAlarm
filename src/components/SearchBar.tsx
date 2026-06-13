import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, Keyboard, ScrollView } from 'react-native';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { Search } from 'lucide-react-native';

interface SearchBarProps {
  onSelectLocation: (location: { name: string; latitude: number; longitude: number }) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSelectLocation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const searchLocations = (text: string) => {
    setQuery(text);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (text.length > 2) {
      const timeout = setTimeout(async () => {
        try {
          const response = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`
          );
          if (response.ok) {
            const data = await response.json();
            setResults(data.features || []);
          } else {
            setResults([]);
          }
        } catch (error) {
          // Suppress error in logs to avoid clutter
          setResults([]);
        }
      }, 500); // 500ms debounce
      setSearchTimeout(timeout);
    } else {
      setResults([]);
    }
  };

  const handleSelect = (item: any) => {
    onSelectLocation({
      name: `${item.properties.name}${item.properties.city ? `, ${item.properties.city}` : ''}`,
      latitude: item.geometry.coordinates[1],
      longitude: item.geometry.coordinates[0],
    });
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Search color={COLORS.textMuted} size={20} />
        <TextInput
          style={styles.input}
          placeholder="Search destination..."
          placeholderTextColor={COLORS.textMuted}
          value={query}
          onChangeText={searchLocations}
        />
      </View>

      {results.length > 0 && (
        <View style={styles.resultsContainer}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {results.map((item, index) => (
              <TouchableOpacity 
                key={item.properties?.osm_id ? item.properties.osm_id.toString() : index.toString()} 
                style={styles.resultItem} 
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.resultText} numberOfLines={2}>
                  {item.properties.name} {item.properties.city ? `- ${item.properties.city}` : ''} {item.properties.country ? `(${item.properties.country})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: SIZES.md,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    marginLeft: SIZES.sm,
    fontSize: 16,
    fontFamily: FONTS.regular,
  },
  resultsContainer: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  resultItem: {
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultText: {
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default SearchBar;
