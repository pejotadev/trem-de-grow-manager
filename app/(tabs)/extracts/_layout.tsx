import React from 'react';
import { Stack } from 'expo-router';

export default function ExtractsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FF5722', // Orange for extracts
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
          title: 'Extracts',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Create Extract',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Extract Details',
        }}
      />
    </Stack>
  );
}




