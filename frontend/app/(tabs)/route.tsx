/**
 * Route Tab - Agentic Mobile Map
 *
 * Route confirmation when pending/confirmed, else empty state.
 * AdjustmentMode when adjusting; AddStopForm for add/replace.
 * Per requirements-frontend.md 3.1, 3.2.
 */

import { useState, useCallback } from 'react';
import { Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { RouteConfirmationScreen } from '@/components/Route';
import { AdjustmentMode, AddStopForm } from '@/components/Adjustment';
import type { AddStopPlace } from '@/components/Adjustment';
import { useRoute } from '@/hooks';
import { errandApi } from '@/services/api/errand';
import { Colors, Spacing, FontFamily, FontSize } from '@/theme';
import { getDetourStatus } from '@/types/route';
import type { RouteStop } from '@/types/route';

export default function RouteScreen(): JSX.Element {
  const router = useRouter();
  const {
    pending,
    confirmed,
    stops,
    isLoading,
    adjustmentMode,
    confirm,
    clear,
    setPending,
    enterAdjustment,
    exitAdjustment,
    addStop,
    removeStop,
    reorderStops,
    setLoading,
    setError,
  } = useRoute();

  const [addStopFormVisible, setAddStopFormVisible] = useState(false);
  const [replaceContext, setReplaceContext] = useState<{ stopId: string; stopName: string } | null>(null);

  const baseRoute = pending || confirmed;
  const routeWithStops = baseRoute ? { ...baseRoute, stops } : null;

  // Debug logging for stops
  if (baseRoute) {
    console.log('[RouteScreen] baseRoute.stops:', baseRoute.stops?.length || 0);
    console.log('[RouteScreen] Redux stops:', stops?.length || 0);
    console.log('[RouteScreen] routeWithStops.stops:', routeWithStops?.stops?.length || 0);
  }

  const handleAccept = () => {
    confirm();
    router.push('/navigation' as never);
  };

  const handleAdjust = () => {
    enterAdjustment();
  };

  const handleCancel = () => {
    clear();
    router.replace('/(tabs)');
  };

  const handleReoptimize = useCallback(async (overrideStops?: RouteStop[]) => {
    if (!baseRoute) return;
    const list = overrideStops ?? routeWithStops?.stops ?? [];
    setLoading(true);
    setError(null);
    try {
      const res = await errandApi.recalculateRoute({
        origin: baseRoute.origin.location,
        destination: baseRoute.destination.location,
        stops: list.map((s) => ({ placeId: s.id, lat: s.location.lat, lng: s.location.lng })),
      });
      if (!res.success || res.error) {
        setError(res.error?.message ?? 'Could not recalculate route');
        return;
      }
      const route = res.data?.route;
      if (route) setPending(route);
      else setError('Could not recalculate route');
    } catch (e) {
      setError((e as Error).message || 'Recalculate failed');
    } finally {
      setLoading(false);
    }
  }, [baseRoute, routeWithStops, setPending, setLoading, setError]);

  const handlePreview = useCallback(async () => {
    if (!baseRoute || !routeWithStops) return;
    try {
      const res = await errandApi.previewRoute({
        origin: baseRoute.origin.location,
        destination: baseRoute.destination.location,
        stops: routeWithStops.stops.map((s) => ({ placeId: s.id, lat: s.location.lat, lng: s.location.lng })),
      });
      if (!res.success || res.error) {
        Alert.alert('Preview', res.error?.message ?? 'Could not load preview.');
        return;
      }
      const d = res.data;
      if (d) {
        Alert.alert('Route preview', `Distance: ${(d.totalDistance ?? 0).toFixed(1)} mi\nDuration: ~${Math.round(d.totalDuration ?? 0)} min`);
      } else {
        Alert.alert('Preview', 'Could not load preview.');
      }
    } catch {
      Alert.alert('Preview', 'Preview unavailable.');
    }
  }, [baseRoute, routeWithStops]);

  const handleAdd = useCallback(() => {
    setReplaceContext(null);
    setAddStopFormVisible(true);
  }, []);

  const handleReplace = useCallback((stopId: string) => {
    const name = routeWithStops?.stops.find((s) => s.id === stopId)?.name ?? 'stop';
    setReplaceContext({ stopId, stopName: name });
    setAddStopFormVisible(true);
  }, [routeWithStops]);

  const handleAddStopSelect = useCallback((place: AddStopPlace) => {
    if (!baseRoute) return;
    const newStop: RouteStop = {
      id: place.placeId,
      name: place.name,
      address: place.address,
      location: place.location,
      mileMarker: 0,
      detourCost: 0,
      status: getDetourStatus(0, baseRoute.detourBudget.total),
      order: (routeWithStops?.stops.length ?? 0) + 1,
    };
    addStop(newStop);
    setAddStopFormVisible(false);
    setReplaceContext(null);
    handleReoptimize([...(routeWithStops?.stops ?? []), newStop]);
  }, [baseRoute, routeWithStops, addStop, handleReoptimize]);

  const handleReplaceSelect = useCallback((place: AddStopPlace) => {
    if (!replaceContext || !routeWithStops) return;
    const newStop: RouteStop = {
      id: place.placeId,
      name: place.name,
      address: place.address,
      location: place.location,
      mileMarker: 0,
      detourCost: 0,
      status: 'NO_DETOUR',
      order: 1,
    };
    const next = routeWithStops.stops.map((s) => (s.id === replaceContext.stopId ? newStop : s));
    reorderStops(next);
    setAddStopFormVisible(false);
    setReplaceContext(null);
    handleReoptimize(next);
  }, [replaceContext, routeWithStops, reorderStops, handleReoptimize]);

  const handleAddStopFormSelect = replaceContext ? handleReplaceSelect : handleAddStopSelect;

  if (baseRoute && adjustmentMode) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <AdjustmentMode
          route={routeWithStops!}
          onReoptimize={handleReoptimize}
          onPreview={handlePreview}
          onDone={exitAdjustment}
          onRemove={removeStop}
          onReorder={reorderStops}
          onAdd={handleAdd}
          onReplace={handleReplace}
          isOptimizing={isLoading}
        />
        {addStopFormVisible && (
          <AddStopForm
            onSelect={handleAddStopFormSelect}
            onCancel={() => { setAddStopFormVisible(false); setReplaceContext(null); }}
            mode={replaceContext ? 'replace' : 'add'}
            replaceStopName={replaceContext?.stopName}
            location={
              baseRoute?.origin?.location
              ?? routeWithStops?.stops?.[0]?.location
              ?? undefined
            }
          />
        )}
      </SafeAreaView>
    );
  }

  if (baseRoute) {
    // Use routeWithStops to ensure stops from Redux are properly included
    const displayRoute = routeWithStops || baseRoute;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <RouteConfirmationScreen
          route={displayRoute}
          onAccept={handleAccept}
          onAdjust={handleAdjust}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.empty}>
        <Animated.View entering={FadeInDown.duration(400).delay(150)}>
          <Ionicons name="map-outline" size={64} color={Colors.dark.text.tertiary} />
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(400).delay(220)}>
          <Text style={styles.emptyTitle}>Plan a route from the conversation</Text>
          <Text style={styles.emptySubtext}>
            Start in the Plan tab, describe your trip and stops, and your route will appear here.
          </Text>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  emptySubtext: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 280,
  },
});
