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
      <Stack.Screen name="watering" options={{ title: 'Watering Logs' }} />
      <Stack.Screen name="environment" options={{ title: 'Environment Logs' }} />
    </Stack>
  );
}

