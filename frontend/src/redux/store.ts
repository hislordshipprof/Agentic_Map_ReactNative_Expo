import { configureStore } from '@reduxjs/toolkit';

/**
 * Redux Store Configuration
 *
 * Per requirements-frontend.md Phase 1.4:
 * Main state slices to be implemented:
 * - conversationSlice: Messages, loading state, errors
 * - routeSlice: Confirmed/pending routes, waypoints, stops
 * - nluSlice: Intent, confidence, entities
 * - uiSlice: Dialog visibility, modes
 * - userSlice: Anchors, preferences
 * - offlineSlice: Network status, sync state
 *
 * This is a minimal placeholder that will be expanded in Chunk 4-7.
 */
export const store = configureStore({
  reducer: {
    // Slices will be added in subsequent chunks
    // conversation: conversationReducer,
    // route: routeReducer,
    // nlu: nluReducer,
    // ui: uiReducer,
    // user: userReducer,
    // offline: offlineReducer,
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
