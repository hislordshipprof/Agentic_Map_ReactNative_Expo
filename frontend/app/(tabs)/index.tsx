/**
 * Main Conversation Screen - Agentic Mobile Map
 *
 * Beautiful dark theme conversation interface inspired by modern AI assistants.
 * Features teal glow effects, glassmorphism cards, and smooth animations.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Components
import { AnimatedMessage } from '@/components/Conversation';
import type { Message } from '@/components/Conversation';
import { useRoute, useNLUFlow, useLocation, useVoiceInput, useVoiceMode } from '@/hooks';
import { VoiceMicButton, VoiceStatusIndicator, CircularWaveform } from '@/components/Voice';
import {
  GlassCard,
  ThinkingBubble,
} from '@/components/Common';
import { UserInputField } from '@/components/Input';
import { ConfirmationDialog, AlternativesDialog, DEFAULT_ALTERNATIVES } from '@/components/Dialogs';
import { errandApi, checkBackendConnectivity } from '@/services/api';
import type { Entities } from '@/types/nlu';
import type { Route } from '@/types/route';

// Theme
import {
  Colors,
  Spacing,
  FontFamily,
  FontSize,
} from '@/theme';

/**
 * Quick action suggestions - pill style chips
 */
const quickActions = [
  { id: 'demo', label: 'Take me home with Starbucks', icon: 'map-outline' as const },
  { id: '1', label: 'Generate route', icon: 'navigate-outline' as const },
  { id: '2', label: 'Find stops', icon: 'location-outline' as const },
  { id: '3', label: 'Coffee nearby', icon: 'cafe-outline' as const },
  { id: '4', label: 'Get gas', icon: 'car-outline' as const },
];

/**
 * Popular topics - card style suggestions
 */
const popularTopics = [
  {
    id: '1',
    title: 'Multi-stop routes',
    subtitle: 'Plan efficient errands',
    icon: 'git-branch-outline' as const,
  },
  {
    id: '2',
    title: 'Smart suggestions',
    subtitle: 'Stops along your way',
    icon: 'bulb-outline' as const,
  },
];

/**
 * Quick Action Chip Component
 */
const QuickActionChip: React.FC<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}> = ({ label, icon, onPress }) => (
  <Pressable
    style={({ pressed }) => [
      styles.chip,
      pressed && styles.chipPressed,
    ]}
    onPress={onPress}
  >
    <Ionicons name={icon} size={16} color={Colors.primary.tealLight} />
    <Text style={styles.chipText}>{label}</Text>
  </Pressable>
);

/**
 * Topic Card Component
 */
const TopicCard: React.FC<{
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}> = ({ title, subtitle, icon, onPress }) => (
  <Pressable
    style={({ pressed }) => [
      styles.topicCard,
      pressed && styles.topicCardPressed,
    ]}
    onPress={onPress}
  >
    <View style={styles.topicIconContainer}>
      <Ionicons name={icon} size={24} color={Colors.primary.teal} />
    </View>
    <Text style={styles.topicTitle} numberOfLines={2}>{title}</Text>
    <Text style={styles.topicSubtitle} numberOfLines={1}>{subtitle}</Text>
  </Pressable>
);

/**
 * Main Conversation Screen
 */
function entitiesToConfirmation(entities: Entities): { destination?: string; stops?: string[] } {
  return {
    destination: entities.destination,
    stops: entities.stops && entities.stops.length > 0 ? entities.stops : undefined,
  };
}

