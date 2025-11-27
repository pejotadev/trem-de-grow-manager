import { Stack } from 'expo-router';

export default function PlantsLayout() {
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
      <Stack.Screen name="new" options={{ title: 'New Plant' }} />
      <Stack.Screen name="[id]" options={{ title: 'Plant Details' }} />
    </Stack>
  );
}

