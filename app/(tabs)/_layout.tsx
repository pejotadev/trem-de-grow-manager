import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, View, StyleSheet } from 'react-native';
import { MenuSidebar } from '../../components/MenuSidebar';

export default function TabsLayout() {
  const { t } = useTranslation('common');
  const isWeb = Platform.OS === 'web';

  const tabsContent = (
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
        // Hide tab bar on web since we have sidebar
        tabBarStyle: isWeb ? { display: 'none' } : undefined,
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
          // Hide menu tab on web since sidebar is always visible
          href: isWeb ? null : undefined,
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
      <Tabs.Screen
        name="association"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );

  // On web, wrap tabs with sidebar layout
  if (isWeb) {
    return (
      <View style={styles.webContainer}>
        <MenuSidebar />
        <View style={styles.webContent}>
          {tabsContent}
        </View>
      </View>
    );
  }

  // On mobile, return tabs normally
  return tabsContent;
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    flexDirection: 'row',
    height: '100vh',
  },
  webContent: {
    flex: 1,
    overflow: 'hidden',
  },
});
