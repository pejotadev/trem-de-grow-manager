import React from 'react';
import { Stack } from 'expo-router';

export default function FriendPlantLayout() {
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
        name="[id]"
        options={{
          title: 'Plant Timeline',
        }}
      />
    </Stack>
  );
}



