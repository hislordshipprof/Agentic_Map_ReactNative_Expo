/** Map with polyline, markers (start/stops/end), zoom controls. Uses react-native-maps. */

import React, { useRef, useMemo } from 'react';
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
import { Colors, Spacing, FontFamily, FontSize, ColorUtils } from '@/theme';
import { SpringConfig } from '@/theme/animations';
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
  height?: number;
  showControls?: boolean;
  interactive?: boolean;
  onStopPress?: (stopId: string) => void;
  onMapPress?: (location: LatLng) => void;
  style?: ViewStyle;
}

const MapControlButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}> = ({ icon, onPress }) => {
  const scale = useSharedValue(1);
  const handlePressIn = () => { scale.value = withSpring(0.9, SpringConfig.snappy); };
  const handlePressOut = () => { scale.value = withSpring(1, SpringConfig.snappy); };
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.controlButton}>
        <Ionicons name={icon} size={20} color={Colors.dark.text.primary} />
      </Pressable>
    </Animated.View>
  );
};

/** Web fallback when react-native-maps is not available. */
const RouteMapPlaceholder: React.FC<{
  route?: Route;
  height: number;
  showControls: boolean;
  onStopPress?: (stopId: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  style?: ViewStyle;
}> = ({ route, height, showControls, onStopPress, onZoomIn, onZoomOut, onRecenter, style }) => {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.container, { height }, style]}>
      <LinearGradient colors={['#1a2733', '#0f1c24', '#0a1419']} style={StyleSheet.absoluteFill}>
        {route && <View style={styles.routeLine}><LinearGradient colors={[Colors.primary.tealLight, Colors.primary.teal]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /></View>}
        {route?.origin && <View style={[styles.endpointMarker, styles.originMarker]}><Ionicons name="radio-button-on" size={16} color={Colors.map.start} /></View>}
        {route?.stops.map((s, i) => (
          <Pressable key={s.id} onPress={() => onStopPress?.(s.id)} style={[styles.marker, { left: `${20 + (i * 47) % 60}%`, top: `${25 + (i * 31) % 50}%` }]}>
            <View style={styles.markerInner}><Text style={styles.markerNumber}>{i + 1}</Text></View>
          </Pressable>
        ))}
        {route?.destination && <View style={[styles.endpointMarker, styles.destinationMarker]}><Ionicons name="flag" size={16} color={Colors.map.destination} /></View>}
      </LinearGradient>
      {showControls && (
        <View style={styles.controlsContainer}>
          <MapControlButton icon="add" onPress={onZoomIn} />
          <MapControlButton icon="remove" onPress={onZoomOut} />
          <View style={styles.controlSpacer} />
          <MapControlButton icon="locate" onPress={onRecenter} />
        </View>
      )}
      {!route && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.noRouteOverlay}>
          <View style={styles.noRouteContent}>
            <Ionicons name="map-outline" size={48} color={Colors.dark.text.tertiary} />
            <Text style={styles.noRouteText}>No route to display</Text>
            <Text style={styles.noRouteSubtext}>Plan a route to see it on the map</Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
};

export const RouteMap: React.FC<RouteMapProps> = ({
  route,
  height = 300,
  showControls = true,
  onStopPress,
  onMapPress,
  style,
}) => {
  const mapRef = useRef<MapView>(null);

  const waypoints = useMemo(() => {
    if (!route) return [];
    const pts: LatLng[] = [route.origin.location];
    route.stops.forEach((s) => pts.push(s.location));
    pts.push(route.destination.location);
    return pts;
  }, [route]);

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

  const handleRecenter = () => {
    if (allCoords.length > 0) {
      mapRef.current?.fitToCoordinates(allCoords, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
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

  if (Platform.OS === 'web') {
    return (
      <RouteMapPlaceholder
        route={route}
        height={height}
        showControls={showControls}
        onStopPress={onStopPress}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onRecenter={handleRecenter}
        style={style}
      />
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(400)} style={[styles.container, { height }, style]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onPress={onMapPress ? (e) => onMapPress({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude }) : undefined}
      >
        {polylineCoords.length > 0 && (
          <Polyline coordinates={polylineCoords} strokeColor={Colors.map.polyline} strokeWidth={4} />
        )}
        {route?.origin && (
          <Marker
            coordinate={toMapLatLng(route.origin.location)}
            title={route.origin.name}
            pinColor={Colors.map.start}
          />
        )}
        {route?.stops.map((stop: RouteStop, index: number) => (
          <Marker
            key={stop.id}
            coordinate={toMapLatLng(stop.location)}
            title={`${index + 1}. ${stop.name}`}
            pinColor={Colors.map.stop}
            onPress={() => onStopPress?.(stop.id)}
          />
        ))}
        {route?.destination && (
          <Marker
            coordinate={toMapLatLng(route.destination.location)}
            title={route.destination.name}
            pinColor={Colors.map.destination}
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
        <Animated.View entering={FadeIn.duration(300)} style={styles.noRouteOverlay}>
          <View style={styles.noRouteContent}>
            <Ionicons name="map-outline" size={48} color={Colors.dark.text.tertiary} />
            <Text style={styles.noRouteText}>No route to display</Text>
            <Text style={styles.noRouteSubtext}>Plan a route to see it on the map</Text>
          </View>
        </Animated.View>
      )}

      {Constants.appOwnership === 'expo' && (
        <View style={styles.expoGoBanner}>
          <Ionicons name="information-circle" size={16} color={Colors.primary.teal} />
          <Text style={styles.expoGoBannerText}>
            Map tiles need a dev build. Run: npx expo prebuild && npx expo run:android
          </Text>
        </View>
      )}

      <View style={styles.attribution}>
        <Text style={styles.attributionText}>Google Maps</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.dark.background,
  },
  routeLine: {
    position: 'absolute',
    left: '15%',
    top: '30%',
    width: '70%',
    height: 4,
    borderRadius: 2,
    transform: [{ rotate: '15deg' }],
    overflow: 'hidden',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -32 }],
  },
  markerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.map.stop,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.dark.background,
  },
  markerNumber: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.dark.text.primary,
  },
  endpointMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.effects.glassDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.effects.glassDarkBorder,
  },
  originMarker: { left: '10%', top: '25%' },
  destinationMarker: { right: '10%', bottom: '25%' },
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
    backgroundColor: Colors.effects.glassDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
  },
  controlSpacer: { height: Spacing.sm },
  noRouteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ColorUtils.withAlpha(Colors.dark.background, 0.8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  noRouteContent: { alignItems: 'center', padding: Spacing.xl },
  noRouteText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
    marginTop: Spacing.md,
  },
  noRouteSubtext: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
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
    backgroundColor: ColorUtils.withAlpha(Colors.dark.background, 0.92),
    borderWidth: 1,
    borderColor: ColorUtils.withAlpha(Colors.primary.teal, 0.4),
  },
  expoGoBannerText: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: 11,
    color: Colors.dark.text.secondary,
  },
  attribution: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: Colors.effects.glassDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attributionText: {
    fontFamily: FontFamily.primary,
    fontSize: 10,
    color: Colors.dark.text.tertiary,
  },
});

export default RouteMap;
