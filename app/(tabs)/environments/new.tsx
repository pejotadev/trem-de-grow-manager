import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { createEnvironment } from '../../../firebase/firestore';
import { EnvironmentType } from '../../../types';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { Ionicons } from '@expo/vector-icons';

const ENVIRONMENT_TYPES: { type: EnvironmentType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { type: 'indoor', label: 'Indoor', icon: 'home', color: '#9C27B0' },
  { type: 'outdoor', label: 'Outdoor', icon: 'sunny', color: '#FF9800' },
  { type: 'greenhouse', label: 'Greenhouse', icon: 'leaf', color: '#4CAF50' },
];

export default function NewEnvironmentScreen() {
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState<EnvironmentType>('indoor');
  const [width, setWidth] = useState('');
  const [length, setLength] = useState('');
  const [height, setHeight] = useState('');
  const [unit, setUnit] = useState<'m' | 'ft'>('m');
  const [lightSetup, setLightSetup] = useState('');
  const [ventilation, setVentilation] = useState('');
  const [notes, setNotes] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter an environment name');
      return;
    }

    if (!userData) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    try {
      console.log('[NewEnvironment] Creating environment for user:', userData.uid);
      
      const environmentData: any = {
        userId: userData.uid,
        name,
        type: selectedType,
        isPublic,
        createdAt: Date.now(),
      };

      // Add dimensions if provided
      if (width && length && height) {
        const widthNum = parseFloat(width);
        const lengthNum = parseFloat(length);
        const heightNum = parseFloat(height);

        if (!isNaN(widthNum) && !isNaN(lengthNum) && !isNaN(heightNum)) {
          environmentData.dimensions = {
            width: widthNum,
            length: lengthNum,
            height: heightNum,
            unit,
          };
        }
      }

      // Add optional fields if provided
      if (lightSetup.trim()) {
        environmentData.lightSetup = lightSetup.trim();
      }
      if (ventilation.trim()) {
        environmentData.ventilation = ventilation.trim();
      }
      if (notes.trim()) {
        environmentData.notes = notes.trim();
      }

      const environmentId = await createEnvironment(environmentData);
      console.log('[NewEnvironment] Environment created with ID:', environmentId);

      Alert.alert('Success', 'Environment created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error('[NewEnvironment] Error creating environment:', error);
      Alert.alert('Error', 'Failed to create environment: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

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
            <Input
              label="Environment Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Main Tent, Backyard Garden"
            />

            <View style={styles.section}>
              <Text style={styles.label}>Environment Type *</Text>
              <View style={styles.typeButtons}>
                {ENVIRONMENT_TYPES.map((envType) => (
                  <TouchableOpacity
                    key={envType.type}
                    style={[
                      styles.typeButton,
                      selectedType === envType.type && { backgroundColor: envType.color + '20', borderColor: envType.color },
                    ]}
                    onPress={() => setSelectedType(envType.type)}
                  >
                    <Ionicons
                      name={envType.icon}
                      size={28}
                      color={selectedType === envType.type ? envType.color : '#999'}
                    />
                    <Text
                      style={[
                        styles.typeLabel,
                        selectedType === envType.type && { color: envType.color, fontWeight: '600' },
                      ]}
                    >
                      {envType.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Dimensions (optional)</Text>
              <View style={styles.unitSelector}>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'm' && styles.unitButtonActive]}
                  onPress={() => setUnit('m')}
                >
                  <Text style={[styles.unitText, unit === 'm' && styles.unitTextActive]}>Meters</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, unit === 'ft' && styles.unitButtonActive]}
                  onPress={() => setUnit('ft')}
                >
                  <Text style={[styles.unitText, unit === 'ft' && styles.unitTextActive]}>Feet</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dimensionsRow}>
                <View style={styles.dimensionInput}>
                  <Input
                    label="Width"
                    value={width}
                    onChangeText={setWidth}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.dimensionInput}>
                  <Input
                    label="Length"
                    value={length}
                    onChangeText={setLength}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.dimensionInput}>
                  <Input
                    label="Height"
                    value={height}
                    onChangeText={setHeight}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>

            <Input
              label="Light Setup (optional)"
              value={lightSetup}
              onChangeText={setLightSetup}
              placeholder="e.g., 600W HPS, Full Spectrum LED"
            />

            <Input
              label="Ventilation (optional)"
              value={ventilation}
              onChangeText={setVentilation}
              placeholder="e.g., Inline fan with carbon filter"
            />

            <Input
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about this environment..."
              multiline
              numberOfLines={3}
            />

            {/* Public Environment Toggle */}
            <View style={styles.publicSection}>
              <View style={styles.publicHeader}>
                <View style={styles.publicLabelContainer}>
                  <Ionicons name="globe-outline" size={20} color="#4CAF50" />
                  <Text style={styles.publicLabel}>Public Environment</Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                  thumbColor={isPublic ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.publicDescription}>
                {isPublic
                  ? 'Friends can view this environment and its plants.'
                  : 'Only you can see this environment.'}
              </Text>
            </View>

            <Button
              title="Create Environment"
              onPress={handleSubmit}
              disabled={loading}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginVertical: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  typeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  unitSelector: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 4,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  unitButtonActive: {
    backgroundColor: '#2E7D32',
  },
  unitText: {
    fontSize: 14,
    color: '#666',
  },
  unitTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dimensionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dimensionInput: {
    flex: 1,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#2E7D32',
  },
  publicSection: {
    marginTop: 16,
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
  },
  publicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  publicLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  publicDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
});


