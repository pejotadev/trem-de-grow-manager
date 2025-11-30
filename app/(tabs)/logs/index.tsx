import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Card } from '../../../components/Card';
import { Ionicons } from '@expo/vector-icons';

export default function LogsScreen() {
  const { t } = useTranslation('logs');
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('title')}</Text>
        <Text style={styles.subtitle}>{t('subtitle')}</Text>

        {/* Plant Activity Logs - NEW */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/logs/plant-log')}>
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#4CAF5020' }]}>
                <Ionicons name="leaf" size={32} color="#4CAF50" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{t('plantActivityLog.title')}</Text>
                <Text style={styles.cardSubtitle}>
                  {t('plantActivityLog.subtitle')}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.scopeBadge}>
                    <Ionicons name="leaf" size={12} color="#4CAF50" />
                    <Text style={styles.scopeText}>{t('plantActivityLog.perPlant')}</Text>
                  </View>
                  <View style={[styles.scopeBadge, styles.newBadge]}>
                    <Text style={styles.newBadgeText}>{t('plantActivityLog.new')}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Legacy Watering Logs */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/logs/watering')}>
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#2196F320' }]}>
                <Ionicons name="water" size={32} color="#2196F3" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{t('quickWateringLog.title')}</Text>
                <Text style={styles.cardSubtitle}>
                  {t('quickWateringLog.subtitle')}
                </Text>
                <View style={styles.scopeBadge}>
                  <Ionicons name="leaf" size={12} color="#4CAF50" />
                  <Text style={styles.scopeText}>{t('quickWateringLog.perPlant')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Environment Logs - Updated */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/logs/environment')}>
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#FF980020' }]}>
                <Ionicons name="thermometer" size={32} color="#FF9800" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{t('environmentLogs.title')}</Text>
                <Text style={styles.cardSubtitle}>
                  {t('environmentLogs.subtitle')}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.scopeBadge}>
                    <Ionicons name="cube" size={12} color="#2E7D32" />
                    <Text style={styles.scopeText}>{t('environmentLogs.perEnvironment')}</Text>
                  </View>
                  <View style={[styles.scopeBadge, { backgroundColor: '#E1BEE7' }]}>
                    <Ionicons name="layers" size={12} color="#7B1FA2" />
                    <Text style={[styles.scopeText, { color: '#7B1FA2' }]}>{t('environmentLogs.bulkUpdates')}</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>{t('aboutLogTypes')}</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="leaf" size={20} color="#4CAF50" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{t('plantActivityLog.title')}</Text>
              <Text style={styles.infoText}>
                {t('plantActivityDescription')}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="water" size={20} color="#2196F3" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{t('quickWateringLog.title')}</Text>
              <Text style={styles.infoText}>
                {t('quickWateringDescription')}
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="thermometer" size={20} color="#FF9800" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{t('environmentLogs.title')}</Text>
              <Text style={styles.infoText}>
                {t('environmentDescription')}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color="#FFC107" />
            <Text style={styles.tipsTitle}>{t('proTips')}</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              {t('tip1', { defaultValue: 'Use Bulk Updates when watering or feeding all plants in an environment with the same solution.' })}
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              {t('tip2', { defaultValue: 'Track pH and EC of your runoff to monitor nutrient uptake and salt buildup.' })}
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              {t('tip3', { defaultValue: 'Log training activities to track how your plants respond to different techniques.' })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    marginVertical: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardText: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  scopeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  newBadge: {
    backgroundColor: '#4CAF50',
  },
  newBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  // Info Section
  infoSection: {
    marginTop: 32,
    marginBottom: 16,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  // Tips Card
  tipsCard: {
    backgroundColor: '#FFFDE7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFF9C4',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F9A825',
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  tipBold: {
    fontWeight: '600',
    color: '#333',
  },
});
