/**
 * More Tab - Settings & Preferences
 *
 * Settings list including dark mode toggle.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/useThemeColors';
import { FontFamily, FontSize, Spacing } from '@/theme';

interface SettingsRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  textColor: string;
  borderColor: string;
  iconColor: string;
}

function SettingsRow({ icon, label, onPress, right, textColor, borderColor, iconColor }: SettingsRowProps) {
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: borderColor }]}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text style={[styles.rowLabel, { color: textColor }]}>{label}</Text>
      </View>
      {right ?? (
        <Ionicons name="chevron-forward" size={20} color={iconColor} />
      )}
    </Pressable>
  );
}

export default function MoreScreen(): JSX.Element {
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text.primary }]}>More</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface.card }]}>
        <SettingsRow
          icon="moon-outline"
          label="Dark Mode"
          textColor={colors.text.primary}
          borderColor={colors.border.default}
          iconColor={colors.text.secondary}
          right={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border.default, true: colors.primary.teal }}
              thumbColor="#FFFFFF"
            />
          }
        />
        <SettingsRow
          icon="person-outline"
          label="Account"
          onPress={() => router.push('/auth/welcome' as never)}
          textColor={colors.text.primary}
          borderColor={colors.border.default}
          iconColor={colors.text.secondary}
        />
        <SettingsRow
          icon="location-outline"
          label="Saved Places"
          onPress={() => router.push('/(tabs)/saved' as never)}
          textColor={colors.text.primary}
          borderColor={colors.border.default}
          iconColor={colors.text.secondary}
        />
        <SettingsRow
          icon="information-circle-outline"
          label="About"
          textColor={colors.text.primary}
          borderColor="transparent"
          iconColor={colors.text.secondary}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  section: {
    marginHorizontal: Spacing.base,
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '500',
  },
});
