import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

/**
 * Typed Redux Hooks
 *
 * Use these throughout the app instead of plain `useDispatch` and `useSelector`
 * to get proper TypeScript type inference.
 *
 * Per requirements-frontend.md:
 * - useAppDispatch: Typed dispatch for actions
 * - useAppSelector: Typed selector for state
 */

// Use throughout the app instead of plain `useDispatch`
export const useAppDispatch: () => AppDispatch = useDispatch;

// Use throughout the app instead of plain `useSelector`
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
