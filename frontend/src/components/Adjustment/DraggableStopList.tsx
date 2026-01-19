/** Drag-to-reorder stop list with remove/replace actions. */

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';

import { StatusBadge } from '@/components/Common';
import { Colors, Spacing, FontFamily, FontSize, ColorUtils } from '@/theme';
import type { RouteStop } from '@/types/route';
import { formatDistance } from '@/types/route';

export interface DraggableStopListProps {
  stops: RouteStop[];
  onReorder: (stops: RouteStop[]) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string) => void;
  renderStop?: (stop: RouteStop, index: number) => React.ReactNode;
  style?: ViewStyle;
}

export const DraggableStopList: React.FC<DraggableStopListProps> = ({
  stops,
  onReorder,
  onRemove,
  onReplace,
  style,
}) => {
  return (
    <DraggableFlatList<RouteStop>
      data={stops}
      keyExtractor={(s) => s.id}
      onDragEnd={({ data }) => onReorder(data)}
      containerStyle={styles.container}
      style={style}
      contentContainerStyle={styles.content}
      renderItem={({ item, drag, isActive, getIndex }) => {
        const idx = getIndex();
        const order = idx != null ? idx + 1 : item.order ?? 0;
        return (
        <ScaleDecorator activeScale={0.98}>
          <Pressable
            onLongPress={drag}
            delayLongPress={200}
            style={[styles.row, isActive && styles.rowActive]}
          >
            <View style={styles.handle}>
              <Ionicons name="reorder-three" size={20} color={Colors.dark.text.tertiary} />
            </View>
            <View style={styles.main}>
              <View style={[styles.orderBadge, { backgroundColor: ColorUtils.withAlpha(Colors.primary.teal, 0.15) }]}>
                <Text style={styles.orderText}>{order}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <StatusBadge status={item.status} size="small" />
                {item.mileMarker != null && (
                  <Text style={styles.mile}>{formatDistance(item.mileMarker)} from start</Text>
                )}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable onPress={() => onRemove(item.id)} style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                <Ionicons name="trash-outline" size={18} color={Colors.semantic.error} />
              </Pressable>
              <Pressable onPress={() => onReplace(item.id)} style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                <Ionicons name="swap-horizontal-outline" size={18} color={Colors.primary.teal} />
              </Pressable>
            </View>
          </Pressable>
        </ScaleDecorator>
        );
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, paddingBottom: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.effects.glassDark,
    borderRadius: 12,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.effects.glassDarkBorder,
  },
  rowActive: {
    backgroundColor: Colors.dark.elevated,
  },
  handle: {
    width: 36,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  main: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  orderText: { fontFamily: FontFamily.primary, fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary.teal },
  info: { flex: 1 },
  name: { fontFamily: FontFamily.primary, fontSize: FontSize.base, fontWeight: '500', color: Colors.dark.text.primary },
  mile: { fontFamily: FontFamily.primary, fontSize: FontSize.xs, color: Colors.dark.text.tertiary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.xs },
  iconBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.dark.elevated },
  iconBtnPressed: { opacity: 0.7 },
});

export default DraggableStopList;
