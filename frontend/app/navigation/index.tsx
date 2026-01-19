/**
 * Navigation Screen - Agentic Mobile Map
 *
 * Shown after Accept & Navigate. Uses confirmed route; "Open in Google Maps" to start directions.
 * Per requirements-frontend 3.1.
 */

import { Text, StyleSheet, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { useRoute } from '@/hooks';
import { Colors, Spacing, FontFamily, FontSize } from '@/theme';

function buildGoogleMapsDirUrl(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, stops: Array<{ location: { lat: number; lng: number } }>): string {
  const o = `${origin.lat},${origin.lng}`;
  const d = `${destination.lat},${destination.lng}`;
  const wp = stops.map((s) => `${s.location.lat},${s.location.lng}`).join('|');
  const params = new URLSearchParams({
    api: '1',
    origin: o,
    destination: d,
    ...(wp && { waypoints: wp }),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export default function NavigationScreen(): JSX.Element {
  const { confirmed } = useRoute();

  const handleOpenInMaps = () => {
    if (!confirmed) return;
    const url = buildGoogleMapsDirUrl(
      confirmed.origin.location,
      confirmed.destination.location,
      confirmed.stops
    );
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.inner}>
        <Animated.Text entering={FadeInDown.duration(450).delay(50)} style={styles.title}>
          Navigation Active
        </Animated.Text>
        {confirmed && (
          <Animated.Text entering={FadeInDown.duration(400).delay(80)} style={styles.subtitle}>
            {confirmed.origin.name} → {confirmed.destination.name}
            {confirmed.stops.length > 0 && ` (${confirmed.stops.length} stop${confirmed.stops.length !== 1 ? 's' : ''})`}
          </Animated.Text>
        )}

        <Animated.View entering={FadeInUp.duration(500).delay(150)} style={styles.ctaWrap}>
          <Pressable
            onPress={handleOpenInMaps}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Ionicons name="map" size={22} color={Colors.dark.text.primary} />
            <Text style={styles.ctaText}>Open in Google Maps</Text>
          </Pressable>
        </Animated.View>

        {!confirmed && (
          <Text style={styles.hint}>Accept a route from the Route tab first.</Text>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  inner: {
    flex: 1,
    padding: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.dark.text.primary,
  },
  subtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.secondary,
    marginTop: Spacing.sm,
  },
  ctaWrap: { marginTop: Spacing.xl },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary.teal,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: 16,
    minHeight: 56,
  },
  ctaPressed: { opacity: 0.9 },
  ctaText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  hint: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    marginTop: Spacing.xl,
  },
});
