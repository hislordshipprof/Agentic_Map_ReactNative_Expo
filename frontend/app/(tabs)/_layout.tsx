/**
 * Tab Layout - 5-tab navigation with center mic FAB
 *
 * Tabs: Home, Saved, [Mic FAB], History, More
 * Light tab bar with teal active color.
 */

import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/theme/useThemeColors';
import { MicFABTabButton } from '@/components/Navigation';

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
};

function TabIcon({ name, color, size }: TabIconProps): JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout(): JSX.Element {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabBar.active,
        tabBarInactiveTintColor: colors.tabBar.inactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar.background,
          borderTopWidth: 1,
          borderTopColor: colors.tabBar.border,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="heart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="mic"
        options={{
          title: '',
          tabBarIcon: () => <MicFABTabButton />,
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            // Prevent default tab behavior; FAB handles its own navigation
            e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="ellipsis-horizontal" color={color} size={size} />
          ),
        }}
      />
      {/* Hide legacy route tab from tab bar */}
      <Tabs.Screen
        name="route"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
