/**
 * Google Navigation SDK Provider
 *
 * Wraps the app with NavigationProvider from
 * @googlemaps/react-native-navigation-sdk.
 *
 * Must be placed inside Redux Provider so navigation screens
 * can dispatch state, and inside ElevenLabsVoiceProvider so
 * voice-triggered navigation works.
 */

import React from 'react';
import {
  NavigationProvider,
  TaskRemovedBehavior,
} from '@googlemaps/react-native-navigation-sdk';

interface Props {
  children: React.ReactNode;
}

export function GoogleNavProvider({ children }: Props) {
  return (
    <NavigationProvider
      termsAndConditionsDialogOptions={{
        title: 'Navigation Terms',
        companyName: 'Agentic Mobile Map',
        showOnlyDisclaimer: true,
      }}
      taskRemovedBehavior={TaskRemovedBehavior.QUIT_SERVICE}
    >
      {children}
    </NavigationProvider>
  );
}

export default GoogleNavProvider;
