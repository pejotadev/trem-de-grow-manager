import { Stack } from 'expo-router';

export default function EnvironmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Environments' }} />
      <Stack.Screen name="new" options={{ title: 'New Environment' }} />
      <Stack.Screen name="[id]" options={{ title: 'Environment Details' }} />
    </Stack>
  );
}








