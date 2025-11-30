import React from 'react';
import { Stack } from 'expo-router';

export default function FriendsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Friends',
        }}
      />
      <Stack.Screen
        name="search"
        options={{
          title: 'Find Friends',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Friend Profile',
        }}
      />
      <Stack.Screen
        name="plant"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}

