import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agentic Map</Text>
        <Text style={styles.headerSubtitle}>Plan your journey with stops</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.placeholder}>
          Conversation UI will be implemented in Phase 1
        </Text>
        <Text style={styles.example}>
          Example: "Take me home with Starbucks and Walmart on the way"
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeholder: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  example: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic',
  },
});
