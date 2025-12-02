import { Stack } from 'expo-router';

export default function HarvestsLayout() {
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
          title: 'Inventory',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Harvest Details',
        }}
      />
    </Stack>
  );
}



