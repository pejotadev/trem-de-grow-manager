import React from 'react';
import { Stack } from 'expo-router';

export default function PatientsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0288D1', // Medical blue
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
          title: 'Patients',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Register Patient',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Patient Details',
        }}
      />
    </Stack>
  );
}







