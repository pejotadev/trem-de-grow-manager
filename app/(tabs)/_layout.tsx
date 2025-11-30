import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function TabsLayout() {
  const { t } = useTranslation('common');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.plants'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="leaf" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="environments"
        options={{
          title: t('tabs.environments'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: t('tabs.logs'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="clipboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: t('tabs.friends'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t('tabs.menu'),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden from tabs but accessible via menu */}
      <Tabs.Screen
        name="extracts"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="distributions"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="harvests"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="genetics"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="admin"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
