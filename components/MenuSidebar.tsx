import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { MemberRole } from '../types';

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
  // Roles that can access this item. Empty array means all roles can access.
  allowedRoles?: MemberRole[];
}

// Main navigation tabs
const MAIN_TABS: MenuItem[] = [
  {
    id: 'plants',
    icon: 'leaf',
    color: '#4CAF50',
    route: '/(tabs)',
    allowedRoles: ['owner', 'admin', 'cultivator'], // Not for patient, volunteer
  },
  {
    id: 'environments',
    icon: 'cube',
    color: '#2E7D32',
    route: '/(tabs)/environments',
    allowedRoles: ['owner', 'admin', 'cultivator'], // Not for patient, volunteer
  },
  {
    id: 'logs',
    icon: 'clipboard',
    color: '#1976D2',
    route: '/(tabs)/logs',
    allowedRoles: ['owner', 'admin', 'cultivator'], // Not for patient, volunteer
  },
  {
    id: 'friends',
    icon: 'people',
    color: '#7B1FA2',
    route: '/(tabs)/friends',
    allowedRoles: ['owner', 'admin', 'cultivator', 'patient'], // Not for volunteer
  },
];

// Secondary menu items
const MENU_ITEMS: MenuItem[] = [
  {
    id: 'association',
    icon: 'business',
    color: '#673AB7',
    route: '/(tabs)/association',
    allowedRoles: ['owner', 'admin', 'cultivator', 'patient'], // Not for volunteer
  },
  {
    id: 'genetics',
    icon: 'leaf',
    color: '#8BC34A',
    route: '/(tabs)/genetics',
    allowedRoles: ['owner', 'admin', 'cultivator'], // Not for patient, volunteer
  },
  {
    id: 'inventory',
    icon: 'cube',
    color: '#388E3C',
    route: '/(tabs)/harvests',
    allowedRoles: ['owner', 'admin', 'cultivator'], // Not for patient, volunteer
  },
  {
    id: 'extracts',
    icon: 'flask',
    color: '#FF5722',
    route: '/(tabs)/extracts',
    allowedRoles: ['owner', 'admin', 'cultivator'], // Not for patient, volunteer
  },
  {
    id: 'patients',
    icon: 'medkit',
    color: '#0288D1',
    route: '/(tabs)/patients',
    allowedRoles: ['owner', 'admin', 'volunteer'], // Volunteer can see patients
  },
  {
    id: 'distributions',
    icon: 'gift',
    color: '#7B1FA2',
    route: '/(tabs)/distributions',
    allowedRoles: ['owner', 'admin'], // Only owner and admin
  },
  {
    id: 'protocols',
    icon: 'document-text',
    color: '#009688',
    route: '/(tabs)/admin/documents',
    allowedRoles: ['owner', 'admin'], // Only owner and admin
  },
  {
    id: 'reports',
    icon: 'bar-chart',
    color: '#E91E63',
    route: '/(tabs)/admin/reports',
    allowedRoles: ['owner', 'admin', 'cultivator'], // Not for patient, volunteer
  },
  {
    id: 'auditLog',
    icon: 'time',
    color: '#607D8B',
    route: '/(tabs)/admin/audit-log',
    allowedRoles: ['owner', 'admin'], // Only owner and admin
  },
  {
    id: 'profile',
    icon: 'person-circle',
    color: '#4CAF50',
    route: '/(tabs)/profile',
    // All roles can access profile - no allowedRoles means everyone
  },
];

/**
 * Filters menu items based on user role and account type
 * - If user has a role (in association), filter based on allowedRoles
 * - If personal account without association, treat as cultivator
 * - Legacy users without accountType get all items (backward compatibility)
 */
const filterMenuItemsByRole = (
  items: MenuItem[], 
  role: MemberRole | undefined,
  accountType?: string,
  hasAssociation?: boolean
): MenuItem[] => {
  // If user has a role (is in an association), filter based on role
  if (role) {
    return items.filter(item => {
      // If no allowedRoles specified, all roles can access
      if (!item.allowedRoles || item.allowedRoles.length === 0) {
        return true;
      }
      // Check if user's role is in the allowed list
      return item.allowedRoles.includes(role);
    });
  }
  
  // If no role but has association (shouldn't happen, but handle gracefully)
  if (hasAssociation) {
    return []; // Should have a role if in association
  }
  
  // Personal account without association: treat as cultivator
  // Cultivators can access: plants, environments, logs, friends, genetics, harvests, extracts, reports, profile
  // But NOT: patients, distributions, protocols, audit log
  if (accountType === 'personal') {
    return items.filter(item => {
      // If no allowedRoles specified, allow (like profile)
      if (!item.allowedRoles || item.allowedRoles.length === 0) {
        return true;
      }
      // Check if cultivator is in the allowed list
      return item.allowedRoles.includes('cultivator');
    });
  }
  
  // Legacy users or unknown account type: show all items (backward compatibility)
  return items;
};

interface MenuSidebarProps {
  compact?: boolean;
}

