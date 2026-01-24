/**
 * ElevenLabs Voice Provider
 *
 * Wraps the application with ElevenLabs SDK provider.
 * Must be placed inside Redux Provider but outside voice components.
 *
 * Usage in _layout.tsx:
 * <Provider store={store}>
 *   <ElevenLabsVoiceProvider>
 *     <App />
 *   </ElevenLabsVoiceProvider>
 * </Provider>
 */

import React from 'react';
import { ElevenLabsProvider } from '@elevenlabs/react-native';

interface Props {
  children: React.ReactNode;
}

/**
 * ElevenLabs Voice Provider Component
 */
export function ElevenLabsVoiceProvider({ children }: Props) {
  return (
    <ElevenLabsProvider>
      {children}
    </ElevenLabsProvider>
  );
}

export default ElevenLabsVoiceProvider;
