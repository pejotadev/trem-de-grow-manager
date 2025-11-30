import { Stack } from 'expo-router';

export default function AdminLayout() {
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
        name="audit-log"
        options={{
          title: 'Audit Log',
        }}
      />
      <Stack.Screen
        name="documents"
        options={{
          title: 'Documents & Protocols',
        }}
      />
      <Stack.Screen
        name="documents/new"
        options={{
          title: 'New Document',
        }}
      />
      <Stack.Screen
        name="documents/[id]"
        options={{
          title: 'Document Details',
        }}
      />
      <Stack.Screen
        name="reports"
        options={{
          title: 'Compliance Reports',
        }}
      />
    </Stack>
  );
}

