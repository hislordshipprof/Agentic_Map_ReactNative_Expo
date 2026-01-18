/**
 * RouteMap Component - Agentic Mobile Map
 *
 * Map visualization placeholder for route display.
 * Will integrate with Google Maps SDK in production.
 *
 * Features:
 * - Route polyline visualization (placeholder)
 * - Stop markers with category icons
 * - Origin and destination markers
 * - Zoom controls
 * - Re-center button
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  Colors,
  Spacing,
  FontFamily,
  FontSize,
  ColorUtils,
} from '@/theme';
import type { Route, RouteStop, LatLng } from '@/types/route';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * RouteMap Props
 */
export interface RouteMapProps {
  /** Route data to display */
  route?: Route;
  /** Height of the map */
  height?: number;
  /** Whether to show zoom controls */
  showControls?: boolean;
  /** Whether the map is interactive */
  interactive?: boolean;
  /** Callback when a stop marker is pressed */
  onStopPress?: (stopId: string) => void;
  /** Callback when map is pressed */
  onMapPress?: (location: LatLng) => void;
  /** Custom style */
  style?: ViewStyle;
}

/**
 * Map Control Button
 */
const MapControlButton: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}> = ({ icon, onPress }) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.controlButton,
          pressed && styles.controlButtonPressed,
        ]}
      >
        <Ionicons name={icon} size={20} color={Colors.dark.text.primary} />
      </Pressable>
    </Animated.View>
  );
};

/**
 * Stop Marker Component (placeholder)
 */
const StopMarker: React.FC<{
  stop: RouteStop;
  index: number;
  onPress?: (stopId: string) => void;
}> = ({ stop, index, onPress }) => {
  // Calculate a pseudo-random position based on index (placeholder logic)
  const posX = 20 + ((index * 47) % 60);
  const posY = 25 + ((index * 31) % 50);

  return (
    <Pressable
      onPress={() => onPress?.(stop.id)}
      style={[
        styles.marker,
        {
          left: `${posX}%`,
          top: `${posY}%`,
        },
      ]}
    >
      <View style={styles.markerInner}>
        <Text style={styles.markerNumber}>{index + 1}</Text>
      </View>
      <View style={styles.markerTail} />
    </Pressable>
  );
};

/**
 * RouteMap Component
 *
 * Note: This is a placeholder visualization.
 * In production, this would use react-native-maps with Google Maps SDK.
 */
export const RouteMap: React.FC<RouteMapProps> = ({
  route,
  height = 300,
  showControls = true,
  onStopPress,
  style,
}) => {
  const [zoomLevel, setZoomLevel] = useState(12);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, 20));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, 5));
  };

  const handleRecenter = () => {
    // Would recenter map to show full route
    console.log('Recenter map');
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[styles.container, { height }, style]}
    >
      {/* Map background placeholder */}
      <LinearGradient
        colors={['#1a2733', '#0f1c24', '#0a1419']}
        style={StyleSheet.absoluteFill}
      >
        {/* Grid overlay to simulate map tiles */}
        <View style={styles.gridOverlay}>
          {Array.from({ length: 6 }).map((_, row) =>
            Array.from({ length: 8 }).map((_, col) => (
              <View
                key={`${row}-${col}`}
                style={[
                  styles.gridCell,
                  {
                    left: col * (SCREEN_WIDTH / 8),
                    top: row * (height / 6),
                    opacity: 0.02 + (row + col) * 0.005,
                  },
                ]}
              />
            ))
          )}
        </View>

        {/* Simulated route line */}
        {route && (
          <View style={styles.routeLine}>
            <LinearGradient
              colors={[Colors.primary.tealLight, Colors.primary.teal, Colors.primary.tealDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.routeLineGradient}
            />
          </View>
        )}

        {/* Origin marker */}
        {route?.origin && (
          <View style={[styles.endpointMarker, styles.originMarker]}>
            <Ionicons name="radio-button-on" size={16} color={Colors.primary.teal} />
          </View>
        )}

        {/* Stop markers */}
        {route?.stops.map((stop, index) => (
          <StopMarker
            key={stop.id}
            stop={stop}
            index={index}
            onPress={onStopPress}
          />
        ))}

        {/* Destination marker */}
        {route?.destination && (
          <View style={[styles.endpointMarker, styles.destinationMarker]}>
            <Ionicons name="flag" size={16} color={Colors.semantic.success} />
          </View>
        )}
      </LinearGradient>

      {/* Map controls */}
      {showControls && (
        <View style={styles.controlsContainer}>
          <MapControlButton icon="add" onPress={handleZoomIn} />
          <MapControlButton icon="remove" onPress={handleZoomOut} />
          <View style={styles.controlSpacer} />
          <MapControlButton icon="locate" onPress={handleRecenter} />
        </View>
      )}

      {/* Zoom level indicator */}
      <View style={styles.zoomIndicator}>
        <Text style={styles.zoomText}>Zoom: {zoomLevel}x</Text>
      </View>

      {/* No route placeholder */}
      {!route && (
        <View style={styles.noRouteOverlay}>
          <View style={styles.noRouteContent}>
            <Ionicons name="map-outline" size={48} color={Colors.dark.text.tertiary} />
            <Text style={styles.noRouteText}>No route to display</Text>
            <Text style={styles.noRouteSubtext}>
              Plan a route to see it on the map
            </Text>
          </View>
        </View>
      )}

      {/* Attribution badge */}
      <View style={styles.attribution}>
        <Text style={styles.attributionText}>Map Preview</Text>
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
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridCell: {
    position: 'absolute',
    width: SCREEN_WIDTH / 8,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  // Route line
  routeLine: {
    position: 'absolute',
    left: '15%',
    top: '30%',
    width: '70%',
    height: 4,
    borderRadius: 2,
    transform: [{ rotate: '15deg' }],
  },
  routeLineGradient: {
    flex: 1,
    borderRadius: 2,
  },
  // Markers
  marker: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -16 }, { translateY: -32 }],
  },
  markerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.teal,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.dark.background,
    shadowColor: Colors.primary.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerNumber: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.dark.text.primary,
  },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.primary.teal,
    marginTop: -2,
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
  originMarker: {
    left: '10%',
    top: '25%',
  },
  destinationMarker: {
    right: '10%',
    bottom: '25%',
  },
  // Controls
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
  controlButtonPressed: {
    backgroundColor: Colors.effects.glassDarkLight,
  },
  controlSpacer: {
    height: Spacing.sm,
  },
  // Zoom indicator
  zoomIndicator: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    backgroundColor: Colors.effects.glassDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
  },
  zoomText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  // No route state
  noRouteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: ColorUtils.withAlpha(Colors.dark.background, 0.8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  noRouteContent: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
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
  // Attribution
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
