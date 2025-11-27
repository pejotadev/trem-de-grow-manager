import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { createPlant, createStage, getUserEnvironments, generateControlNumber } from '../../../firebase/firestore';
import { StageName, Environment } from '../../../types';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { Ionicons } from '@expo/vector-icons';

const STAGES: StageName[] = ['Seedling', 'Veg', 'Flower', 'Drying', 'Curing'];

const ENVIRONMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  indoor: 'home',
  outdoor: 'sunny',
  greenhouse: 'leaf',
};

const ENVIRONMENT_COLORS: Record<string, string> = {
  indoor: '#9C27B0',
  outdoor: '#FF9800',
  greenhouse: '#4CAF50',
};

export default function NewPlantScreen() {
  const [name, setName] = useState('');
  const [strain, setStrain] = useState('');
  const [selectedStage, setSelectedStage] = useState<StageName>('Seedling');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  const [envModalVisible, setEnvModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingEnvs, setLoadingEnvs] = useState(true);
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadEnvironments();
  }, [userData]);

  const loadEnvironments = async () => {
    if (!userData) return;
    
    try {
      const userEnvs = await getUserEnvironments(userData.uid);
      setEnvironments(userEnvs);
      if (userEnvs.length > 0) {
        setSelectedEnvironment(userEnvs[0]);
      }
    } catch (error) {
      console.error('[NewPlant] Error loading environments:', error);
      Alert.alert('Error', 'Failed to load environments');
    } finally {
      setLoadingEnvs(false);
    }
  };

  // Preview the next control number
  const getNextControlNumberPreview = (): string => {
    if (!selectedEnvironment) return '---';
    const nextSequence = (selectedEnvironment.plantCounter || 0) + 1;
    return generateControlNumber(selectedEnvironment.name, nextSequence);
  };

  const handleSubmit = async () => {
    if (!name || !strain) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedEnvironment) {
      Alert.alert('Error', 'Please select an environment for this plant');
      return;
    }

    if (!userData) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      console.log('[NewPlant] Creating plant for user:', userData.uid);
      const now = Date.now();
      const plantId = await createPlant({
        userId: userData.uid,
        environmentId: selectedEnvironment.id,
        name,
        strain,
        startDate: now,
        currentStage: selectedStage,
      });
      console.log('[NewPlant] Plant created with ID:', plantId);

      // Create initial stage
      console.log('[NewPlant] Creating initial stage');
      await createStage({
        plantId,
        name: selectedStage,
        startDate: now,
      });
      console.log('[NewPlant] Stage created successfully');

      Alert.alert('Success', 'Plant created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('[NewPlant] Error creating plant:', error);
      Alert.alert('Error', 'Failed to create plant: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingEnvs) {
    return <Loading message="Loading environments..." />;
  }

  if (environments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No environments yet</Text>
          <Text style={styles.emptySubtext}>
            Create an environment first before adding plants
          </Text>
          <Button
            title="Create Environment"
            onPress={() => router.push('/(tabs)/environments/new')}
            style={styles.createEnvButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Environment Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Environment *</Text>
              <TouchableOpacity
                style={styles.envSelector}
                onPress={() => setEnvModalVisible(true)}
              >
                {selectedEnvironment && (
                  <View style={styles.selectedEnv}>
                    <View
                      style={[
                        styles.envIconSmall,
                        { backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment.type] + '20' },
                      ]}
                    >
                      <Ionicons
                        name={ENVIRONMENT_ICONS[selectedEnvironment.type]}
                        size={20}
                        color={ENVIRONMENT_COLORS[selectedEnvironment.type]}
                      />
                    </View>
                    <View style={styles.envSelectorText}>
                      <Text style={styles.envSelectorName}>{selectedEnvironment.name}</Text>
                      <Text style={styles.envSelectorType}>{selectedEnvironment.type}</Text>
                    </View>
                  </View>
                )}
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Auto Control Number Preview */}
            <View style={styles.controlNumberPreview}>
              <View style={styles.controlNumberHeader}>
                <Ionicons name="barcode-outline" size={20} color="#4CAF50" />
                <Text style={styles.controlNumberLabel}>Control Number</Text>
                <View style={styles.autoBadge}>
                  <Text style={styles.autoBadgeText}>AUTO</Text>
                </View>
              </View>
              <Text style={styles.controlNumberValue}>{getNextControlNumberPreview()}</Text>
              <Text style={styles.controlNumberHint}>
                Generated automatically: A-{'{initials}'}-{'{year}'}-{'{sequence}'}
              </Text>
            </View>

            <Input
              label="Plant Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Northern Lights #1"
            />

            <Input
              label="Strain *"
              value={strain}
              onChangeText={setStrain}
              placeholder="e.g., Northern Lights"
            />

            <View style={styles.stageSection}>
              <Text style={styles.label}>Starting Stage</Text>
              <View style={styles.stageGrid}>
                <View style={styles.stageRow}>
                  {STAGES.slice(0, 3).map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.stageButton,
                        selectedStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                      ]}
                      onPress={() => setSelectedStage(stage)}
                    >
                      <Text
                        style={[
                          styles.stageButtonText,
                          selectedStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                        ]}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.stageRow}>
                  {STAGES.slice(3, 5).map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.stageButtonWide,
                        selectedStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                      ]}
                      onPress={() => setSelectedStage(stage)}
                    >
                      <Text
                        style={[
                          styles.stageButtonText,
                          selectedStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                        ]}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Button
              title="Create Plant"
              onPress={handleSubmit}
              disabled={loading}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Environment Selection Modal */}
      <Modal
        visible={envModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEnvModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Environment</Text>
            <ScrollView>
              {environments.map((env) => (
                <TouchableOpacity
                  key={env.id}
                  style={styles.envOption}
                  onPress={() => {
                    setSelectedEnvironment(env);
                    setEnvModalVisible(false);
                  }}
                >
                  <View
                    style={[
                      styles.envIconSmall,
                      { backgroundColor: ENVIRONMENT_COLORS[env.type] + '20' },
                    ]}
                  >
                    <Ionicons
                      name={ENVIRONMENT_ICONS[env.type]}
                      size={20}
                      color={ENVIRONMENT_COLORS[env.type]}
                    />
                  </View>
                  <View style={styles.envOptionText}>
                    <Text style={styles.envOptionName}>{env.name}</Text>
                    <Text style={styles.envOptionType}>{env.type}</Text>
                  </View>
                  {selectedEnvironment?.id === env.id && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setEnvModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  envSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedEnv: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  envIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  envSelectorText: {
    flex: 1,
  },
  envSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  envSelectorType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  controlNumberPreview: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  controlNumberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  controlNumberLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  autoBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  autoBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '700',
  },
  controlNumberValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controlNumberHint: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
  },
  stageSection: {
    marginVertical: 16,
  },
  stageGrid: {
    gap: 10,
  },
  stageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stageButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageButtonWide: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageButtonActive: {
    backgroundColor: '#4CAF50',
  },
  stageButtonInactive: {
    backgroundColor: '#2196F3',
  },
  stageButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  stageButtonTextActive: {
    color: '#fff',
  },
  stageButtonTextInactive: {
    color: '#fff',
  },
  submitButton: {
    marginTop: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  createEnvButton: {
    marginTop: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  envOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  envOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  envOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  envOptionType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
});
