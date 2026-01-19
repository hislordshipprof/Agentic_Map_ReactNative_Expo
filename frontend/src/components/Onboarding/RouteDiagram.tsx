/** Horizontal route diagram: line + nodes (Start, Starbucks, Walmart, End). */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, Spacing } from '@/theme';

const NODES: { icon: keyof typeof Ionicons.glyphMap; color: string; label?: string }[] = [
  { icon: 'locate', color: Colors.primary.blue, label: undefined },
  { icon: 'cafe-outline', color: Colors.semantic.success, label: 'Starbucks' },
  { icon: 'cart-outline', color: Colors.semantic.warning, label: 'Walmart' },
  { icon: 'flag', color: '#A855F7', label: undefined },
];

export const RouteDiagram: React.FC = () => {
  return (
    <Animated.View entering={FadeIn.duration(450).delay(300)} style={styles.container}>
      <View style={styles.lineWrap}>
        <View style={[styles.segment, { backgroundColor: Colors.primary.blue }]} />
        <View style={[styles.segment, { backgroundColor: Colors.semantic.success }]} />
        <View style={[styles.segment, { backgroundColor: Colors.primary.blue }]} />
      </View>
      <View style={styles.nodes}>
        {NODES.map((n, i) => (
          <View key={i} style={styles.nodeWrap}>
            <View style={[styles.node, { backgroundColor: n.color }]}>
              <Ionicons name={n.icon} size={18} color="#FFF" />
            </View>
            {n.label ? <Text style={styles.label}>{n.label}</Text> : null}
          </View>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.secondary,
    marginTop: Spacing.xs,
  },
});
