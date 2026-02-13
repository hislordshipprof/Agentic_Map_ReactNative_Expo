/**
 * Navigation Screen
 *
 * Full-screen Google Navigation SDK turn-by-turn experience.
 *
 * On mount: confirm route → init SDK → register listeners → start guidance.
 * On unmount: stop guidance and clean up.
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { NavigationView } from '@googlemaps/react-native-navigation-sdk';
import { Ionicons } from '@expo/vector-icons';

import { useGoogleNavigation } from '@/hooks/useGoogleNavigation';
import { confirmRoute } from '@/redux/slices/routeSlice';
import type { RootState } from '@/redux/store';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

export default function NavigationScreen(): React.ReactElement {
  const router = useRouter();
  const dispatch = useDispatch();
  const colors = useThemeColors();
  const mountedRef = useRef(false);
  const startedRef = useRef(false);

  const {
    initNavigation,
    startNavigation,
    stopNavigation,
    registerArrivalHandler,
    registerTimeDistanceHandler,
    onMapViewControllerCreated,
  } = useGoogleNavigation();

  // Read route from Redux
  const pendingRoute = useSelector((s: RootState) => s.route.pending);
  const confirmedRoute = useSelector((s: RootState) => s.route.confirmed);
  const stops = useSelector((s: RootState) => s.route.stops);
  const navStatus = useSelector((s: RootState) => s.navigation.status);
  const navError = useSelector((s: RootState) => s.navigation.error);

  const baseRoute = pendingRoute || confirmedRoute;

  // End navigation and go back
  const handleEnd = useCallback(async () => {
    await stopNavigation();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [stopNavigation, router]);

  // Handle arrival at final destination
  useEffect(() => {
    if (navStatus === 'arrived') {
      Alert.alert('You have arrived!', 'You have reached your destination.', [
        { text: 'OK', onPress: handleEnd },
      ]);
    }
  }, [navStatus, handleEnd]);

  // Intercept Android back button
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEnd();
      return true;
    });
    return () => handler.remove();
  }, [handleEnd]);

  // Main navigation startup sequence
  useEffect(() => {
    if (startedRef.current || !baseRoute) return;
    startedRef.current = true;
    mountedRef.current = true;

    const run = async () => {
      // Confirm the route in Redux
      dispatch(confirmRoute());

      // Init the SDK
      const ok = await initNavigation();
      if (!ok || !mountedRef.current) return;

      // Register event handlers
      registerArrivalHandler();
      registerTimeDistanceHandler();

      // Start guidance
      await startNavigation(baseRoute, stops);
    };

    run();

    return () => {
      mountedRef.current = false;
      stopNavigation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Error state ───────────────────────────────────────────────────────────
  if (navStatus === 'error') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Ionicons name="warning-outline" size={64} color={colors.text.tertiary} />
        <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
          Navigation Error
        </Text>
        <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
          {navError || 'An unknown error occurred.'}
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary.teal }]}
          onPress={handleEnd}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── No route state ────────────────────────────────────────────────────────
  if (!baseRoute) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <Ionicons name="map-outline" size={64} color={colors.text.tertiary} />
        <Text style={[styles.errorTitle, { color: colors.text.primary }]}>
          No Route Available
        </Text>
        <Text style={[styles.errorMessage, { color: colors.text.secondary }]}>
          Plan a route first using voice or text, then start navigation.
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary.teal }]}
          onPress={handleEnd}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── Loading state (initializing / routing) ────────────────────────────────
  if (navStatus === 'initializing' || navStatus === 'routing' || navStatus === 'idle') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.primary.teal} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          {navStatus === 'routing' ? 'Calculating route...' : 'Starting navigation...'}
        </Text>
      </View>
    );
  }

  // ─── Active navigation ─────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <NavigationView
        style={StyleSheet.absoluteFill}
        headerEnabled
        footerEnabled
        speedometerEnabled
        speedLimitIconEnabled
        trafficIncidentCardsEnabled
        tripProgressBarEnabled={false}
        recenterButtonEnabled
        onMapViewControllerCreated={onMapViewControllerCreated}
      />

      {/* Floating "End" button */}
      <TouchableOpacity
        style={styles.endButton}
        onPress={handleEnd}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={20} color="#FFFFFF" />
        <Text style={styles.endButtonText}>End</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  errorMessage: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 300,
  },
  backButton: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
  },
  backButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.md,
    marginTop: Spacing.lg,
  },
  endButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E53935',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  endButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
