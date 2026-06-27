import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';


export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: 'black' },
        tabBarActiveTintColor: 'white',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Geminiと会話',
          tabBarIcon: ({ color }) => <Ionicons name="logo-google" size={24} color={color} />,
        }}
      />
      {/* <Tabs.Screen
        name="settings"
        options={{
          title: '設定',
          tabBarIcon: ({ color }) => <Ionicons name="settings" size={24} color={color} />,
        }}
      /> */}
    </Tabs>
  );
}
