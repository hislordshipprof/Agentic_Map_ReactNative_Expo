import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedMessage } from '@/components/Conversation';
import { ConfidenceIndicator, StatusBadge } from '@/components/Common';
import { Colors, TextStyles, Spacing, Layout } from '@/theme';
import type { Message } from '@/components/Conversation';
import type { DetourStatus } from '@/theme/colors';

/**
 * Main Conversation Screen
 * This is where users interact with the errand routing system via natural language.
 *
 * Per requirements-frontend.md Phase 1.1:
 * - Displays conversation between user and system
 * - User messages on right, system messages on left
 * - Auto-scroll to latest message
 * - Stores conversation in Redux state
 */
export default function ConversationScreen(): JSX.Element {
  // Demo messages
  const demoMessages: Message[] = [
    {
      id: '1',
      sender: 'system',
      text: 'Hi! Where would you like to go today?',
      timestamp: Date.now() - 10000,
    },
    {
      id: '2',
      sender: 'user',
      text: 'Take me home via Starbucks and Walmart',
      timestamp: Date.now() - 8000,
    },
    {
      id: '3',
      sender: 'system',
      text: 'Perfect! Both stops are on your way. Route: Current → Starbucks (2.1 mi) → Walmart (7.8 mi) → Home',
      timestamp: Date.now() - 5000,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agentic Map</Text>
        <Text style={styles.headerSubtitle}>Plan your journey with stops</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Demo Section: Theme Showcase */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ New Design System</Text>
          
          {/* Confidence Indicators */}
          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Confidence Indicators:</Text>
            <View style={styles.demoRow}>
              <ConfidenceIndicator confidence={0.95} showValue showLabel size="medium" />
            </View>
            <View style={styles.demoRow}>
              <ConfidenceIndicator confidence={0.72} showValue showLabel size="medium" />
            </View>
            <View style={styles.demoRow}>
              <ConfidenceIndicator confidence={0.45} showValue showLabel size="medium" />
            </View>
          </View>

          {/* Status Badges */}
          <View style={styles.demoCard}>
            <Text style={styles.demoLabel}>Stop Status Badges:</Text>
            <View style={styles.demoRow}>
              <StatusBadge status="NO_DETOUR" showLabel />
              <StatusBadge status="MINIMAL" showLabel />
            </View>
            <View style={styles.demoRow}>
              <StatusBadge status="ACCEPTABLE" showLabel />
              <StatusBadge status="NOT_RECOMMENDED" showLabel />
            </View>
          </View>
        </View>

        {/* Demo Section: Conversation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Conversation UI</Text>
          {demoMessages.map((message, index) => (
            <AnimatedMessage 
              key={message.id}
              message={message}
              index={index}
              showTimestamp
            />
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🎨 Design Features</Text>
          <Text style={styles.infoText}>
            • DM Sans typography (modern & readable){'\n'}
            • Map-inspired color palette{'\n'}
            • Smooth animations (60 FPS){'\n'}
            • Confidence-based visual feedback{'\n'}
            • Status-coded stop indicators
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🚀 Next Steps</Text>
          <Text style={styles.infoText}>
            Phase 1: Conversation UI Components{'\n'}
            Phase 2: Confidence-Based Flows{'\n'}
            Phase 3: Route Display & Maps{'\n'}
            Phase 4: Authentication & Onboarding
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ui.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.ui.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ui.border,
  },
  headerTitle: {
    ...TextStyles.h2,
    color: Colors.ui.text.primary,
  },
  headerSubtitle: {
    ...TextStyles.bodySmall,
    color: Colors.ui.text.secondary,
    marginTop: Spacing.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing['3xl'],
  },
  section: {
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    ...TextStyles.h3,
    color: Colors.ui.text.primary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  demoCard: {
    backgroundColor: Colors.ui.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderRadius: Layout.radiusLarge,
    gap: Spacing.md,
  },
  demoLabel: {
    ...TextStyles.label,
    color: Colors.ui.text.secondary,
  },
  demoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: ColorUtils.withAlpha(Colors.primary.lightBlue, 0.3),
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.base,
    padding: Spacing.base,
    borderRadius: Layout.radiusLarge,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.blue,
  },
  infoTitle: {
    ...TextStyles.h4,
    color: Colors.primary.darkBlue,
    marginBottom: Spacing.sm,
  },
  infoText: {
    ...TextStyles.bodySmall,
    color: Colors.ui.text.primary,
    lineHeight: 20,
  },
});
