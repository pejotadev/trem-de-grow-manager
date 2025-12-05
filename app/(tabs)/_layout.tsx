import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Platform, View, StyleSheet } from 'react-native';
import { MenuSidebar } from '../../components/MenuSidebar';
import { useAuth } from '../../contexts/AuthContext';
import { MemberRole } from '../../types';

// Helper to check if a role has access to a tab
const hasAccess = (
  role: MemberRole | undefined, 
  allowedRoles: MemberRole[],
  accountType?: string,
  hasAssociation?: boolean
): boolean => {
  // If user has a role (is in an association), check role-based access
  if (role) {
    return allowedRoles.includes(role);
  }
  
  // If no role but has association (shouldn't happen, but handle gracefully)
  if (hasAssociation) {
    return false; // Should have a role if in association
  }
  
  // Personal account without association: treat as cultivator
  // Cultivators can access: plants, environments, logs, friends, genetics, harvests, extracts, reports
  // But NOT: patients, distributions, protocols, audit log
  if (accountType === 'personal') {
    // Check if the allowed roles include cultivator
    return allowedRoles.includes('cultivator');
  }
  
  // Legacy users or unknown account type: allow all (backward compatibility)
  return true;
};

export default function TabsLayout() {
  const { t } = useTranslation('common');
  const { currentMember, userData } = useAuth();
  const isWeb = Platform.OS === 'web';
  
  // Get user's role from current association membership
  const userRole = currentMember?.role;
  const accountType = userData?.accountType;
  const hasAssociation = !!currentMember;

  // Define which roles can access each visible tab
  // Note: 'volunteer' only sees profile and patients
  // Note: 'patient' sees friends, association, profile
  // Note: Personal accounts (no association) are treated as cultivators
  const canSeePlants = hasAccess(userRole, ['owner', 'admin', 'cultivator'], accountType, hasAssociation);
  const canSeeEnvironments = hasAccess(userRole, ['owner', 'admin', 'cultivator'], accountType, hasAssociation);
  const canSeeLogs = hasAccess(userRole, ['owner', 'admin', 'cultivator'], accountType, hasAssociation);
  const canSeeFriends = hasAccess(userRole, ['owner', 'admin', 'cultivator', 'patient'], accountType, hasAssociation);

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
          // Hide tab for volunteer and patient roles
          href: canSeePlants ? undefined : null,
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
          // Hide tab for volunteer and patient roles
          href: canSeeEnvironments ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plants"
        options={{
          href: null, // Always hidden from tabs (accessed via index)
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: t('tabs.logs'),
          headerShown: false,
          // Hide tab for volunteer and patient roles
          href: canSeeLogs ? undefined : null,
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
          // Hide tab for volunteer role only
          href: canSeeFriends ? undefined : null,
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
