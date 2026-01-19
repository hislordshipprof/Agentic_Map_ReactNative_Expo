/** Edit stops: reorder, remove, add, replace; Re-optimize / Preview / Done. */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { DraggableStopList } from './DraggableStopList';
import { Colors, Spacing, FontFamily, FontSize } from '@/theme';
import type { Route, RouteStop } from '@/types/route';

export interface AdjustmentModeProps {
  route: Route;
  onReoptimize: () => void;
  onPreview: () => void;
  onDone: () => void;
  onRemove: (stopId: string) => void;
  onReorder: (orderedStops: RouteStop[]) => void;
  onAdd: () => void;
  onReplace: (stopId: string) => void;
  isOptimizing?: boolean;
}

export const AdjustmentMode: React.FC<AdjustmentModeProps> = ({
  route,
  onReoptimize,
  onPreview,
  onDone,
  onRemove,
  onReorder,
  onAdd,
  onReplace,
  isOptimizing = false,
}) => {
  const stops = route.stops;

  return (
    <Animated.View entering={FadeIn.duration(350)} style={styles.root}>
      <Animated.Text entering={FadeInDown.duration(400).delay(50)} style={styles.title}>
        Adjust Your Route
      </Animated.Text>

      <View style={styles.listContainer}>
        <DraggableStopList
          stops={stops}
          onReorder={onReorder}
          onRemove={onRemove}
          onReplace={onReplace}
          style={styles.list}
        />
      </View>

      <Animated.View entering={FadeInUp.delay(200).duration(400)} style={styles.addSection}>
        <Pressable onPress={onAdd} style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}>
          <Ionicons name="add-circle-outline" size={22} color={Colors.primary.teal} />
          <Text style={styles.addButtonText}>Add Another Stop</Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(250).duration(400)} style={styles.footer}>
        <Pressable
          onPress={onReoptimize}
          disabled={isOptimizing}
          style={[styles.reoptimizeBtn, isOptimizing && styles.reoptimizeBtnDisabled]}
        >
          <Ionicons name="refresh" size={18} color={Colors.dark.text.primary} />
          <Text style={styles.reoptimizeText}>{isOptimizing ? 'Optimizing...' : 'Re-optimize'}</Text>
        </Pressable>
        <Pressable onPress={onPreview} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Preview</Text>
        </Pressable>
        <Pressable onPress={onDone} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>Done</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.dark.background },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  listContainer: { flex: 1, minHeight: 0 },
  list: { flex: 1 },
  addSection: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary.teal,
    borderStyle: 'dashed',
  },
  addButtonPressed: { opacity: 0.8 },
  addButtonText: { fontFamily: FontFamily.primary, fontSize: FontSize.base, fontWeight: '600', color: Colors.primary.teal },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  reoptimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    backgroundColor: Colors.primary.teal,
    minHeight: 48,
  },
  reoptimizeBtnDisabled: { opacity: 0.6 },
  reoptimizeText: { fontFamily: FontFamily.primary, fontSize: FontSize.sm, fontWeight: '600', color: Colors.dark.text.primary },
  secondaryBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, minHeight: 48, justifyContent: 'center' },
  secondaryBtnText: { fontFamily: FontFamily.primary, fontSize: FontSize.sm, fontWeight: '500', color: Colors.dark.text.secondary },
});

export default AdjustmentMode;
