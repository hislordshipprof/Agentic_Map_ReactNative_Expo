/**
 * Voice Assistant Screen - Full-screen voice interaction
 *
 * Header + chat area + processing states + VoiceBottomBar.
 * Uses useUnifiedVoice, useNLUFlow, useNavigateWithStops.
 *
 * Key features:
 * - AI messages stream with typewriter effect
 * - Planning indicator only shows during actual route planning
 * - User speaking indicator while VAD detects voice
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';
import { VoiceChatBubble } from '@/components/VoiceAssistant/VoiceChatBubble';
import { StreamingChatBubble } from '@/components/VoiceAssistant/StreamingChatBubble';
import { VoiceBottomBar } from '@/components/VoiceAssistant/VoiceBottomBar';
import { ProcessingIndicator } from '@/components/VoiceAssistant/ProcessingIndicator';
import { RoutePlanningFlow } from '@/components/Chat/RoutePlanningFlow';
import { useUnifiedVoice, useNLUFlow, useLocation, useNavigateWithStops, useChatSession } from '@/hooks';

export default function VoiceAssistantScreen(): JSX.Element {
  const router = useRouter();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);

  const {
    status: voiceStatus,
    transcript: voiceTranscript,
    partialTranscript,
    audioLevel,
    suggestedResponse,
    voiceRoute,
    voiceBackend,
    agentMessage,
    isPlanning,
    isUserSpeaking,
    planningData,
    handleMicPress,
    handleConfirm: handleVoiceConfirmBase,
    handleReject: handleVoiceReject,
  } = useUnifiedVoice();

  const {
    flowState,
    intent,
    entities,
    processUtterance,
    lastMessage,
  } = useNLUFlow();

  const { currentLocation } = useLocation();

  const { messages, addMessage, updateRouteMetadata } = useChatSession('voice');
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'thinking' | 'optimizing'>('idle');
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const lastAgentMessageRef = useRef<string>('');
  const streamingMessageRef = useRef<string>('');

  // Planning animation lifecycle: keep visible until animation completes
  const [showPlanningUI, setShowPlanningUI] = useState(false);
  const [snapshotPlanningData, setSnapshotPlanningData] = useState<typeof planningData>(null);
  const planningAnimDoneRef = useRef(false);
  const planningBackendDoneRef = useRef(false);

  const appendSystem = useCallback((text: string) => {
    addMessage('system', text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [addMessage]);

  const appendUser = useCallback((text: string) => {
    addMessage('user', text);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [addMessage]);

  const {
    doNavigate,
    resetNavigateGuard,
  } = useNavigateWithStops({ onSystemMessage: appendSystem });

  // Track route metadata when voiceRoute arrives
  const lastTrackedRouteRef = useRef<typeof voiceRoute>(null);
  useEffect(() => {
    if (voiceRoute && voiceRoute !== lastTrackedRouteRef.current) {
      lastTrackedRouteRef.current = voiceRoute;
      updateRouteMetadata({
        destination: planningData?.destination ?? undefined,
        stops: planningData?.stops,
        totalTimeMin: voiceRoute.totalTime,
      });
    }
  }, [voiceRoute, planningData, updateRouteMetadata]);

  // Planning animation lifecycle: show until both backend + animation finish
  useEffect(() => {
    if (isPlanning && planningData) {
      setShowPlanningUI(true);
      setSnapshotPlanningData(planningData);
      planningAnimDoneRef.current = false;
      planningBackendDoneRef.current = false;
    } else if (!isPlanning && showPlanningUI) {
      planningBackendDoneRef.current = true;
      if (planningAnimDoneRef.current) {
        setShowPlanningUI(false);
        setSnapshotPlanningData(null);
      }
    }
  }, [isPlanning, planningData, showPlanningUI]);

  const handlePlanningComplete = useCallback(() => {
    planningAnimDoneRef.current = true;
    if (planningBackendDoneRef.current) {
      setShowPlanningUI(false);
      setSnapshotPlanningData(null);
    }
  }, []);

  // Handle ElevenLabs agent messages - stream with typewriter effect
  useEffect(() => {
    if (voiceBackend === 'elevenlabs' && agentMessage && agentMessage !== lastAgentMessageRef.current) {
      lastAgentMessageRef.current = agentMessage;
      // Commit any in-flight streaming message before starting new one
      if (streamingMessageRef.current) {
        appendSystem(streamingMessageRef.current);
      }
      streamingMessageRef.current = agentMessage;
      setStreamingMessage(agentMessage);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [agentMessage, voiceBackend, appendSystem]);

  // When streaming completes, move to regular messages
  const handleStreamComplete = useCallback(() => {
    if (streamingMessage) {
      appendSystem(streamingMessage);
      setStreamingMessage('');
      streamingMessageRef.current = '';
    }
  }, [streamingMessage, appendSystem]);

  // For ElevenLabs: user transcript is handled by the hook, add to messages when received
  const lastProcessedTranscript = useRef('');
  useEffect(() => {
    if (voiceBackend === 'elevenlabs') {
      // ElevenLabs: just add user transcript to messages, agent handles everything
      if (voiceTranscript && voiceTranscript !== lastProcessedTranscript.current) {
        lastProcessedTranscript.current = voiceTranscript;
        appendUser(voiceTranscript);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } else {
      // Legacy voice: process through NLU
      if (voiceTranscript && voiceTranscript !== lastProcessedTranscript.current) {
        lastProcessedTranscript.current = voiceTranscript;
        appendUser(voiceTranscript);
        resetNavigateGuard();
        // Don't show "Finding stops" immediately - wait for NLU intent
        setProcessingPhase('thinking');

        const conversationHistory = messages.map((m) => ({
          role: m.sender === 'system' ? 'model' : 'user',
          content: m.text,
        }));

        processUtterance(voiceTranscript, currentLocation ?? undefined, conversationHistory)
          .catch(() => appendSystem('Something went wrong.'))
          .finally(() => setProcessingPhase('idle'));
      }
    }
  }, [voiceTranscript, voiceBackend]);

  // Handle conversational NLU responses (legacy voice only)
  useEffect(() => {
    if (voiceBackend !== 'elevenlabs' && flowState === 'conversational' && lastMessage) {
      appendSystem(lastMessage);
    }
  }, [flowState, lastMessage, appendSystem, voiceBackend]);

  // HIGH confidence: navigate (legacy voice only)
  useEffect(() => {
    if (voiceBackend === 'elevenlabs') return; // ElevenLabs handles navigation via tools

    if (
      flowState !== 'high_confidence' ||
      intent !== 'navigate_with_stops' ||
      !entities.destination
    ) return;
    setProcessingPhase('optimizing');
    doNavigate(entities, currentLocation).finally(() => {
      setProcessingPhase('idle');
    });
  }, [flowState, intent, entities, currentLocation, doNavigate, voiceBackend]);

  // Voice route from ElevenLabs
  const handleVoiceConfirm = useCallback(() => {
    handleVoiceConfirmBase();
    if (voiceRoute) {
      router.push('/route-display');
    }
  }, [handleVoiceConfirmBase, voiceRoute, router]);

  // Determine what processing indicator to show
  const showPlanningIndicator = voiceBackend === 'elevenlabs' ? isPlanning : processingPhase === 'optimizing';
  const showThinkingIndicator = voiceBackend !== 'elevenlabs' && processingPhase === 'thinking';

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
        <View style={[styles.headerRow, { borderBottomColor: colors.border.light }]}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface.elevated }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text.secondary }]}>Voice Assistant</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Chat area */}
        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Initial system bubble - always shown */}
          <VoiceChatBubble
            text="How can I help you?"
            sender="system"
            index={0}
          />

          {messages.map((msg, i) => (
            <VoiceChatBubble
              key={msg.id}
              text={msg.text}
              sender={msg.sender as 'user' | 'system'}
              index={i + 1}
            />
          ))}

          {/* User speaking indicator (ElevenLabs) */}
          {voiceBackend === 'elevenlabs' && isUserSpeaking && voiceStatus === 'listening' && (
            <View style={[styles.speakingContainer, { alignItems: 'flex-end' }]}>
              <View style={[styles.speakingBubble, { backgroundColor: colors.message.user }]}>
                <View style={styles.speakingDots}>
                  <View style={[styles.dot, { backgroundColor: colors.message.userText }]} />
                  <View style={[styles.dot, { backgroundColor: colors.message.userText }]} />
                  <View style={[styles.dot, { backgroundColor: colors.message.userText }]} />
                </View>
              </View>
            </View>
          )}

          {/* Partial transcript preview (legacy voice) */}
          {voiceBackend !== 'elevenlabs' && partialTranscript && voiceStatus === 'listening' && (
            <VoiceChatBubble
              text={partialTranscript}
              sender="user"
              index={messages.length + 1}
            />
          )}

          {/* Streaming AI message with typewriter effect (ElevenLabs) */}
          {voiceBackend === 'elevenlabs' && streamingMessage && (
            <StreamingChatBubble
              text={streamingMessage}
              index={messages.length + 1}
              charsPerSecond={120}
              onComplete={handleStreamComplete}
            />
          )}

          {/* Processing indicators */}
          {voiceBackend === 'elevenlabs' && showPlanningUI && snapshotPlanningData && (
            <View style={styles.planningFlowWrap}>
              <RoutePlanningFlow
                entities={{
                  destination: snapshotPlanningData.destination ?? undefined,
                  stops: snapshotPlanningData.stops,
                }}
                colors={colors}
                onComplete={handlePlanningComplete}
              />
            </View>
          )}
          {voiceBackend === 'elevenlabs' && isPlanning && !showPlanningUI && (
            <ProcessingIndicator message="Planning your route..." />
          )}
          {voiceBackend !== 'elevenlabs' && showPlanningIndicator && (
            <ProcessingIndicator message="Planning your route..." />
          )}
          {showThinkingIndicator && (
            <ProcessingIndicator message="Thinking..." />
          )}

          {/* Action row when confirming */}
          {suggestedResponse && voiceStatus === 'confirming' && (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, { backgroundColor: colors.surface.elevated }]}
                onPress={handleVoiceReject}
              >
                <Text style={[styles.actionButtonText, { color: colors.text.secondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.primaryActionWrapper}
                onPress={handleVoiceConfirm}
              >
                <LinearGradient
                  colors={['#E8B4CB', '#D4BEE4', '#B8D4E8', '#A8E0E8']}
                  locations={[0, 0.35, 0.7, 1]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.primaryAction}
                >
                  <Text style={styles.primaryActionText}>Show Route</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Bottom area with subtle pink gradient */}
      <LinearGradient
        colors={['transparent', 'rgba(232, 180, 203, 0.08)', 'rgba(232, 180, 203, 0.15)']}
        style={styles.bottomGradient}
      >
        <VoiceBottomBar
          status={voiceStatus}
          onMicPress={handleMicPress}
          audioLevel={audioLevel}
        />
      </LinearGradient>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '500',
  },
  chatArea: { flex: 1 },
  chatContent: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  speakingContainer: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  speakingBubble: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 18,
  },
  speakingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
  planningFlowWrap: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
  },
  primaryActionWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryAction: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  primaryActionText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: '#3A3A4A',
  },
  bottomGradient: {
    paddingTop: Spacing.sm,
  },
});
