import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { getPatientsForContext } from '../../../firebase/firestore';
import { Patient, PatientStatus } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type FilterType = 'all' | 'active' | 'inactive' | 'pending';

const STATUS_COLORS: Record<PatientStatus, string> = {
  active: '#4CAF50',
  inactive: '#9E9E9E',
  pending: '#FF9800',
};

const STATUS_LABELS: Record<PatientStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
};

// Mask document number: show only last 4 digits
const maskDocument = (doc: string): string => {
  if (doc.length <= 4) return doc;
  const visible = doc.slice(-4);
  const masked = '*'.repeat(Math.min(doc.length - 4, 7));
  // Format like CPF: ***.***XXX-XX
  if (doc.length >= 11) {
    return `***.***${visible.slice(0, 3)}-${visible.slice(3)}`;
  }
  return `${masked}${visible}`;
};

// Check if prescription is valid
const getPrescriptionStatus = (patient: Patient): { status: 'valid' | 'expired' | 'none'; label: string; color: string } => {
  if (!patient.prescriptionDate) {
    return { status: 'none', label: 'No prescription', color: '#9E9E9E' };
  }
  
  if (!patient.prescriptionExpirationDate) {
    return { status: 'valid', label: 'Valid', color: '#4CAF50' };
  }
  
  const now = Date.now();
  if (patient.prescriptionExpirationDate < now) {
    return { status: 'expired', label: 'Expired', color: '#f44336' };
  }
  
  // Check if expiring soon (within 30 days)
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (patient.prescriptionExpirationDate - now < thirtyDays) {
    return { status: 'valid', label: 'Expiring soon', color: '#FF9800' };
  }
  
  return { status: 'valid', label: 'Valid', color: '#4CAF50' };
};

export default function PatientsScreen() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { userData, currentAssociation } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!userData) {
      setLoading(false);
      return;
    }

    try {
      const patientsData = await getPatientsForContext(userData.uid, currentAssociation?.id);
      setPatients(patientsData);
      applyFilters(patientsData, searchQuery, activeFilter);
    } catch (error: any) {
      console.error('[PatientsScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (data: Patient[], query: string, filter: FilterType) => {
    let result = data;

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(p => p.status === filter);
    }

    // Apply search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.documentNumber.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredPatients(result);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [userData, currentAssociation])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(patients, query, activeFilter);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilters(patients, searchQuery, filter);
  };

  const getFilterCount = (filter: FilterType): number => {
    if (filter === 'all') return patients.length;
    return patients.filter(p => p.status === filter).length;
  };

  const renderPatient = ({ item }: { item: Patient }) => {
    const prescriptionStatus = getPrescriptionStatus(item);

    return (
      <TouchableOpacity onPress={() => router.push(`/(tabs)/patients/${item.id}`)}>
        <Card style={styles.patientCard}>
          <View style={styles.patientHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.patientDocument}>{maskDocument(item.documentNumber)}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
              <Text style={styles.statusText}>{STATUS_LABELS[item.status]}</Text>
            </View>
          </View>

          <View style={styles.patientDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Joined {format(new Date(item.joinDate), 'MMM dd, yyyy')}
              </Text>
            </View>

            {item.medicalCondition && (
              <View style={styles.detailRow}>
                <Ionicons name="medical-outline" size={16} color="#666" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {item.medicalCondition}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="document-text-outline" size={16} color={prescriptionStatus.color} />
              <Text style={[styles.detailText, { color: prescriptionStatus.color }]}>
                Prescription: {prescriptionStatus.label}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading message="Loading patients..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or document..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'active', 'inactive', 'pending'] as FilterType[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.filterTabActive,
            ]}
            onPress={() => handleFilterChange(filter)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)} ({getFilterCount(filter)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {filteredPatients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {patients.length === 0 ? 'No patients registered' : 'No patients match your search'}
            </Text>
            <Text style={styles.emptySubtext}>
              {patients.length === 0
                ? 'Register your first patient to get started'
                : 'Try adjusting your search or filters'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredPatients}
            keyExtractor={(item) => item.id}
            renderItem={renderPatient}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      {/* Add Patient Button */}
      <Button
        title="+ Register Patient"
        onPress={() => router.push('/(tabs)/patients/new')}
        style={styles.addButton}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#0288D1',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  filterTabTextActive: {
    color: '#0288D1',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 16,
  },
  patientCard: {
    marginBottom: 4,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0288D1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  patientDocument: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  patientDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  cardFooter: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  addButton: {
    margin: 16,
    backgroundColor: '#0288D1',
  },
});





