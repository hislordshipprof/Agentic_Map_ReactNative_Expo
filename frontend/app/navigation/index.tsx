import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Navigation Screen
 * Active navigation view that would integrate with native maps.
 * This screen is shown after user accepts the route.
 */
export default function NavigationScreen(): JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Navigation Active</Text>
        <Text style={styles.subtitle}>
          Turn-by-turn navigation will be displayed here
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});
