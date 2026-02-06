/**
 * Voice Assistant Screen - Full-screen voice interaction
 *
 * Header + chat area + processing states + VoiceBottomBar.
 * Uses useUnifiedVoice, useNLUFlow, useNavigateWithStops.
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
import { VoiceBottomBar } from '@/components/VoiceAssistant/VoiceBottomBar';
import { ProcessingIndicator } from '@/components/VoiceAssistant/ProcessingIndicator';
import { useUnifiedVoice, useNLUFlow, useLocation, useNavigateWithStops } from '@/hooks';
import type { Message } from '@/components/Conversation';

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

  const [messages, setMessages] = useState<Message[]>([]);
  const [processingPhase, setProcessingPhase] = useState<'idle' | 'finding' | 'optimizing'>('idle');

  const appendSystem = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `sys_${Date.now()}`, sender: 'system', text, timestamp: Date.now() },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const appendUser = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `user_${Date.now()}`, sender: 'user', text, timestamp: Date.now() },
    ]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const {
    doNavigate,
    resetNavigateGuard,
  } = useNavigateWithStops({ onSystemMessage: appendSystem });

  // When voice transcript arrives, add as user message and process
  const lastProcessedTranscript = useRef('');
  useEffect(() => {
    if (voiceTranscript && voiceTranscript !== lastProcessedTranscript.current) {
      lastProcessedTranscript.current = voiceTranscript;
      appendUser(voiceTranscript);
      resetNavigateGuard();
      setProcessingPhase('finding');

      const conversationHistory = messages.map((m) => ({
        role: m.sender === 'system' ? 'model' : 'user',
        content: m.text,
      }));

      processUtterance(voiceTranscript, currentLocation ?? undefined, conversationHistory)
        .catch(() => appendSystem('Something went wrong.'))
        .finally(() => setProcessingPhase('idle'));
    }
  }, [voiceTranscript]);

  // Handle conversational NLU responses
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
    setProcessingPhase('optimizing');
    doNavigate(entities, currentLocation).finally(() => {
      setProcessingPhase('idle');
    });
  }, [flowState, intent, entities, currentLocation, doNavigate]);

  // Voice route from ElevenLabs
  const handleVoiceConfirm = useCallback(() => {
    handleVoiceConfirmBase();
    if (voiceRoute) {
      router.push('/route-display');
    }
  }, [handleVoiceConfirmBase, voiceRoute, router]);

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

          {/* Partial transcript preview */}
          {partialTranscript && voiceStatus === 'listening' && (
            <VoiceChatBubble
              text={partialTranscript}
              sender="user"
              index={messages.length + 1}
            />
          )}

          {/* Processing indicators */}
          {processingPhase === 'finding' && (
            <ProcessingIndicator message="Finding stops..." />
          )}
          {processingPhase === 'optimizing' && (
            <ProcessingIndicator message="Optimizing route..." />
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
