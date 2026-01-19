/**
 * Root Index - Initial Routing
 * 
 * Redirects users based on onboarding status:
 * - New users -> /onboarding/welcome
 * - Returning users -> /(tabs)
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/theme';

const ONBOARDING_KEY = '@agentic_map:onboarding_complete';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      setHasCompletedOnboarding(value === 'true');
    } catch (error) {
      console.warn('Error checking onboarding status:', error);
      // Default to showing onboarding if we can't read storage
      setHasCompletedOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking storage
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.background }}>
        <ActivityIndicator size="large" color={Colors.primary.teal} />
      </View>
    );
  }

  // Redirect based on onboarding status
  if (hasCompletedOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding/welcome" />;
}
