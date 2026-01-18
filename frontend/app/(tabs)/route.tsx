import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Route Confirmation Screen
 * Displays the optimized route with map visualization and stop details.
 *
 * Per requirements-frontend.md Phase 3.1:
 * - 50% map section with polyline and waypoints
 * - 50% details section with stop breakdown
 * - Action buttons: [Accept & Navigate] [Adjust] [Cancel]
 */
export default function RouteScreen(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Route</Text>
        <Text style={styles.headerSubtitle}>Your optimized journey</Text>
      </View>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>Map will be displayed here</Text>
        <Text style={styles.placeholderSubtext}>Google Maps integration in Phase 3</Text>
      </View>
      <View style={styles.detailsSection}>
        <Text style={styles.placeholderText}>Route details will appear here</Text>
        <Text style={styles.placeholderSubtext}>Stop list, distance, and time</Text>
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
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  placeholderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});
