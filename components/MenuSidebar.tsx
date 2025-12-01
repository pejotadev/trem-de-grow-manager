import React from 'react';
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

interface MenuItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
}

// Main navigation tabs
const MAIN_TABS: MenuItem[] = [
  {
    id: 'plants',
    icon: 'leaf',
    color: '#4CAF50',
    route: '/(tabs)',
  },
  {
    id: 'environments',
    icon: 'cube',
    color: '#2E7D32',
    route: '/(tabs)/environments',
  },
  {
    id: 'logs',
    icon: 'clipboard',
    color: '#1976D2',
    route: '/(tabs)/logs',
  },
  {
    id: 'friends',
    icon: 'people',
    color: '#7B1FA2',
    route: '/(tabs)/friends',
  },
];

// Secondary menu items
const MENU_ITEMS: MenuItem[] = [
  {
    id: 'genetics',
    icon: 'leaf',
    color: '#8BC34A',
    route: '/(tabs)/genetics',
  },
  {
    id: 'inventory',
    icon: 'cube',
    color: '#388E3C',
    route: '/(tabs)/harvests',
  },
  {
    id: 'extracts',
    icon: 'flask',
    color: '#FF5722',
    route: '/(tabs)/extracts',
  },
  {
    id: 'patients',
    icon: 'medkit',
    color: '#0288D1',
    route: '/(tabs)/patients',
  },
  {
    id: 'distributions',
    icon: 'gift',
    color: '#7B1FA2',
    route: '/(tabs)/distributions',
  },
  {
    id: 'protocols',
    icon: 'document-text',
    color: '#009688',
    route: '/(tabs)/admin/documents',
  },
  {
    id: 'reports',
    icon: 'bar-chart',
    color: '#E91E63',
    route: '/(tabs)/admin/reports',
  },
  {
    id: 'auditLog',
    icon: 'time',
    color: '#607D8B',
    route: '/(tabs)/admin/audit-log',
  },
  {
    id: 'profile',
    icon: 'person-circle',
    color: '#4CAF50',
    route: '/(tabs)/profile',
  },
];

interface MenuSidebarProps {
  compact?: boolean;
}

export function MenuSidebar({ compact = false }: MenuSidebarProps) {
  const { t } = useTranslation(['menu', 'auth', 'common']);
  const { userData, logout } = useAuth();
  const router = useRouter();

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
            {MAIN_TABS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItemCompact}
                onPress={() => router.push(item.route as any)}
              >
                <Ionicons name={item.icon} size={24} color={item.color} />
              </TouchableOpacity>
            ))}
            {/* Secondary Menu Items */}
            {MENU_ITEMS.map((item) => (
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
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{t('menu:mainNavigation')}</Text>
          {MAIN_TABS.map((item) => (
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

        {/* Secondary Menu Items */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{t('menu:features')}</Text>
          {MENU_ITEMS.map((item) => (
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

