/**
 * Text Chat Screen - Conversational Route Planning
 *
 * Extracted from the original (tabs)/index.tsx conversation interface.
 * Full NLU flow with text input, conversation messages, and route planning.
 *
 * Uses pastel gradient background and theme-aware chat components.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedMessage } from '@/components/Conversation';
import type { Message } from '@/components/Conversation';
import { useNLUFlow, useLocation, useNavigateWithStops, useUserAnchors } from '@/hooks';
import { ProcessingTimeline } from '@/components/Chat/ProcessingTimeline';
import { RoutePlanningFlow } from '@/components/Chat/RoutePlanningFlow';
import { RouteResultCard } from '@/components/Chat/RouteResultCard';
import { UserInputField } from '@/components/Input';
import { ConfirmationDialog, AlternativesDialog, DEFAULT_ALTERNATIVES } from '@/components/Dialogs';
import { AddressInputBubble } from '@/components/Chat/AddressInputBubble';
import { SuggestionMessage } from '@/components/Chat/SuggestionMessage';
import { errandApi, checkBackendConnectivity, userApi } from '@/services/api';
import { useThemeColors } from '@/theme/useThemeColors';
import { Spacing, FontFamily, FontSize } from '@/theme';
import type { Entities } from '@/types/nlu';
import { isNavigationIntent } from '@/types/nlu';
import type { AnchorType } from '@/types/user';
import type { Route, RouteOption } from '@/types/route';
import type { DestinationSuggestion } from '@/types/api';

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
    locationError,
    isLoading: locationLoading,
  } = useLocation();

  const { setAnchor } = useUserAnchors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'understanding' | 'planning_route'>('idle');
  const escalationInProgressRef = useRef(false);
  const navigationInProgressRef = useRef(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [awaitingAddress, setAwaitingAddress] = useState<{
    anchorType: string;
    pendingEntities: Entities;
    pendingOrigin: { lat: number; lng: number };
  } | null>(null);
  const [routeResult, setRouteResult] = useState<{
    route?: Route;
    routeOptions?: RouteOption[];
    destinationName?: string;
  } | null>(null);
  const [suggestionState, setSuggestionState] = useState<{
    suggestions: DestinationSuggestion[];
    pendingEntities: Entities;
  } | null>(null);

  // Auto-scroll to bottom when messages change or loading state changes
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, processingPhase, routeResult, suggestionState, scrollToBottom]);

  // Re-scroll periodically during loading to catch timeline growth
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(scrollToBottom, 1200);
    return () => clearInterval(interval);
  }, [isLoading, scrollToBottom]);

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

  const handleSuggestions = useCallback(
    (suggestions: DestinationSuggestion[], pendingEntities: Entities) => {
      setSuggestionState({ suggestions, pendingEntities });
    },
    [],
  );

  const {
    doNavigate,
    resetNavigateGuard,
    handleRouteOptionSelect,
  } = useNavigateWithStops({
    onSystemMessage: appendSystem,
    onAnchorNotSet: handleAnchorNotSet,
    onSuggestions: handleSuggestions,
    autoNavigate: false,
  });

  // Conversational response — also reset loading since no navigation will happen
  useEffect(() => {
    if (flowState === 'conversational' && lastMessage) {
      appendSystem(lastMessage);
      setProcessingPhase('idle');
      setIsLoading(false);
    }
  }, [flowState, lastMessage, appendSystem]);

  // Non-navigation flows (confirmation/alternatives dialogs) — reset loading
  useEffect(() => {
    if (flowState === 'confirmation_required' || flowState === 'alternatives_required') {
      setProcessingPhase('idle');
      setIsLoading(false);
    }
  }, [flowState]);

  // HIGH confidence: navigate (handles navigate_with_stops, navigate_direct, modify_route)
  useEffect(() => {
    if (flowState !== 'high_confidence') {
      navigationInProgressRef.current = false;
      return;
    }
    if (!intent || !isNavigationIntent(intent) || !entities.destination) {
      // Non-navigation high confidence (e.g. set_anchor) — reset loading
      setProcessingPhase('idle');
      setIsLoading(false);
      return;
    }
    if (navigationInProgressRef.current) return;
    navigationInProgressRef.current = true;
    setProcessingPhase('planning_route');
    setIsLoading(true);
    doNavigate(entities, currentLocation).then((result) => {
      if (result.success) {
        setRouteResult({
          route: result.route,
          routeOptions: result.routeOptions,
          destinationName: result.destinationName,
        });
      }
    }).finally(() => {
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
        if (res.success && res.data) {
          onNLUResponse(res.data);
          // onNLUResponse will set flowState → appropriate effects handle loading
        } else {
          appendSystem(res.error?.message ?? 'Escalation failed.');
          setProcessingPhase('idle');
          setIsLoading(false);
        }
      })
      .catch((e) => {
        appendSystem(e instanceof Error ? e.message : 'Escalation failed.');
        setProcessingPhase('idle');
        setIsLoading(false);
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
      navigationInProgressRef.current = false;
      setRouteResult(null);
      setSuggestionState(null);
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
        // Don't reset loading here — flow-specific effects handle transitions:
        // - high_confidence + navigation → planning_route effect
        // - conversational → conversational effect
        // - confirmation/alternatives → dialog effect
      } catch (e) {
        appendSystem(e instanceof Error ? e.message : 'Something went wrong.');
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
        const navResult = await doNavigate(pending.pendingEntities, pending.pendingOrigin);
        if (navResult.success) {
          setRouteResult({
            route: navResult.route,
            routeOptions: navResult.routeOptions,
            destinationName: navResult.destinationName,
          });
        }
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

  const handleSuggestionTap = useCallback(
    (suggestion: DestinationSuggestion) => {
      if (!suggestionState) return;
      setSuggestionState(null);
      appendSystem(`Selected: ${suggestion.name}`);
      resetNavigateGuard();
      navigationInProgressRef.current = false;
      setProcessingPhase('planning_route');
      setIsLoading(true);
      const updatedEntities: Entities = {
        ...suggestionState.pendingEntities,
        destination: suggestion.name,
        selectedPlaceId: suggestion.placeId,
      };
      doNavigate(updatedEntities, currentLocation).then((result) => {
        if (result.success) {
          setRouteResult({
            route: result.route,
            routeOptions: result.routeOptions,
            destinationName: result.destinationName,
          });
        }
      }).finally(() => {
        setProcessingPhase('idle');
        setIsLoading(false);
      });
    },
    [suggestionState, appendSystem, resetNavigateGuard, doNavigate, currentLocation],
  );

  const handleConfirmThenNavigate = useCallback(() => {
    confirmCurrentIntent();
    setProcessingPhase('planning_route');
    setIsLoading(true);
    doNavigate(entities, currentLocation).then((result) => {
      if (result.success) {
        setRouteResult({
          route: result.route,
          routeOptions: result.routeOptions,
          destinationName: result.destinationName,
        });
      }
    }).finally(() => {
      setProcessingPhase('idle');
      setIsLoading(false);
    });
  }, [confirmCurrentIntent, doNavigate, entities, currentLocation]);

  return (
    <View style={styles.container}>
      {/* Main background: white → soft pink */}
      <LinearGradient
        colors={['#FFFFFF', '#FAFBFC', '#F8F4F6', '#F8EEF2', '#FCE8EE']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Top cyan/mint gradient overlay */}
      <LinearGradient
        colors={['#E0F7FA', '#E8F5F7', 'transparent']}
        locations={[0, 0.4, 1]}
        style={styles.topGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={[styles.headerRow, { borderBottomColor: colors.border.default }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Multi-Stop Route</Text>
          <View style={{ width: 44 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
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
              colors={colors}
            />
          ))}

          {awaitingAddress && (
            <AddressInputBubble
              anchorType={awaitingAddress.anchorType}
              onAddressSelected={handleAddressSelected}
              onUseCurrentLocation={handleUseCurrentLocationForAnchor}
            />
          )}

          {suggestionState && !isLoading && (
            <SuggestionMessage
              suggestions={suggestionState.suggestions}
              onSelect={handleSuggestionTap}
              colors={colors}
            />
          )}

          {isLoading && processingPhase === 'understanding' && (
            <ProcessingTimeline
              mode="understanding"
              colors={colors}
            />
          )}

          {isLoading && processingPhase === 'planning_route' && (
            <RoutePlanningFlow entities={entities} colors={colors} />
          )}

          {routeResult && !isLoading && (
            <RouteResultCard
              route={routeResult.route}
              routeOptions={routeResult.routeOptions}
              destinationName={routeResult.destinationName}
              colors={colors}
              onNavigate={(option) => {
                if (option) handleRouteOptionSelect(option);
                router.push('/route-display');
              }}
              onAdjust={() => {
                router.push('/route-display');
              }}
            />
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
            colors={colors}
          />
        </View>
        </KeyboardAvoidingView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    zIndex: 0,
  },
  safeArea: { flex: 1 },
  keyboardAvoid: { flex: 1 },
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
  inputArea: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
});
