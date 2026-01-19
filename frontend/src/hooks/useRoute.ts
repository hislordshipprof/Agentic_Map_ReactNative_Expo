/**
 * useRoute - Route state and actions for Route tab and Adjustment
 *
 * Encapsulates route slice and adjustment-mode UI.
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { Route } from '@/types/route';
import {
  setPendingRoute,
  confirmRoute,
  clearPendingRoute,
  clearConfirmedRoute,
  addStop,
  removeStop,
  reorderStops,
  setLoading,
  setError,
  updateRouteTotals,
  updatePolyline,
} from '@/redux/slices/routeSlice';
import { enterAdjustmentMode, exitAdjustmentMode } from '@/redux/slices/uiSlice';
import type { RouteStop } from '@/types/route';
import type { AppDispatch, RootState } from '@/redux/store';

export function useRoute() {
  const dispatch = useDispatch<AppDispatch>();

  const pending = useSelector((s: RootState) => s.route.pending);
  const confirmed = useSelector((s: RootState) => s.route.confirmed);
  const stops = useSelector((s: RootState) => s.route.stops);
  const isLoading = useSelector((s: RootState) => s.route.isLoading);
  const error = useSelector((s: RootState) => s.route.error);
  const adjustmentMode = useSelector((s: RootState) => s.ui.adjustmentMode);

  const setPending = useCallback((route: Route) => dispatch(setPendingRoute(route)), [dispatch]);
  const confirm = useCallback(() => dispatch(confirmRoute()), [dispatch]);
  const clear = useCallback(() => dispatch(clearPendingRoute()), [dispatch]);
  const clearConfirmed = useCallback(() => dispatch(clearConfirmedRoute()), [dispatch]);
  const addStopAction = useCallback((stop: RouteStop) => dispatch(addStop(stop)), [dispatch]);
  const removeStopAction = useCallback((id: string) => dispatch(removeStop(id)), [dispatch]);
  const reorderStopsAction = useCallback((ordered: RouteStop[]) => dispatch(reorderStops(ordered)), [dispatch]);
  const setLoadingAction = useCallback((v: boolean) => dispatch(setLoading(v)), [dispatch]);
  const setErrorAction = useCallback((e: string | null) => dispatch(setError(e)), [dispatch]);
  const enterAdjustment = useCallback((action?: import('@/types/ui').AdjustmentAction) => dispatch(enterAdjustmentMode(action)), [dispatch]);
  const exitAdjustment = useCallback(() => dispatch(exitAdjustmentMode()), [dispatch]);
  const updateTotals = useCallback((t: { totalDistance: number; totalTime: number }) => dispatch(updateRouteTotals(t)), [dispatch]);
  const updatePolylineAction = useCallback((p: string) => dispatch(updatePolyline(p)), [dispatch]);

  const setPendingFromMock = useCallback((mock: Route) => dispatch(setPendingRoute(mock)), [dispatch]);

  return {
    pending,
    confirmed,
    stops,
    isLoading,
    error,
    adjustmentMode,
    setPending,
    confirm,
    clear,
    clearConfirmed,
    addStop: addStopAction,
    removeStop: removeStopAction,
    reorderStops: reorderStopsAction,
    setLoading: setLoadingAction,
    setError: setErrorAction,
    enterAdjustment,
    exitAdjustment,
    updateTotals,
    updatePolyline: updatePolylineAction,
    setPendingFromMock,
  };
}
