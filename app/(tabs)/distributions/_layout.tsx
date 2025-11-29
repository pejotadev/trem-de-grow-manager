import React from 'react';
import { Stack } from 'expo-router';

export default function DistributionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#7B1FA2', // Purple for distributions
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
          title: 'Distributions',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'New Distribution',
        }}
      />
      <Stack.Screen
        name="order"
        options={{
          title: 'Create Order',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Distribution Details',
        }}
      />
    </Stack>
  );
}


