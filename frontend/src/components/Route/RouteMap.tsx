/** Map with polyline, markers (start/stops/end), zoom controls. Uses react-native-maps. */

import React, { useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { decodePolyline, getBoundsFromWaypoints, getRegionForBounds } from '@/services/maps';
import { Spacing, FontFamily, FontSize } from '@/theme';
import { SpringConfig } from '@/theme/animations';
import { useThemeColors } from '@/theme/useThemeColors';
import type { Route, RouteStop, LatLng } from '@/types/route';

const toMapLatLng = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

const DEFAULT_REGION = {
  latitude: 37.78,
  longitude: -122.4,
  latitudeDelta: 12,
  longitudeDelta: 12,
};

export interface RouteMapProps {
  route?: Route;
  stops?: RouteStop[];
  /** Fixed height (ignored when fillScreen is true) */
  height?: number;
  /** Fill the parent container; removes border radius and fixed height */
  fillScreen?: boolean;
  /** Edge padding for fitToCoordinates (accounts for overlapping UI like bottom sheet) */
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  showControls?: boolean;
  showUserLocation?: boolean;
  showOptimization?: boolean;
  interactive?: boolean;
  onStopPress?: (stopId: string) => void;
  onMapPress?: (location: LatLng) => void;
  style?: ViewStyle;
}

const MapControlButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}> = ({ icon, onPress }) => {
  const colors = useThemeColors();
  const scale = useSharedValue(1);
  const handlePressIn = () => { scale.value = withSpring(0.9, SpringConfig.snappy); };
  const handlePressOut = () => { scale.value = withSpring(1, SpringConfig.snappy); };
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.controlButton, { backgroundColor: colors.surface.elevated, borderColor: colors.border.light }]}
      >
        <Ionicons name={icon} size={20} color={colors.text.primary} />
      </Pressable>
    </Animated.View>
  );
};

const DEFAULT_FIT_PADDING = { top: 60, right: 60, bottom: 60, left: 60 };

