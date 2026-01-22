import { useEffect, useCallback } from 'react';
import { View, Text, AppState, LogBox, type AppStateStatus } from 'react-native';

// Suppress known warnings from third-party libraries
LogBox.ignoreLogs([
  '`new NativeEventEmitter()`', // react-native-voice known issue
  'Require cycle:', // Non-critical require cycle warnings
]);
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { Provider } from 'react-redux';
import { store } from '@/redux/store';
import { LoadingOverlay, ErrorDialog } from '@/components/Common';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryClient, onlineManager, focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'AGENTIC_QUERY_CACHE',
  throttleTime: 1000,
});

function shouldDehydrateQuery(query: { queryKey: readonly unknown[] }): boolean {
  const k = query.queryKey;
  if (!Array.isArray(k) || k[0] !== 'api') return false;
  if (k[1] === 'anchors') return true;
  if (k[1] === 'user' && (k[2] === 'profile' || k[2] === 'preferences')) return true;
  return false;
}

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore errors - splash screen might already be hidden
});

export default function RootLayout(): JSX.Element {
  const [fontsLoaded, fontError] = useFonts({
    DMSans: DMSans_400Regular,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-SemiBold': DMSans_700Bold, // Use Bold as fallback for SemiBold
    'DMSans-Bold': DMSans_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(!!state.isConnected);
    });
    const subApp = AppState.addEventListener('change', (s: AppStateStatus) => {
      focusManager.setFocused(s === 'active');
    });
    return () => {
      unsubNet();
      subApp.remove();
    };
  }, []);

  // Show loading state instead of returning null
  if (!fontsLoaded && !fontError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // If font error, still render the app with system fonts
  if (fontError) {
    console.warn('Font loading error:', fontError);
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary
        level="app"
        onError={(error, _errorInfo) => {
          // Log to console in dev, would send to error service in production
          if (__DEV__) {
            console.error('[App ErrorBoundary]', error.message);
          }
        }}
      >
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            dehydrateOptions: { shouldDehydrateQuery },
          }}
        >
          <Provider store={store}>
            <View style={{ flex: 1 }}>
              <StatusBar style="auto" />
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="auth" options={{ headerShown: false }} />
                <Stack.Screen name="navigation/index" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
              </Stack>
              <LoadingOverlay fullScreen />
            </View>
            <ErrorDialog />
          </Provider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
