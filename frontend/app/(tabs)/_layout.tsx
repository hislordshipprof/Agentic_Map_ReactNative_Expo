import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type TabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
};

function TabIcon({ name, color, size }: TabIconProps): JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout(): JSX.Element {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="chatbubble-ellipses-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Route',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="map-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
