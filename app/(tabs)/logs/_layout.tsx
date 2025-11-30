import { Stack } from 'expo-router';

export default function LogsLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Logs' }} />
      <Stack.Screen name="plant-log" options={{ title: 'Plant Activity Log' }} />
      <Stack.Screen name="watering" options={{ title: 'Quick Watering' }} />
      <Stack.Screen name="environment" options={{ title: 'Environment & Bulk Logs' }} />
    </Stack>
  );
}

