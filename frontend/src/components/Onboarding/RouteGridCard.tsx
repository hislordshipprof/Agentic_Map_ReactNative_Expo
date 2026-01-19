/** Central onboarding card: grid background + blue path + 4 numbered markers. */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Colors, ColorUtils, FontFamily, FontSize, Layout } from '@/theme';

const MARKERS = [
  { n: 1, color: '#5EEAD4', icon: 'paper-plane' as const },
  { n: 2, color: Colors.semantic.success },
  { n: 3, color: Colors.semantic.warning },
  { n: 4, color: '#A855F7' },
];

const GRID_SIZE = 10;
const CELL = 14;

export const RouteGridCard: React.FC = () => {
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i);

  return (
    <Animated.View
      entering={FadeIn.duration(500).delay(220)}
      style={styles.card}
    >
      <View style={styles.grid}>
        {cells.map((i) => (
          <View
            key={i}
            style={[
              styles.cell,
              {
                width: CELL - 1,
                height: CELL - 1,
                borderRightWidth: (i + 1) % GRID_SIZE !== 0 ? 1 : 0,
                borderBottomWidth: i < GRID_SIZE * (GRID_SIZE - 1) ? 1 : 0,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.path}>
        <View style={styles.pathLine} />
        {MARKERS.map((m, i) => (
          <Animated.View
            key={m.n}
            entering={FadeInUp.duration(350).delay(320 + i * 80)}
            style={[styles.marker, { backgroundColor: m.color, left: `${12 + i * 24}%`, top: '40%' }]}
          >
            {m.icon ? (
              <Ionicons name={m.icon} size={14} color="#FFF" />
            ) : (
              <Text style={styles.markerNum}>{m.n}</Text>
            )}
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: '100%',
    aspectRatio: 1.1,
    maxHeight: 280,
    backgroundColor: Colors.effects.glassDark,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
    borderRadius: Layout.radiusLarge,
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    borderColor: ColorUtils.withAlpha(Colors.dark.border, 0.4),
  },
  path: {
    ...StyleSheet.absoluteFillObject,
  },
  pathLine: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '42%',
    height: 4,
    backgroundColor: Colors.primary.teal,
    borderRadius: 2,
  },
  marker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -14,
    marginTop: -14,
  },
  markerNum: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#FFF',
  },
});
