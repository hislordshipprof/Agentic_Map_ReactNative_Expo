/**
 * Main Conversation Screen - Agentic Mobile Map
 *
 * Beautiful dark theme conversation interface inspired by modern AI assistants.
 * Features teal glow effects, glassmorphism cards, and smooth animations.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

// Components
import { AnimatedMessage } from '@/components/Conversation';
import {
  GlassCard,
  ThinkingBubble,
} from '@/components/Common';
import { UserInputField } from '@/components/Input';

// Theme
import {
  Colors,
  Spacing,
  FontFamily,
  FontSize,
} from '@/theme';

// Types
import type { Message } from '@/components/Conversation';

/**
 * Quick action suggestions - pill style chips
 */
const quickActions = [
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
export default function ConversationScreen(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Handle sending a message
  const handleSend = useCallback((text: string) => {
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const systemMessage: Message = {
        id: `system_${Date.now()}`,
        sender: 'system',
        text: getAIResponse(text),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemMessage]);
      setIsLoading(false);
    }, 1500);
  }, []);

  // Handle quick action
  const handleQuickAction = useCallback((action: string) => {
    handleSend(action);
  }, [handleSend]);

  // Handle voice press (placeholder - to be implemented in Phase 4)
  const handleVoicePress = useCallback(() => {
    setIsRecording(true);
  }, []);

  const handleVoiceRelease = useCallback(() => {
    setIsRecording(false);
  }, []);

  // Simple AI response simulation
  const getAIResponse = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('home')) {
      return "I'll get you home! Would you like to add any stops on the way?";
    }
    if (lower.includes('coffee') || lower.includes('starbucks')) {
      return "Found 3 coffee shops on your route. The closest is Starbucks (0.4 mi detour).";
    }
    if (lower.includes('gas')) {
      return "There's a Shell station just 0.2 miles off your route. Should I add it?";
    }
    if (lower.includes('route') || lower.includes('stop')) {
      return "I can help you plan an efficient route with multiple stops. Where are you heading?";
    }
    return "I can help you plan your journey. Try saying 'Take me home via Starbucks' or tap a suggestion below.";
  };

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
                    onPress={() => handleQuickAction(action.label)}
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
              <ThinkingBubble />
            </View>
          )}
        </ScrollView>

        {/* Input Field */}
        <UserInputField
          onSend={handleSend}
          onVoicePress={handleVoicePress}
          onVoiceRelease={handleVoiceRelease}
          isLoading={isLoading}
          isRecording={isRecording}
          showVoiceButton
          placeholder="Type a message..."
        />
      </SafeAreaView>
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
});
