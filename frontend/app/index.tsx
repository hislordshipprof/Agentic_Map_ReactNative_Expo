/**
 * Root Index - Initial Routing
 *
 * Redirects users based on onboarding and auth status:
 * - New users -> /onboarding/welcome
 * - Completed onboarding, no user -> /auth/welcome
 * - Has user (anonymous or authenticated) -> /(tabs)
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/theme';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';
const USER_KEY = '@agentic_map:user';

type AppState = 'loading' | 'onboarding' | 'auth' | 'main';

export default function Index() {
  const [appState, setAppState] = useState<AppState>('loading');

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      const [onboardingValue, userValue] = await Promise.all([
        AsyncStorage.getItem(ONBOARDING_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      const hasCompletedOnboarding = onboardingValue === 'true';
      const hasUser = userValue !== null;

      if (!hasCompletedOnboarding) {
        // New user - show onboarding
        setAppState('onboarding');
      } else if (!hasUser) {
        // Completed onboarding but no user - show auth
        setAppState('auth');
      } else {
        // Has user (anonymous or authenticated) - go to main app
        setAppState('main');
      }
    } catch (error) {
      console.warn('Error checking app state:', error);
      // Default to onboarding if we can't read storage
      setAppState('onboarding');
    }
  };

  // Show loading while checking storage
  if (appState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.background }}>
        <ActivityIndicator size="large" color={Colors.primary.teal} />
      </View>
    );
  }

  // Redirect based on app state
  switch (appState) {
    case 'onboarding':
      return <Redirect href="/onboarding/welcome" />;
    case 'auth':
      return <Redirect href="/auth/welcome" />;
    case 'main':
    default:
      return <Redirect href="/(tabs)" />;
  }
}
