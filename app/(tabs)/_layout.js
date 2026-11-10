import React from 'react';
import { Tabs } from 'expo-router';
import { C } from '../../src/components/ui';
import LineIcon from '../../src/components/LineIcon';

const tabIcons = { index: 'home', shop: 'shop', leaderboard: 'rankings', notifications: 'notifications', settings: 'settings' };

export default function TabLayout() {
  return (
    <Tabs
      id="root-tabs"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.gold,
        tabBarInactiveTintColor: '#b2d0f6',
        tabBarStyle: { display:'none', height: 70, paddingTop: 7, paddingBottom: 7, borderTopColor: '#3172bd', backgroundColor: '#063878' },
        tabBarLabelStyle: { fontWeight: '800', fontSize: 11 },
        tabBarIcon: ({ color, size }) => <LineIcon name={tabIcons[route.name]} color={color} size={size + 2} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Rankings' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
