import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ToastProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  borderColor: string;
  title?: string;
  message?: string;
}

const ToastBase: React.FC<ToastProps> = ({ 
  icon, 
  iconColor, 
  borderColor, 
  title, 
  message 
}) => (
  <View style={[styles.container, { borderLeftColor: borderColor }]}>
    <Ionicons name={icon} size={24} color={iconColor} style={styles.icon} />
    <View style={styles.textContainer}>
      {title && <Text style={styles.title}>{title}</Text>}
      {message && <Text style={styles.message} numberOfLines={3}>{message}</Text>}
    </View>
  </View>
);

export const toastConfig = {
  success: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastBase
      icon="checkmark-circle"
      iconColor="#4CAF50"
      borderColor="#4CAF50"
      title={text1}
      message={text2}
    />
  ),
  error: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastBase
      icon="close-circle"
      iconColor="#f44336"
      borderColor="#f44336"
      title={text1}
      message={text2}
    />
  ),
  info: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastBase
      icon="information-circle"
      iconColor="#2196F3"
      borderColor="#2196F3"
      title={text1}
      message={text2}
    />
  ),
  warning: ({ text1, text2 }: { text1?: string; text2?: string }) => (
    <ToastBase
      icon="warning"
      iconColor="#FF9800"
      borderColor="#FF9800"
      title={text1}
      message={text2}
    />
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    minWidth: 300,
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.15)',
      } as any,
    }),
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});



