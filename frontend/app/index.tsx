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
        setAppState('onboarding');
      } else if (!hasUser) {
        setAppState('auth');
      } else {
        setAppState('main');
      }
    } catch (error) {
      console.warn('Error checking app state:', error);
      setAppState('onboarding');
    }
  };

  if (appState === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }

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
