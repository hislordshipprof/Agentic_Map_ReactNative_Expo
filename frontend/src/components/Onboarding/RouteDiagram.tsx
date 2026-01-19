/** Horizontal route diagram: line + nodes (Start, Starbucks, Walmart, End) with pulse. */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Spacing } from '@/theme';

const NODES: { icon: keyof typeof Ionicons.glyphMap; color: string; label?: string }[] = [
  { icon: 'locate', color: Colors.primary.blue, label: undefined },
  { icon: 'cafe-outline', color: Colors.semantic.success, label: 'Starbucks' },
  { icon: 'cart-outline', color: Colors.semantic.warning, label: 'Walmart' },
  { icon: 'flag', color: '#A855F7', label: undefined },
];

const NODE_SIZE = 40;
const ICON_SIZE = 20;

export const RouteDiagram: React.FC = () => {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View entering={FadeIn.duration(450).delay(300)} style={styles.container}>
      <View style={styles.lineWrap}>
        <View style={[styles.segment, { backgroundColor: Colors.primary.blue }]} />
        <View style={[styles.segment, { backgroundColor: Colors.semantic.success }]} />
        <View style={[styles.segment, { backgroundColor: Colors.primary.blue }]} />
      </View>
      <View style={styles.nodes}>
        {NODES.map((n, i) => (
          <Animated.View
            key={i}
            entering={FadeInUp.duration(350).delay(350 + i * 60)}
            style={styles.nodeWrap}
          >
            <Animated.View
              style={[
                styles.node,
                pulseStyle,
                { backgroundColor: n.color, width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2 },
              ]}
            >
              <Ionicons name={n.icon} size={ICON_SIZE} color="#FFF" />
            </Animated.View>
            {n.label ? <Text style={styles.label}>{n.label}</Text> : null}
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: Spacing.lg,
  },
  lineWrap: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    height: 4,
    marginBottom: Spacing.sm,
  },
  segment: {
    flex: 1,
    borderRadius: 2,
  },
  nodes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  nodeWrap: {
    alignItems: 'center',
  },
  node: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  label: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.secondary,
    marginTop: Spacing.xs,
  },
});