export function MenuSidebar({ compact = false }: MenuSidebarProps) {
  const { t } = useTranslation(['menu', 'auth', 'common']);
  const { userData, currentMember, logout } = useAuth();
  const router = useRouter();

  // Get the user's role from current association membership
  const userRole = currentMember?.role;
  const accountType = userData?.accountType;
  const hasAssociation = !!currentMember;

  // Filter menu items based on role and account type
  const filteredMainTabs = useMemo(() => 
    filterMenuItemsByRole(MAIN_TABS, userRole, accountType, hasAssociation), 
    [userRole, accountType, hasAssociation]
  );
  
  const filteredMenuItems = useMemo(() => 
    filterMenuItemsByRole(MENU_ITEMS, userRole, accountType, hasAssociation), 
    [userRole, accountType, hasAssociation]
  );

  const handleLogout = async () => {
    console.log('[MenuSidebar] Logout button clicked');
    const isWeb = Platform.OS === 'web';
    
    if (isWeb) {
      // On web, use window.confirm as fallback
      const confirmMessage = t('auth:logout.confirmMessage');
      console.log('[MenuSidebar] Web logout, showing confirm dialog');
      
      const confirmed = typeof window !== 'undefined' && window.confirm 
        ? window.confirm(confirmMessage)
        : confirm(confirmMessage);
      
      if (confirmed) {
        console.log('[MenuSidebar] User confirmed logout');
        try {
          await logout();
          console.log('[MenuSidebar] Logout successful');
        } catch (error) {
          console.error('[MenuSidebar] Logout error:', error);
          if (typeof window !== 'undefined' && window.alert) {
            window.alert('Erro ao fazer logout. Por favor, tente novamente.');
          } else {
            alert('Erro ao fazer logout. Por favor, tente novamente.');
          }
        }
      } else {
        console.log('[MenuSidebar] User cancelled logout');
      }
    } else {
      // On mobile, use Alert.alert
      Alert.alert(
        t('auth:logout.title'),
        t('auth:logout.confirmMessage'),
        [
          { text: t('common:cancel'), style: 'cancel' },
          {
            text: t('auth:logout.button'),
            style: 'destructive',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                console.error('Logout error:', error);
                Alert.alert(t('common:error'), 'Erro ao fazer logout. Por favor, tente novamente.');
              }
            },
          },
        ]
      );
    }
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getMenuItemTitle = (id: string): string => {
    return t(`menu:items.${id}.title`);
  };

  const getMenuItemSubtitle = (id: string): string => {
    return t(`menu:items.${id}.subtitle`);
  };

  if (compact) {
    return (
      <View style={styles.sidebarCompact}>
        <ScrollView contentContainerStyle={styles.scrollContentCompact}>
          {/* User Avatar */}
          <TouchableOpacity
            style={styles.avatarContainerCompact}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.avatarTextCompact}>
              {getInitials(userData?.displayName, userData?.email)}
            </Text>
          </TouchableOpacity>

          {/* Main Tabs - Icons Only */}
          <View style={styles.menuSectionCompact}>
            {filteredMainTabs.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItemCompact}
                onPress={() => router.push(item.route as any)}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
              </TouchableOpacity>
            ))}
            {/* Secondary Menu Items */}
            {filteredMenuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItemCompact}
                onPress={() => router.push(item.route as any)}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButtonCompact}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={22} color="#f44336" />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.sidebar}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {getInitials(userData?.displayName, userData?.email)}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {userData?.displayName || t('menu:user')}
            </Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {userData?.email}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="pencil" size={18} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        {/* Main Navigation Tabs */}
        {filteredMainTabs.length > 0 && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{t('menu:mainNavigation')}</Text>
            {filteredMainTabs.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{getMenuItemTitle(item.id)}</Text>
                  <Text style={styles.menuItemSubtitle}>{getMenuItemSubtitle(item.id)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Secondary Menu Items */}
        {filteredMenuItems.length > 0 && (
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{t('menu:features')}</Text>
            {filteredMenuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{getMenuItemTitle(item.id)}</Text>
                  <Text style={styles.menuItemSubtitle}>{getMenuItemSubtitle(item.id)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* App Info */}
        <View style={styles.appInfo}>
          <View style={styles.appLogoContainer}>
            <Ionicons name="leaf" size={32} color="#4CAF50" />
          </View>
          <Text style={styles.appName}>{t('menu:appInfo.title')}</Text>
          <Text style={styles.appVersion}>{t('menu:appInfo.version', { version: '1.0.0' })}</Text>
        </View>
      </ScrollView>
      
      {/* Logout Button - Fixed at bottom */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#f44336" />
          <Text style={styles.logoutText}>{t('auth:logout.button')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full Sidebar Styles
  sidebar: {
    width: 280,
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    height: '100%',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
  },
  // User Header
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Menu Section
  menuSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  // App Info
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appLogoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  appVersion: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  // Logout
  logoutContainer: {
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFEBEE',
    gap: 8,
    cursor: 'pointer',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336',
  },
  // Compact Sidebar Styles (for narrow screens)
  sidebarCompact: {
    width: 80,
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    height: '100%',
  },
  scrollContentCompact: {
    padding: 12,
    alignItems: 'center',
  },
  avatarContainerCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarTextCompact: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  menuSectionCompact: {
    width: '100%',
    gap: 12,
  },
  menuItemCompact: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logoutButtonCompact: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFEBEE',
    marginTop: 'auto',
  },
});

