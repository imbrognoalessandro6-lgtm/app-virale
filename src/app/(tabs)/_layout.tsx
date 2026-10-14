import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { useStore } from '../../lib/store';
import { colors } from '../../lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Oggi', icon: 'home' },
  { name: 'movimenti', title: 'Movimenti', icon: 'list' },
  { name: 'scadenze', title: 'Scadenze', icon: 'alarm' },
  { name: 'analisi', title: 'Analisi', icon: 'pie-chart' },
  { name: 'impostazioni', title: 'Impostazioni', icon: 'settings' },
];

export default function TabsLayout() {
  const { data } = useStore();
  if (!data) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} size={size} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
