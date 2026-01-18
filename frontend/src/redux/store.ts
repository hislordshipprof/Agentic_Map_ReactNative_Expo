import { configureStore } from '@reduxjs/toolkit';
import {
  authReducer,
  conversationReducer,
  routeReducer,
  nluReducer,
  uiReducer,
  offlineReducer,
} from './slices';

/**
 * Redux Store Configuration
 *
 * Per requirements-frontend.md Phase 1.4:
 * All state slices implemented:
 * - auth: User authentication and session
 * - conversation: Messages, loading state, errors
 * - route: Confirmed/pending routes, waypoints, stops
 * - nlu: Intent, confidence, entities
 * - ui: Dialog visibility, modes, toasts
 * - offline: Network status, sync state
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    conversation: conversationReducer,
    route: routeReducer,
    nlu: nluReducer,
    ui: uiReducer,
    offline: offlineReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for non-serializable data
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