export const RouteMap: React.FC<RouteMapProps> = ({
  route,
  stops,
  height = 300,
  fillScreen = false,
  fitPadding,
  showControls = true,
  showUserLocation = false,
  showOptimization = false,
  onStopPress,
  onMapPress,
  style,
}) => {
  const colors = useThemeColors();
  const mapRef = useRef<MapView>(null);

  // Use provided stops or fall back to route.stops
  const routeStops = stops ?? route?.stops ?? [];

  const waypoints = useMemo(() => {
    if (!route) return [];
    const pts: LatLng[] = [route.origin.location];
    routeStops.forEach((s) => pts.push(s.location));
    pts.push(route.destination.location);
    return pts;
  }, [route, routeStops]);

  const allCoords = useMemo(() => waypoints.map(toMapLatLng), [waypoints]);

  const bounds = useMemo(() => getBoundsFromWaypoints(waypoints), [waypoints]);

  const initialRegion = useMemo(
    () => (waypoints.length > 0 ? getRegionForBounds(bounds, 1.4) : DEFAULT_REGION),
    [bounds, waypoints.length]
  );

  const polylineCoords = useMemo(() => {
    if (!route?.polyline) return [];
    return decodePolyline(route.polyline).map(toMapLatLng);
  }, [route?.polyline]);

  const edgePadding = fitPadding ?? DEFAULT_FIT_PADDING;

  const handleMapReady = useCallback(() => {
    if (allCoords.length > 1) {
      // Small delay to ensure map is fully laid out
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(allCoords, {
          edgePadding,
          animated: true,
        });
      }, 200);
    }
  }, [allCoords, edgePadding]);

  const handleRecenter = () => {
    if (allCoords.length > 0) {
      mapRef.current?.fitToCoordinates(allCoords, { edgePadding, animated: true });
    }
  };

  const handleZoomIn = () => {
    if (waypoints.length > 0) {
      const r = getRegionForBounds(bounds, 0.6);
      mapRef.current?.animateToRegion(r, 300);
    }
  };

  const handleZoomOut = () => {
    if (waypoints.length > 0) {
      const r = getRegionForBounds(bounds, 2);
      mapRef.current?.animateToRegion(r, 300);
    }
  };

  const containerStyle = fillScreen
    ? [styles.containerFull, style]
    : [styles.container, { height, backgroundColor: colors.background.secondary }, style];

  // Web placeholder fallback
  if (Platform.OS === 'web') {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={containerStyle}>
        <LinearGradient colors={['#F8FAFB', '#F1F5F9', '#E8FBF3']} style={StyleSheet.absoluteFill}>
          {route && (
            <View style={[styles.routeLine, { backgroundColor: colors.map.polyline }]} />
          )}
        </LinearGradient>
        {showControls && (
          <View style={styles.controlsContainer}>
            <MapControlButton icon="add" onPress={handleZoomIn} />
            <MapControlButton icon="remove" onPress={handleZoomOut} />
            <View style={styles.controlSpacer} />
            <MapControlButton icon="locate" onPress={handleRecenter} />
          </View>
        )}
        {!route && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.noRouteOverlay, { backgroundColor: `${colors.background.primary}CC` }]}>
            <View style={styles.noRouteContent}>
              <Ionicons name="map-outline" size={48} color={colors.text.tertiary} />
              <Text style={[styles.noRouteText, { color: colors.text.secondary }]}>No route to display</Text>
              <Text style={[styles.noRouteSubtext, { color: colors.text.tertiary }]}>Plan a route to see it on the map</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={containerStyle}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={showUserLocation}
        onMapReady={handleMapReady}
        onPress={onMapPress ? (e) => onMapPress({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude }) : undefined}
      >
        {polylineCoords.length > 0 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={colors.map.polyline}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}
        {route?.origin && !showUserLocation && (
          <Marker
            coordinate={toMapLatLng(route.origin.location)}
            title={route.origin.name}
            pinColor={colors.map.start}
          />
        )}
        {routeStops.map((stop: RouteStop, index: number) => (
          <Marker
            key={stop.id}
            coordinate={toMapLatLng(stop.location)}
            title={`${index + 1}. ${stop.name}`}
            pinColor={colors.map.stop}
            onPress={() => onStopPress?.(stop.id)}
          />
        ))}
        {route?.destination && (
          <Marker
            coordinate={toMapLatLng(route.destination.location)}
            title={route.destination.name}
            pinColor={colors.map.destination}
          />
        )}
      </MapView>

      {showControls && (
        <View style={styles.controlsContainer}>
          <MapControlButton icon="add" onPress={handleZoomIn} />
          <MapControlButton icon="remove" onPress={handleZoomOut} />
          <View style={styles.controlSpacer} />
          <MapControlButton icon="locate" onPress={handleRecenter} />
        </View>
      )}

      {!route && (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.noRouteOverlay, { backgroundColor: `${colors.background.primary}CC` }]}>
          <View style={styles.noRouteContent}>
            <Ionicons name="map-outline" size={48} color={colors.text.tertiary} />
            <Text style={[styles.noRouteText, { color: colors.text.secondary }]}>No route to display</Text>
            <Text style={[styles.noRouteSubtext, { color: colors.text.tertiary }]}>Plan a route to see it on the map</Text>
          </View>
        </Animated.View>
      )}

      {Constants.appOwnership === 'expo' && (
        <View style={[styles.expoGoBanner, { backgroundColor: `${colors.background.primary}EE`, borderColor: `${colors.primary.teal}66` }]}>
          <Ionicons name="information-circle" size={16} color={colors.primary.teal} />
          <Text style={[styles.expoGoBannerText, { color: colors.text.secondary }]}>
            Map tiles need a dev build. Run: npx expo prebuild && npx expo run:android
          </Text>
        </View>
      )}

      <View style={[styles.attribution, { backgroundColor: `${colors.surface.elevated}E6` }]}>
        <Text style={[styles.attributionText, { color: colors.text.tertiary }]}>Google Maps</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  containerFull: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  routeLine: {
    position: 'absolute',
    left: '15%',
    top: '40%',
    width: '70%',
    height: 4,
    borderRadius: 2,
    transform: [{ rotate: '10deg' }],
  },
  controlsContainer: {
    position: 'absolute',
    right: Spacing.md,
    top: Spacing.md,
    gap: Spacing.xs,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  controlSpacer: { height: Spacing.sm },
  noRouteOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noRouteContent: { alignItems: 'center', padding: Spacing.xl },
  noRouteText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  noRouteSubtext: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  expoGoBanner: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  expoGoBannerText: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: 11,
  },
  attribution: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attributionText: {
    fontFamily: FontFamily.primary,
    fontSize: 10,
  },
});

export default RouteMap;
