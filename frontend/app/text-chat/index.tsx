/**
 * Text Chat Screen - Conversational Route Planning
 *
 * Extracted from the original (tabs)/index.tsx conversation interface.
 * Full NLU flow with text input, conversation messages, and route planning.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedMessage } from '@/components/Conversation';
import type { Message } from '@/components/Conversation';
import { useNLUFlow, useLocation, useNavigateWithStops, useUserAnchors } from '@/hooks';
import { ThinkingBubble } from '@/components/Common';
import { UserInputField } from '@/components/Input';
import { ConfirmationDialog, AlternativesDialog, DEFAULT_ALTERNATIVES } from '@/components/Dialogs';
import { RouteOptionsSheet } from '@/components/Route';
import { AddressInputBubble } from '@/components/Chat/AddressInputBubble';
import { errandApi, checkBackendConnectivity, userApi } from '@/services/api';
import { useThemeColors } from '@/theme/useThemeColors';
import { Spacing, FontFamily, FontSize } from '@/theme';
import type { Entities } from '@/types/nlu';
import type { AnchorType } from '@/types/user';

function entitiesToConfirmation(entities: Entities): { destination?: string; stops?: string[] } {
  return {
    destination: entities.destination,
    stops: entities.stops && entities.stops.length > 0 ? entities.stops : undefined,
  };
}

export default function TextChatScreen(): JSX.Element {
  const router = useRouter();
  const colors = useThemeColors();
  const {
    flowState,
    intent,
    entities,
    processUtterance,
    onNLUResponse,
    confirmCurrentIntent,
    rejectAndRephrase,
    selectAlternative,
    shouldShowConfirmation,
    shouldShowAlternatives,
    lastMessage,
  } = useNLUFlow();
  const {
    currentLocation,
    address,
    locationStatus,
    locationError,
    isLoading: locationLoading,
  } = useLocation();

  const { setAnchor } = useUserAnchors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'understanding' | 'planning_route'>('idle');
  const escalationInProgressRef = useRef(false);
  const [awaitingAddress, setAwaitingAddress] = useState<{
    anchorType: string;
    pendingEntities: Entities;
    pendingOrigin: { lat: number; lng: number };
  } | null>(null);

  const appendSystem = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `system_${Date.now()}`, sender: 'system', text, timestamp: Date.now() },
    ]);
  }, []);

  const handleAnchorNotSet = useCallback(
    (anchorType: string, pendingEntities: Entities, pendingOrigin: { lat: number; lng: number }) => {
      setAwaitingAddress({ anchorType, pendingEntities, pendingOrigin });
    },
    [],
  );

  const {
    doNavigate,
    resetNavigateGuard,
    handleRouteOptionSelect,
    handleRouteOptionsDismiss,
    routeOptions,
    showRouteOptions,
    routeDestinationName,
  } = useNavigateWithStops({ onSystemMessage: appendSystem, onAnchorNotSet: handleAnchorNotSet });

  // Conversational response
  useEffect(() => {
    if (flowState === 'conversational' && lastMessage) {
      appendSystem(lastMessage);
    }
  }, [flowState, lastMessage, appendSystem]);

  // HIGH confidence: navigate
  useEffect(() => {
    if (
      flowState !== 'high_confidence' ||
      intent !== 'navigate_with_stops' ||
      !entities.destination
    ) return;
    setProcessingPhase('planning_route');
    setIsLoading(true);
    doNavigate(entities, currentLocation).finally(() => {
      setProcessingPhase('idle');
      setIsLoading(false);
    });
  }, [flowState, intent, entities, currentLocation, doNavigate]);

  // Escalating
  useEffect(() => {
    if (flowState !== 'escalating' || escalationInProgressRef.current) return;
    const lastUser = [...messages].reverse().find((m) => m.sender === 'user');
    const utterance = lastUser?.text ?? '';
    const conversationHistory = messages.map((m) => ({
      role: m.sender as 'user' | 'system',
      content: m.text,
    }));
    escalationInProgressRef.current = true;
    errandApi
      .escalateToLLM({ utterance, conversationHistory, currentLocation: currentLocation ?? undefined })
      .then((res) => {
        if (res.success && res.data) onNLUResponse(res.data);
        else appendSystem(res.error?.message ?? 'Escalation failed.');
      })
      .catch((e) => {
        appendSystem(e instanceof Error ? e.message : 'Escalation failed.');
      })
      .finally(() => {
        escalationInProgressRef.current = false;
      });
  }, [flowState, messages, currentLocation, onNLUResponse, appendSystem]);

  // Backend connectivity check
  const hasCheckedBackendRef = useRef(false);
  useEffect(() => {
    if (hasCheckedBackendRef.current) return;
    hasCheckedBackendRef.current = true;
    checkBackendConnectivity().then(({ ok, baseUrl, error }) => {
      if (ok) return;
      appendSystem(
        `Could not reach the backend at ${baseUrl}. ` +
          'Check: 1) Backend is running. 2) EXPO_PUBLIC_API_URL is correct. ' +
          '3) Phone and PC on same WiFi. ' +
          (error ? `(${error})` : '')
      );
    });
  }, [appendSystem]);

  const handleSend = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: `user_${Date.now()}`,
        sender: 'user',
        text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMessage]);

      if (!currentLocation && (locationError || !locationLoading)) {
        appendSystem('Please enable location services to plan your route.');
        return;
      }
      if (!currentLocation && locationLoading) {
        appendSystem('Getting your location...');
      }

      resetNavigateGuard();
      setProcessingPhase('understanding');
      setIsLoading(true);
      try {
        const recentMessages = [...messages, userMessage]
          .filter((m) => m.sender === 'user' || m.sender === 'system')
          .slice(-10);
        const conversationHistory = recentMessages.map((m) => ({
          role: m.sender === 'system' ? 'model' : 'user',
          content: m.text,
        }));
        await processUtterance(text, currentLocation ?? undefined, conversationHistory);
      } catch (e) {
        appendSystem(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setProcessingPhase('idle');
        setIsLoading(false);
      }
    },
    [currentLocation, locationError, locationLoading, processUtterance, appendSystem, messages, resetNavigateGuard]
  );

  const handleAddressSelected = useCallback(
    async (result: { location: { lat: number; lng: number }; address: string; name: string }) => {
      if (!awaitingAddress) return;
      const type = awaitingAddress.anchorType as AnchorType;
      const pending = awaitingAddress;

      appendSystem(`Setting ${type} to: ${result.address}`);
      await setAnchor(type, result.location, type === 'home' ? 'Home' : 'Work', result.address);
      try {
        await userApi.saveAnchor({
          name: type === 'home' ? 'Home' : 'Work',
          location: result.location,
          address: result.address,
          type,
        });
      } catch {
        // Backend sync failed silently
      }

      setAwaitingAddress(null);

      // Retry the original navigate request
      appendSystem('Address saved! Planning your route...');
      resetNavigateGuard();
      setProcessingPhase('planning_route');
      setIsLoading(true);
      try {
        await doNavigate(pending.pendingEntities, pending.pendingOrigin);
      } finally {
        setProcessingPhase('idle');
        setIsLoading(false);
      }
    },
    [awaitingAddress, setAnchor, appendSystem, resetNavigateGuard, doNavigate],
  );

  const handleUseCurrentLocationForAnchor = useCallback(async () => {
    if (!awaitingAddress || !currentLocation) return;
    handleAddressSelected({
      location: currentLocation,
      address: address ?? 'Current location',
      name: address ?? 'Current location',
    });
  }, [awaitingAddress, currentLocation, address, handleAddressSelected]);

  const handleConfirmThenNavigate = useCallback(() => {
    confirmCurrentIntent();
    doNavigate(entities, currentLocation);
  }, [confirmCurrentIntent, doNavigate, entities, currentLocation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border.default }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Multi-Stop Route</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.emptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
                Describe your trip
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.text.secondary }]}>
                Try: "Take me home with Starbucks and Walmart on the way"
              </Text>
            </Animated.View>
          )}

          {messages.map((message, index) => (
            <AnimatedMessage
              key={message.id}
              message={message}
              index={index}
              showTimestamp
            />
          ))}

          {awaitingAddress && (
            <AddressInputBubble
              anchorType={awaitingAddress.anchorType}
              onAddressSelected={handleAddressSelected}
              onUseCurrentLocation={handleUseCurrentLocationForAnchor}
            />
          )}

          {isLoading && (
            <View style={styles.thinkingContainer}>
              <ThinkingBubble
                message={
                  processingPhase === 'understanding'
                    ? 'Understanding your request...'
                    : processingPhase === 'planning_route'
                      ? 'Finding the best stops and route...'
                      : undefined
                }
              />
            </View>
          )}
        </ScrollView>

        {/* Text Input */}
        <View style={[styles.inputArea, { backgroundColor: colors.surface.card, borderTopColor: colors.border.default }]}>
          <UserInputField
            onSend={handleSend}
            onVoicePress={() => {}}
            onVoiceRelease={() => {}}
            isLoading={isLoading}
            showVoiceButton={false}
            placeholder="Type your request..."
            disableWrapperPadding
          />
        </View>
      </SafeAreaView>

      <ConfirmationDialog
        visible={shouldShowConfirmation()}
        title="I think you want to:"
        entities={entitiesToConfirmation(entities)}
        confidence={undefined}
        onConfirm={handleConfirmThenNavigate}
        onRephrase={rejectAndRephrase}
      />

      <AlternativesDialog
        visible={shouldShowAlternatives()}
        alternatives={DEFAULT_ALTERNATIVES}
        onSelect={(alt) => {
          selectAlternative(alt.intent ?? alt.id);
          if (alt.intent === 'find_place') {
            appendSystem('What place are you looking for?');
          } else if (alt.intent === 'set_destination') {
            appendSystem('Where would you like to go?');
          }
        }}
        onRephrase={rejectAndRephrase}
        onDismiss={rejectAndRephrase}
      />

      <RouteOptionsSheet
        visible={showRouteOptions}
        options={routeOptions}
        onSelect={handleRouteOptionSelect}
        onDismiss={handleRouteOptionsDismiss}
        destinationName={routeDestinationName ?? undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.base,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  emptySubtext: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    maxWidth: 300,
  },
  thinkingContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  inputArea: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
});
