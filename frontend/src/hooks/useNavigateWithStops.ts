/**
 * useNavigateWithStops - Shared route planning logic
 *
 * Extracted from the conversation screen. Used by both text-chat and voice-assistant.
 * Handles the doNavigate flow: entity resolution -> API call -> route display.
 */

import { useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useRoute } from './useRoute';
import { useUserAnchors } from './useUserAnchors';
import { errandApi } from '@/services/api';
import type { Entities } from '@/types/nlu';
import type { Route, RouteOption } from '@/types/route';

interface UseNavigateWithStopsOptions {
  onSystemMessage: (text: string) => void;
}

interface NavigateResult {
  success: boolean;
  routeOptions?: RouteOption[];
}

export function useNavigateWithStops({ onSystemMessage }: UseNavigateWithStopsOptions) {
  const router = useRouter();
  const {
    setPending,
    setRouteOptions,
    routeOptions,
    showRouteOptions,
    destinationName: routeDestinationName,
    hideRouteOptionsSheet,
    selectRouteOption,
  } = useRoute();
  const { anchors } = useUserAnchors();
  const navigateDoneRef = useRef(false);

  const resetNavigateGuard = useCallback(() => {
    navigateDoneRef.current = false;
  }, []);

  const doNavigate = useCallback(
    async (ent: Entities, loc: { lat: number; lng: number } | null): Promise<NavigateResult> => {
      if (navigateDoneRef.current) return { success: false };
      if (!loc) {
        onSystemMessage('Location is needed to plan the route. Please enable location services.');
        return { success: false };
      }
      if (!ent.destination) {
        onSystemMessage('I need a destination to plan your route. Where would you like to go?');
        return { success: false };
      }
      navigateDoneRef.current = true;
      try {
        const res = await errandApi.navigateWithStops({
          origin: loc,
          destination: { name: ent.destination },
          stops: (ent.stops || []).map((s) => ({ name: s, category: ent.category })),
          anchors: anchors.map((a) => ({ name: a.name, location: a.location })),
        });
        if (!res.success || res.error) {
          navigateDoneRef.current = false;
          onSystemMessage(res.error?.message ?? 'Could not plan the route. Please try again.');
          return { success: false };
        }
        const data = res.data as {
          route: Route;
          routeOptions?: RouteOption[];
          excludedStops?: unknown[];
          destination?: { name: string };
        } | undefined;
        if (!data?.route) {
          navigateDoneRef.current = false;
          onSystemMessage('No route in response.');
          return { success: false };
        }

        if (data.routeOptions && data.routeOptions.length > 1) {
          setRouteOptions(data.routeOptions, data.destination?.name || ent.destination);
          const n = data.route.stops?.length ?? 0;
          onSystemMessage(
            `Found ${data.routeOptions.length} route options with ${n} stop${n !== 1 ? 's' : ''}. Please select your preferred route.`
          );
          return { success: true, routeOptions: data.routeOptions };
        } else {
          setPending(data.route);
          const n = data.route.stops?.length ?? 0;
          const excl = data.excludedStops?.length;
          onSystemMessage(
            `Route ready. ${n} stop${n !== 1 ? 's' : ''}.${excl ? ` Some stops were excluded: ${excl}.` : ''}`
          );
          router.push('/route-display');
          return { success: true };
        }
      } catch (e) {
        navigateDoneRef.current = false;
        onSystemMessage(e instanceof Error ? e.message : 'Could not plan the route.');
        return { success: false };
      }
    },
    [onSystemMessage, setPending, setRouteOptions, router, anchors]
  );

  const handleRouteOptionSelect = useCallback(
    (option: RouteOption) => {
      selectRouteOption(option);
      onSystemMessage(
        `Selected ${option.label}. ${option.stops.length} stop${option.stops.length !== 1 ? 's' : ''} - ${Math.round(option.totalTimeMin)} min total.`
      );
      router.push('/route-display');
    },
    [selectRouteOption, onSystemMessage, router]
  );

  const handleRouteOptionsDismiss = useCallback(() => {
    hideRouteOptionsSheet();
  }, [hideRouteOptionsSheet]);

  return {
    doNavigate,
    resetNavigateGuard,
    handleRouteOptionSelect,
    handleRouteOptionsDismiss,
    routeOptions,
    showRouteOptions,
    routeDestinationName,
  };
}
