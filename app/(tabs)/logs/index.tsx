import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../../components/Card';
import { Ionicons } from '@expo/vector-icons';

export default function LogsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Logs</Text>
        <Text style={styles.subtitle}>Track your growing activities</Text>

        <TouchableOpacity onPress={() => router.push('/(tabs)/logs/watering')}>
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#2196F320' }]}>
                <Ionicons name="water" size={32} color="#2196F3" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Watering Logs</Text>
                <Text style={styles.cardSubtitle}>
                  Track watering schedule and nutrients per plant
                </Text>
                <View style={styles.scopeBadge}>
                  <Ionicons name="leaf" size={12} color="#4CAF50" />
                  <Text style={styles.scopeText}>Per Plant</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </View>
          </Card>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(tabs)/logs/environment')}>
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={[styles.iconContainer, { backgroundColor: '#FF980020' }]}>
                <Ionicons name="thermometer" size={32} color="#FF9800" />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Environment Logs</Text>
                <Text style={styles.cardSubtitle}>
                  Record temperature, humidity, and lighting
                </Text>
                <View style={styles.scopeBadge}>
                  <Ionicons name="cube" size={12} color="#2E7D32" />
                  <Text style={styles.scopeText}>Per Environment</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </View>
          </Card>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#666" />
          <Text style={styles.infoText}>
            Watering logs are tracked per plant, while environment logs apply to all plants in the same environment.
          </Text>
        </View>
      </View>
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
