/**
 * HomeMapView - Clean light map with user location and "Search this area" pill
 *
 * Uses a single stable Marker for the user (no native blue dot) to avoid flicker
 * from multiple location updates. Shows location name in a Callout when address is available.
 */

import React, { useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useTheme } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8e5' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4edda' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
];

const DEFAULT_REGION = {
  latitude: 39.7392,
  longitude: -104.9903,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

interface HomeMapViewProps {
  initialLat?: number;
  initialLng?: number;
  /** Address for the user pin callout (from reverse geocode); avoids flicker from native dot. */
  initialAddress?: string | null;
}

const HomeMapViewInner: React.FC<HomeMapViewProps> = ({
  initialLat,
  initialLng,
  initialAddress,
}) => {
  const { isDark } = useTheme();
  const colors = useThemeColors();
  const mapRef = useRef<MapView>(null);
  const hasAnimatedToUser = useRef(false);

  // Use provided coords or fallback for initial region (stable, set once by parent)
  const region = (initialLat != null && initialLng != null)
    ? { latitude: initialLat, longitude: initialLng, latitudeDelta: 0.015, longitudeDelta: 0.015 }
    : DEFAULT_REGION;

  const hasUserCoords = initialLat != null && initialLng != null;

  // Animate to user once when coords become available (no repeated updates = no flicker)
  useEffect(() => {
    if (hasUserCoords && mapRef.current && !hasAnimatedToUser.current) {
      hasAnimatedToUser.current = true;
      mapRef.current.animateToRegion(
        { latitude: initialLat!, longitude: initialLng!, latitudeDelta: 0.015, longitudeDelta: 0.015 },
        400
      );
    }
  }, [initialLat, initialLng, hasUserCoords]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation={false}
        followsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
        moveOnMarkerPress={false}
        loadingEnabled
        toolbarEnabled={false}
      >
        {hasUserCoords && (
          <Marker
            coordinate={{ latitude: initialLat!, longitude: initialLng! }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
          >
            <View style={[styles.userPin, { backgroundColor: colors.design.primaryBlue }]}>
              <Ionicons name="location" size={18} color="#FFFFFF" />
            </View>
            {initialAddress ? (
              <Callout tooltip>
                <View style={[styles.callout, { backgroundColor: colors.surface.card }]}>
                  <Text style={[styles.calloutText, { color: colors.text.primary }]} numberOfLines={2}>
                    {initialAddress}
                  </Text>
                </View>
              </Callout>
            ) : null}
          </Marker>
        )}
      </MapView>

      {/* Search this area pill */}
      <View style={styles.pillContainer}>
        <Pressable
          style={[styles.searchPill, { backgroundColor: colors.design.primaryBlue }]}
        >
          <Text style={styles.searchPillText}>Search this area</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const HomeMapView = memo(HomeMapViewInner);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  userPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  callout: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    maxWidth: 220,
  },
  calloutText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
  },
  pillContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
  },
  searchPill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  searchPillText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
