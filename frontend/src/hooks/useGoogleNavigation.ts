/**
 * useGoogleNavigation - Wraps the Google Navigation SDK with app-specific logic
 *
 * Converts app Route/RouteStop types into SDK waypoints, manages the
 * navigation lifecycle (init → setDestinations → startGuidance), and
 * dispatches progress updates to the navigation Redux slice.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';
import {
  useNavigation as useNavSdk,
  NavigationSessionStatus,
  RouteStatus,
  TravelMode,
  AudioGuidance,
  type Waypoint as SdkWaypoint,
  type MapViewController,
} from '@googlemaps/react-native-navigation-sdk';
import type { Route, RouteStop } from '@/types/route';
import {
  setNavigationStatus,
  setCurrentStopIndex,
  setTotalStops,
  updateRemainingTimeAndDistance,
  setNavigationError,
  resetNavigation,
} from '@/redux/slices/navigationSlice';

/**
 * Select the best en-US voice from available voices.
 * Prefers network/enhanced voices for higher quality.
 */
async function selectBestVoice(): Promise<Voice | undefined> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const enUs = voices.filter(
      (v) => v.language === 'en-US' || v.language?.startsWith('en-US')
    );
    if (enUs.length === 0) return undefined;

    // Prefer network/enhanced voices (higher quality on Android)
    const network = enUs.find((v) => v.identifier?.includes('-network'));
    if (network) return network;

    // Prefer voices with "enhanced" or "premium" in identifier
    const enhanced = enUs.find(
      (v) =>
        v.identifier?.includes('enhanced') ||
        v.identifier?.includes('premium') ||
        v.identifier?.includes('neural')
    );
    if (enhanced) return enhanced;

    // Prefer female voices (generally rated more pleasant for navigation)
    const female = enUs.find(
      (v) =>
        v.identifier?.includes('female') ||
        v.identifier?.includes('sfg') ||
        v.name?.toLowerCase().includes('female')
    );
    if (female) return female;

    // Fall back to first available en-US voice
    return enUs[0];
  } catch {
    return undefined;
  }
}

/**
 * Convert app Route + RouteStop[] into SDK waypoints.
 * Sorts stops by `order`, appends destination as final waypoint.
 */
function buildWaypoints(route: Route, stops: RouteStop[]): SdkWaypoint[] {
  const sorted = [...stops].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const waypoints: SdkWaypoint[] = sorted.map((stop) => ({
    title: stop.name,
    position: { lat: stop.location.lat, lng: stop.location.lng },
  }));

  // Append destination as final waypoint
  waypoints.push({
    title: route.destination.name,
    position: {
      lat: route.destination.location.lat,
      lng: route.destination.location.lng,
    },
  });

  return waypoints;
}