export default function ConversationScreen(): JSX.Element {
  const router = useRouter();
  const { setPending } = useRoute();
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
  } = useNLUFlow();
  const {
    currentLocation,
    address,
    locationStatus,
    locationError,
    isLoading: locationLoading,
    isFromCache,
  } = useLocation();

  // Voice mode hook
  const {
    status: voiceStatus,
    transcript: voiceTranscript,
    partialTranscript,
    audioLevel,
    isVoiceModeEnabled,
    suggestedResponse,
    toggleVoice,
    handleMicPress,
    handleConfirm: handleVoiceConfirm,
    handleReject: handleVoiceReject,
  } = useVoiceMode();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'understanding' | 'planning_route'>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const navigateDoneRef = useRef(false);
  const escalationInProgressRef = useRef(false);

  const appendSystem = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `system_${Date.now()}`, sender: 'system', text, timestamp: Date.now() },
    ]);
  }, []);

  const doNavigate = useCallback(
    async (ent: Entities, loc: { lat: number; lng: number } | null) => {
      if (navigateDoneRef.current) return;
      if (!loc) {
        appendSystem('Location is needed to plan the route. Please enable location services.');
        return;
      }
      if (!ent.destination) {
        appendSystem('I need a destination to plan your route. Where would you like to go?');
        return;
      }
      navigateDoneRef.current = true;
      try {
        const res = await errandApi.navigateWithStops({
          origin: loc,
          destination: { name: ent.destination },
          stops: (ent.stops || []).map((s) => ({ name: s, category: ent.category })),
        });
        if (!res.success || res.error) {
          navigateDoneRef.current = false;
          appendSystem(res.error?.message ?? 'Could not plan the route. Please try again.');
          return;
        }
        const data = res.data as { route: Route; excludedStops?: unknown[] } | undefined;
        if (!data?.route) {
          navigateDoneRef.current = false;
          appendSystem('No route in response.');
          return;
        }
        setPending(data.route);
        const n = data.route.stops?.length ?? 0;
        const excl = data.excludedStops?.length;
        appendSystem(
          `Route ready. ${n} stop${n !== 1 ? 's' : ''}.${excl ? ` Some stops were excluded: ${excl}.` : ''}`
        );
        router.push('/(tabs)/route');
      } catch (e) {
        navigateDoneRef.current = false;
        appendSystem(e instanceof Error ? e.message : 'Could not plan the route.');
      }
    },
    [appendSystem, setPending, router]
  );

  // HIGH confidence: navigate when we have intent, destination, and location
  useEffect(() => {
    if (
      flowState !== 'high_confidence' ||
      intent !== 'navigate_with_stops' ||
      !entities.destination ||
      navigateDoneRef.current
    ) return;
    setProcessingPhase('planning_route');
    setIsLoading(true);
    doNavigate(entities, currentLocation).finally(() => {
      setProcessingPhase('idle');
      setIsLoading(false);
    });
  }, [flowState, intent, entities, currentLocation, doNavigate]);

  // Escalating: call escalateToLLM
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

  // Once on mount: check if backend is reachable; if not, show how to fix
  const hasCheckedBackendRef = useRef(false);
  useEffect(() => {
    if (hasCheckedBackendRef.current) return;
    hasCheckedBackendRef.current = true;
    checkBackendConnectivity().then(({ ok, baseUrl, error }) => {
      if (ok) return;
      appendSystem(
        `Could not reach the backend at ${baseUrl}. ` +
          'Check: 1) Backend is running (npm run start:dev in backend). ' +
          '2) On a real device, set EXPO_PUBLIC_API_URL in frontend .env to your PC IP, e.g. http://10.0.0.144:3000/api/v1. ' +
          '3) Phone and PC on same WiFi. 4) Firewall allows port 3000. ' +
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
        appendSystem('Getting your location…');
      }

      navigateDoneRef.current = false;
      setProcessingPhase('understanding');
      setIsLoading(true);
      try {
        await processUtterance(text, currentLocation ?? undefined);
      } catch (e) {
        appendSystem(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        setProcessingPhase('idle');
        setIsLoading(false);
      }
    },
    [currentLocation, locationError, locationLoading, processUtterance, appendSystem]
  );

  const handleQuickAction = useCallback((action: string) => {
    handleSend(action);
  }, [handleSend]);

  const handleConfirmThenNavigate = useCallback(() => {
    confirmCurrentIntent();
    doNavigate(entities, currentLocation);
  }, [confirmCurrentIntent, doNavigate, entities, currentLocation]);

  const voiceInput = useVoiceInput({
    onResult: useCallback(
      (transcript: string) => {
        setIsRecording(false);
        if (transcript.trim().length > 0) handleSend(transcript);
      },
      [handleSend]
    ),
    onError: useCallback(
      (error: string) => {
        setIsRecording(false);
        appendSystem(error || 'Voice input failed. Try again.');
      },
      [appendSystem]
    ),
    onPermissionDenied: useCallback(() => {
      setIsRecording(false);
      appendSystem('Microphone access is needed for voice input.');
    }, [appendSystem]),
  });

  const handleVoicePress = useCallback(async () => {
    setIsRecording(true);
    await voiceInput.start();
  }, [voiceInput]);

  const handleVoiceRelease = useCallback(async () => {
    await voiceInput.stop();
  }, [voiceInput]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && isRecording) voiceInput.stop();
    });
    return () => sub.remove();
  }, [isRecording, voiceInput.stop]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background with teal glow at top */}
      <View style={StyleSheet.absoluteFill}>
        {/* Base dark gradient */}
        <LinearGradient
          colors={['#0A1A1F', '#0F1419', '#0F1419']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
        />
        {/* Teal glow at top */}
        <LinearGradient
          colors={['rgba(20, 184, 166, 0.15)', 'rgba(20, 184, 166, 0.05)', 'transparent']}
          style={styles.tealGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header - Large greeting like screenshot */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.header}>
          <Text style={styles.greeting}>Hi there!</Text>
          <Text style={styles.question}>How can I help you?</Text>
          <Text style={styles.assistantReady}>Your smart assistant is ready</Text>
          <View style={styles.locationPill}>
            {/* Status indicator dot */}
            <View
              style={[
                styles.locationStatusDot,
                locationStatus === 'ready' && styles.locationStatusDotReady,
                locationStatus === 'stale' && styles.locationStatusDotStale,
                locationStatus === 'loading' && styles.locationStatusDotLoading,
                (locationStatus === 'error' || locationStatus === 'denied') &&
                  styles.locationStatusDotError,
              ]}
            />
            <Ionicons
              name={locationStatus === 'denied' ? 'location-outline' : 'location'}
              size={14}
              color={
                locationStatus === 'error' || locationStatus === 'denied'
                  ? Colors.semantic.error
                  : locationStatus === 'ready'
                    ? Colors.primary.teal
                    : Colors.dark.text.tertiary
              }
            />
            <Text
              style={[
                styles.locationPillText,
                locationStatus === 'ready' && styles.locationPillReady,
                (locationStatus === 'error' || locationStatus === 'denied') &&
                  styles.locationPillError,
                isFromCache && locationStatus === 'stale' && styles.locationPillStale,
              ]}
              numberOfLines={1}
            >
              {locationStatus === 'denied'
                ? 'Enable location'
                : locationStatus === 'error'
                  ? 'Location unavailable'
                  : locationStatus === 'loading' && !address
                    ? 'Acquiring location...'
                    : address
                      ? locationStatus === 'stale'
                        ? `${address} (updating)`
                        : address
                      : 'Acquiring location...'}
            </Text>
          </View>
        </Animated.View>

        {/* Main Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Empty State / Welcome */}
          {messages.length === 0 && (
            <Animated.View entering={FadeInUp.delay(200).duration(500)}>
              {/* Quick Action Chips */}
              <View style={styles.chipsContainer}>
                {quickActions.map((action) => (
                  <QuickActionChip
                    key={action.id}
                    label={action.label}
                    icon={action.icon}
                    onPress={() => {
                      if (action.id === 'demo') {
                        handleQuickAction('Take me home with Starbucks');
                      } else {
                        handleQuickAction(action.label);
                      }
                    }}
                  />
                ))}
              </View>

              {/* Popular Topics Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Popular topics</Text>
                <Pressable>
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable>
              </View>

              <View style={styles.topicsRow}>
                {popularTopics.map((topic) => (
                  <TopicCard
                    key={topic.id}
                    title={topic.title}
                    subtitle={topic.subtitle}
                    icon={topic.icon}
                    onPress={() => handleQuickAction(topic.title)}
                  />
                ))}
              </View>

              {/* Feature Highlights */}
              <GlassCard variant="accent" style={styles.featureCard}>
                <View style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="flash" size={18} color={Colors.primary.teal} />
                  </View>
                  <Text style={styles.featureText}>Plan routes in 1-2 turns</Text>
                </View>
                <View style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="locate" size={18} color={Colors.primary.teal} />
                  </View>
                  <Text style={styles.featureText}>Smart stop suggestions</Text>
                </View>
                <View style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="time" size={18} color={Colors.primary.teal} />
                  </View>
                  <Text style={styles.featureText}>Minimal detours guaranteed</Text>
                </View>
              </GlassCard>
            </Animated.View>
          )}

          {/* Conversation Messages */}
          {messages.map((message, index) => (
            <AnimatedMessage
              key={message.id}
              message={message}
              index={index}
              showTimestamp
            />
          ))}

          {/* Loading Indicator */}
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

        {/* Input Area - Voice or Text Mode */}
        {isVoiceModeEnabled ? (
          <View style={styles.voiceInputArea}>
            {/* Voice Status Indicator */}
            <VoiceStatusIndicator
              status={voiceStatus}
              transcript={partialTranscript || voiceTranscript}
              suggestedResponse={suggestedResponse ?? undefined}
              audioLevel={audioLevel}
              showBackground={voiceStatus !== 'idle'}
            />

            {/* Circular Waveform around mic button */}
            <View style={styles.micContainer}>
              <CircularWaveform
                isActive={voiceStatus === 'listening'}
                audioLevel={audioLevel}
                size={100}
              />
              <VoiceMicButton
                status={voiceStatus}
                onPress={handleMicPress}
                onConfirm={handleVoiceConfirm}
                onReject={handleVoiceReject}
                size={72}
              />
            </View>

            {/* Mode toggle */}
            <Pressable
              style={styles.modeToggle}
              onPress={toggleVoice}
            >
              <Ionicons name="chatbubble-outline" size={18} color={Colors.dark.text.tertiary} />
              <Text style={styles.modeToggleText}>Switch to text</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.textInputArea}>
            <UserInputField
              onSend={handleSend}
              onVoicePress={handleVoicePress}
              onVoiceRelease={handleVoiceRelease}
              isLoading={isLoading}
              isRecording={isRecording}
              showVoiceButton
              placeholder="Type a message..."
            />
            {/* Voice mode toggle button */}
            <Pressable
              style={styles.voiceModeButton}
              onPress={toggleVoice}
            >
              <Ionicons name="mic" size={20} color={Colors.primary.teal} />
            </Pressable>
          </View>
        )}
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
            appendSystem('What place are you looking for? Try "coffee nearby" or "gas station on the way".');
          } else if (alt.intent === 'set_destination') {
            appendSystem('Where would you like to go? Say an address, a place name, or "home" / "work" if you have them saved.');
          }
        }}
        onRephrase={rejectAndRephrase}
        onDismiss={rejectAndRephrase}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  tealGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  greeting: {
    fontFamily: FontFamily.primary,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.dark.text.primary,
    marginBottom: 4,
  },
  question: {
    fontFamily: FontFamily.primary,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.dark.text.primary,
    marginBottom: Spacing.sm,
  },
  assistantReady: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.primary.teal,
    opacity: 0.8,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
  },
  locationPillText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    maxWidth: 200,
  },
  locationPillReady: {
    color: Colors.dark.text.secondary,
  },
  locationPillError: {
    color: Colors.semantic.error,
  },
  locationPillStale: {
    color: Colors.dark.text.tertiary,
    fontStyle: 'italic',
  },
  locationStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.text.tertiary,
  },
  locationStatusDotReady: {
    backgroundColor: Colors.primary.teal,
  },
  locationStatusDotStale: {
    backgroundColor: '#F59E0B', // Yellow/amber for stale
  },
  locationStatusDotLoading: {
    backgroundColor: Colors.dark.text.tertiary,
  },
  locationStatusDotError: {
    backgroundColor: Colors.semantic.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: Spacing.xs,
  },
  chipPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: Colors.primary.teal,
  },
  chipText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.primary,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  seeAll: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  topicsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  topicCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 120,
  },
  topicCardPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: Colors.primary.teal,
  },
  topicIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  topicTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginBottom: 4,
  },
  topicSubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
  },
  featureCard: {
    marginBottom: Spacing.base,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  featureText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.primary,
  },
  thinkingContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  // Voice input area styles
  voiceInputArea: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.effects.glassDark,
    borderTopWidth: 1,
    borderTopColor: Colors.effects.glassDarkBorder,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
    position: 'relative',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  modeToggleText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  textInputArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceModeButton: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.effects.glassDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary.teal,
  },
});
