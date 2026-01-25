import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  authReducer,
  conversationReducer,
  routeReducer,
  nluReducer,
  uiReducer,
  offlineReducer,
  errorReducer,
  loadingReducer,
  voiceReducer,
  anchorsReducer,
} from './slices';
import { setHydrated } from './slices/anchorsSlice';

/**
 * Redux Persist Configuration
 * Only persist the anchors slice for instant access on app load
 */
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['anchors'], // Only persist anchors slice
};

/**
 * Root Reducer combining all slices
 */
const rootReducer = combineReducers({
  auth: authReducer,
  conversation: conversationReducer,
  route: routeReducer,
  nlu: nluReducer,
  ui: uiReducer,
  offline: offlineReducer,
  error: errorReducer,
  loading: loadingReducer,
  voice: voiceReducer,
  anchors: anchorsReducer,
});

/**
 * Persisted Reducer
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * Redux Store Configuration
 *
 * Per requirements-frontend.md Phase 1.4 & 5.1-5.2:
 * All state slices implemented:
 * - auth: User authentication and session
 * - conversation: Messages, loading state, errors
 * - route: Confirmed/pending routes, waypoints, stops
 * - nlu: Intent, confidence, entities
 * - ui: Dialog visibility, modes, toasts
 * - offline: Network status, sync state
 * - error: Centralized error handling with recovery options
 * - loading: Enhanced loading states with progress tracking
 * - anchors: User's saved locations (persisted)
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions for non-serializable data
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

/**
 * Persistor for PersistGate
 */
export const persistor = persistStore(store, null, () => {
  // Mark anchors as hydrated after rehydration completes
  store.dispatch(setHydrated());
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