export function useGoogleNavigation() {
  const dispatch = useDispatch();
  const {
    navigationController,
    setOnArrival,
    setOnRemainingTimeOrDistanceChanged,
  } = useNavSdk();

  const stopIndexRef = useRef(0);
  const totalStopsRef = useRef(0);
  const guidanceActiveRef = useRef(false);
  const mapViewControllerRef = useRef<MapViewController | null>(null);
  const bestVoiceRef = useRef<Voice | undefined>(undefined);

  // Load best voice on mount
  useEffect(() => {
    selectBestVoice().then((voice) => {
      bestVoiceRef.current = voice;
    });
  }, []);

  /** Store the MapViewController when NavigationView creates it. */
  const onMapViewControllerCreated = useCallback(
    (controller: MapViewController) => {
      mapViewControllerRef.current = controller;
    },
    []
  );

  /**
   * Initialize the navigation session.
   * Shows the terms & conditions dialog first (required by SDK),
   * then calls init(). Returns true if both succeed.
   */
  const initNavigation = useCallback(async (): Promise<boolean> => {
    dispatch(setNavigationStatus('initializing'));
    try {
      // Must show terms dialog before init — SDK requires acceptance
      const termsAccepted =
        await navigationController.showTermsAndConditionsDialog();

      if (!termsAccepted) {
        dispatch(setNavigationError('Navigation terms were not accepted.'));
        return false;
      }

      const status = await navigationController.init();

      switch (status) {
        case NavigationSessionStatus.OK:
          // Start silent — summary speaks first, then we unmute Google
          navigationController.setAudioGuidanceType(AudioGuidance.SILENT);
          dispatch(setNavigationStatus('ready'));
          return true;

        case NavigationSessionStatus.NOT_AUTHORIZED:
          dispatch(setNavigationError('Navigation SDK not authorized. Check API key.'));
          return false;

        case NavigationSessionStatus.TERMS_NOT_ACCEPTED:
          dispatch(setNavigationError('Navigation terms were not accepted.'));
          return false;

        case NavigationSessionStatus.LOCATION_PERMISSION_MISSING:
          dispatch(setNavigationError('Location permission is required for navigation.'));
          return false;

        case NavigationSessionStatus.NETWORK_ERROR:
          dispatch(setNavigationError('Network error. Check your connection.'));
          return false;

        default:
          dispatch(setNavigationError('Failed to initialize navigation.'));
          return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Navigation init failed';
      dispatch(setNavigationError(message));
      return false;
    }
  }, [navigationController, dispatch]);

  /**
   * Register the arrival event handler.
   * On intermediate stops → continueToNextDestination + startGuidance.
   * On final destination → dispatch 'arrived'.
   */
  const registerArrivalHandler = useCallback(() => {
    setOnArrival((_event) => {
      const current = stopIndexRef.current;
      const total = totalStopsRef.current;

      if (current < total - 1) {
        // Intermediate stop — advance to next
        stopIndexRef.current = current + 1;
        dispatch(setCurrentStopIndex(current + 1));
        navigationController.continueToNextDestination();
        navigationController.startGuidance();
      } else {
        // Final destination
        dispatch(setNavigationStatus('arrived'));
        guidanceActiveRef.current = false;
      }
    });
  }, [navigationController, setOnArrival, dispatch]);

  /**
   * Register the time/distance update handler.
   * Updates Redux with remaining time and distance.
   */
  const registerTimeDistanceHandler = useCallback(() => {
    setOnRemainingTimeOrDistanceChanged((timeAndDistance) => {
      dispatch(
        updateRemainingTimeAndDistance({
          seconds: timeAndDistance.seconds,
          meters: timeAndDistance.meters,
        })
      );
    });
  }, [setOnRemainingTimeOrDistanceChanged, dispatch]);

  /**
   * Add custom markers for each intermediate stop on the map.
   * Called after destinations are set so markers appear on the route.
   */
  const addStopMarkers = useCallback(
    async (stops: RouteStop[]) => {
      const controller = mapViewControllerRef.current;
      if (!controller || stops.length === 0) return;

      const sorted = [...stops].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );

      for (let i = 0; i < sorted.length; i++) {
        const stop = sorted[i];
        try {
          await controller.addMarker({
            id: `stop-${i}`,
            position: { lat: stop.location.lat, lng: stop.location.lng },
            title: stop.name,
            snippet: `Stop ${i + 1}`,
          });
        } catch {
          // Marker add can fail if view isn't ready yet — non-fatal
        }
      }
    },
    []
  );

  /**
   * Speak a route summary using the best available voice.
   * Returns a Promise that resolves when speech finishes,
   * so Google's turn-by-turn can be unmuted after.
   */
  const announceRouteSummary = useCallback(
    (route: Route, stops: RouteStop[]): Promise<void> => {
      return new Promise((resolve) => {
        const sorted = [...stops].sort(
          (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );

        let text = 'Starting route.';

        if (sorted.length > 0) {
          const stopNames = sorted.map((s, i) =>
            i === 0 ? `First stop: ${s.name}` : s.name
          );

          if (stopNames.length === 1) {
            text += ` ${stopNames[0]}.`;
          } else {
            const allButLast = stopNames.slice(0, -1).join(', then ');
            text += ` ${allButLast}, then ${stopNames[stopNames.length - 1]}.`;
          }
        }

        text += ` Final destination: ${route.destination.name}.`;

        const voice = bestVoiceRef.current;

        Speech.speak(text, {
          language: 'en-US',
          voice: voice?.identifier,
          pitch: 1.0,
          rate: 0.9,
          onDone: resolve,
          onError: () => resolve(),
        });
      });
    },
    []
  );

  /**
   * Start navigation with the given route and stops.
   * Builds waypoints, sets destinations, and begins guidance.
   */
  const startNavigation = useCallback(
    async (route: Route, stops: RouteStop[]): Promise<boolean> => {
      dispatch(setNavigationStatus('routing'));

      const waypoints = buildWaypoints(route, stops);
      totalStopsRef.current = waypoints.length;
      stopIndexRef.current = 0;
      dispatch(setTotalStops(waypoints.length));
      dispatch(setCurrentStopIndex(0));

      try {
        const routeStatus = await navigationController.setDestinations(
          waypoints,
          {
            routingOptions: { travelMode: TravelMode.DRIVING },
            displayOptions: {
              showDestinationMarkers: true,
              showTrafficLights: true,
            },
          }
        );

        if (routeStatus !== RouteStatus.OK) {
          dispatch(setNavigationError(`Route calculation failed: ${routeStatus}`));
          return false;
        }

        // Add markers for intermediate stops
        await addStopMarkers(stops);

        // Start guidance (visually active but audio muted)
        await navigationController.startGuidance();
        guidanceActiveRef.current = true;
        dispatch(setNavigationStatus('navigating'));

        // Speak route summary first, then unmute Google's turn-by-turn
        await announceRouteSummary(route, stops);
        navigationController.setAudioGuidanceType(
          AudioGuidance.VOICE_ALERTS_AND_GUIDANCE
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start navigation';
        dispatch(setNavigationError(message));
        return false;
      }
    },
    [navigationController, dispatch]
  );

  /**
   * Stop active navigation and reset state.
   */
  const stopNavigation = useCallback(async () => {
    try {
      Speech.stop();
      if (guidanceActiveRef.current) {
        await navigationController.stopGuidance();
        await navigationController.clearDestinations();
        guidanceActiveRef.current = false;
      }
    } catch {
      // Swallow errors during cleanup
    }
    dispatch(resetNavigation());
  }, [navigationController, dispatch]);

  return {
    initNavigation,
    startNavigation,
    stopNavigation,
    registerArrivalHandler,
    registerTimeDistanceHandler,
    onMapViewControllerCreated,
  };
}

export default useGoogleNavigation;
