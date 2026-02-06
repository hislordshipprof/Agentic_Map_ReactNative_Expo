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
import type { DestinationSuggestion } from '@/types/api';

interface UseNavigateWithStopsOptions {
  onSystemMessage: (text: string) => void;
  onAnchorNotSet?: (anchorType: string, pendingEntities: Entities, pendingOrigin: { lat: number; lng: number }) => void;
  /** Called when destination can't be found but autocomplete has suggestions */
  onSuggestions?: (
    suggestions: DestinationSuggestion[],
    pendingEntities: Entities,
  ) => void;
  /** When false, skip auto-navigation to route-display. Default: true */
  autoNavigate?: boolean;
}

interface NavigateResult {
  success: boolean;
  routeOptions?: RouteOption[];
  route?: Route;
  destinationName?: string;
}

export function useNavigateWithStops({ onSystemMessage, onAnchorNotSet, onSuggestions, autoNavigate = true }: UseNavigateWithStopsOptions) {
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
          destination: {
            name: ent.destination,
            placeId: ent.selectedPlaceId,
          },
          stops: (ent.stops || []).map((s) => ({ name: s, category: ent.category })),
          anchors: anchors.map((a) => ({ name: a.name, location: a.location })),
        });
        if (!res.success || res.error) {
          navigateDoneRef.current = false;
          // Handle "Did you mean?" suggestions from autocomplete fallback
          if (res.error?.code === 'DESTINATION_NOT_FOUND_SUGGESTIONS' && onSuggestions) {
            const structured = res.error.suggestions as DestinationSuggestion[] | undefined;
            if (structured && structured.length > 0 && typeof structured[0] === 'object') {
              onSystemMessage(res.error.message);
              onSuggestions(structured, ent);
              return { success: false };
            }
          }
          onSystemMessage(res.error?.message ?? 'Could not plan the route. Please try again.');
          return { success: false };
        }
        const data = res.data as {
          route: Route;
          routeOptions?: RouteOption[];
          excludedStops?: unknown[];
          destination?: { name: string };
          corrections?: Array<{ original: string; corrected: string }>;
        } | undefined;
        if (!data?.route) {
          navigateDoneRef.current = false;
          onSystemMessage('No route in response.');
          return { success: false };
        }

        // Show stop name corrections (auto-corrected via autocomplete)
        if (data.corrections?.length) {
          const corrText = data.corrections
            .map(c => `Using "${c.corrected}" for "${c.original}"`)
            .join('. ');
          onSystemMessage(corrText);
        }

        const destName = data.destination?.name || ent.destination;
        if (data.routeOptions && data.routeOptions.length > 1) {
          if (autoNavigate) {
            setRouteOptions(data.routeOptions, destName);
          }
          const n = data.route.stops?.length ?? 0;
          onSystemMessage(
            `Found ${data.routeOptions.length} route options with ${n} stop${n !== 1 ? 's' : ''}. Please select your preferred route.`
          );
          return { success: true, routeOptions: data.routeOptions, route: data.route, destinationName: destName };
        } else {
          setPending(data.route);
          const n = data.route.stops?.length ?? 0;
          const excl = data.excludedStops?.length;
          onSystemMessage(
            `Route ready. ${n} stop${n !== 1 ? 's' : ''}.${excl ? ` Some stops were excluded: ${excl}.` : ''}`
          );
          if (autoNavigate) {
            router.push('/route-display');
          }
          return { success: true, route: data.route, destinationName: destName };
        }
      } catch (e: unknown) {
        navigateDoneRef.current = false;
        // Check for ANCHOR_NOT_SET error from backend
        const errorData = (e as { response?: { data?: { error?: { code?: string; anchorType?: string; message?: string; askForAddress?: boolean } } } })?.response?.data?.error;
        if (errorData?.code === 'ANCHOR_NOT_SET' && errorData.askForAddress) {
          onSystemMessage(errorData.message ?? `I don't have your ${errorData.anchorType} address saved.`);
          if (onAnchorNotSet && errorData.anchorType && loc) {
            onAnchorNotSet(errorData.anchorType, ent, loc);
          }
          return { success: false };
        }
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
      if (autoNavigate) {
        router.push('/route-display');
      }
    },
    [selectRouteOption, onSystemMessage, router, autoNavigate]
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
