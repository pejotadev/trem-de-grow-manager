import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { createSeedGenetic } from '../../../firebase/firestore';
import { 
  GeneticGeneration, 
  SeedType, 
  PlantDominance, 
  FloweringType,
} from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Ionicons } from '@expo/vector-icons';

const GENETIC_GENERATIONS: GeneticGeneration[] = [
  'S1', 'F1', 'F2', 'F3', 'F4', 'F5', 'IBL', 'BX1', 'BX2', 'BX3', 'polyhybrid', 'unknown'
];

const SEED_TYPES: SeedType[] = [
  'regular', 'feminized', 'autoflower', 'fast_version', 'cbd', 'cbg'
];

const DOMINANCE_OPTIONS: PlantDominance[] = [
  'indica', 'sativa', 'hybrid', 'indica_dominant', 'sativa_dominant', 'balanced'
];

const FLOWERING_TYPES: FloweringType[] = ['photoperiod', 'autoflower'];

const GROW_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

// Common cannabis terpenes
const TERPENES = [
  'myrcene',
  'limonene',
  'caryophyllene',
  'pinene',
  'linalool',
  'humulene',
  'terpinolene',
  'ocimene',
  'bisabolol',
  'valencene',
  'geraniol',
  'camphene',
  'borneol',
  'eucalyptol',
  'nerolidol',
] as const;

export default function NewGeneticScreen() {
  const { t } = useTranslation(['genetics', 'common']);
  const [submitting, setSubmitting] = useState(false);

  // Basic info
  const [name, setName] = useState('');
  const [breeder, setBreeder] = useState('');
  const [seedBank, setSeedBank] = useState('');
  
  // Genetic classification
  const [geneticGeneration, setGeneticGeneration] = useState<GeneticGeneration | undefined>();
  const [seedType, setSeedType] = useState<SeedType | undefined>();
  const [floweringType, setFloweringType] = useState<FloweringType | undefined>();
  const [dominance, setDominance] = useState<PlantDominance | undefined>();
  
  // Lineage and characteristics
  const [lineage, setLineage] = useState('');
  const [floweringTime, setFloweringTime] = useState('');
  const [expectedThc, setExpectedThc] = useState('');
  const [expectedCbd, setExpectedCbd] = useState('');
  const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>([]);
  
  // Growth info
  const [growDifficulty, setGrowDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | undefined>();
  const [yieldIndoor, setYieldIndoor] = useState('');
  const [yieldOutdoor, setYieldOutdoor] = useState('');
  const [heightIndoor, setHeightIndoor] = useState('');
  const [heightOutdoor, setHeightOutdoor] = useState('');
  
  // Description
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Toggle terpene selection
  const toggleTerpene = (terpene: string) => {
    setSelectedTerpenes(prev => 
      prev.includes(terpene)
        ? prev.filter(t => t !== terpene)
        : [...prev, terpene]
    );
  };

  const { userData } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!userData || !userData.uid) return;

    if (!name.trim()) {
      Alert.alert(t('common:error'), t('errors.nameRequired'));
      return;
    }

    setSubmitting(true);

    try {
      await createSeedGenetic({
        userId: userData.uid,
        name: name.trim(),
        ...(breeder.trim() && { breeder: breeder.trim() }),
        ...(seedBank.trim() && { seedBank: seedBank.trim() }),
        ...(geneticGeneration && { geneticGeneration }),
        ...(seedType && { seedType }),
        ...(floweringType && { floweringType }),
        ...(dominance && { dominance }),
        ...(lineage.trim() && { lineage: lineage.trim() }),
        ...(floweringTime.trim() && { floweringTime: floweringTime.trim() }),
        ...(expectedThc && { expectedThcPercent: parseFloat(expectedThc) }),
        ...(expectedCbd && { expectedCbdPercent: parseFloat(expectedCbd) }),
        ...(selectedTerpenes.length > 0 && { terpenes: selectedTerpenes }),
        ...(growDifficulty && { growDifficulty }),
        ...(yieldIndoor.trim() && { yieldIndoor: yieldIndoor.trim() }),
        ...(yieldOutdoor.trim() && { yieldOutdoor: yieldOutdoor.trim() }),
        ...(heightIndoor.trim() && { heightIndoor: heightIndoor.trim() }),
        ...(heightOutdoor.trim() && { heightOutdoor: heightOutdoor.trim() }),
        ...(description.trim() && { description: description.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
        createdAt: Date.now(),
      });

      Alert.alert(t('common:success'), t('form.createSuccess'), [
        { text: t('common:ok'), onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[NewGenetic] Error creating genetic:', error);
      Alert.alert(t('common:error'), t('errors.failedToCreate'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderOptionGrid = <T extends string>(
    options: readonly T[],
    selected: T | undefined,
    onSelect: (value: T | undefined) => void,
    translationPrefix: string,
    columns: number = 3
  ) => {
    const rows: T[][] = [];
    for (let i = 0; i < options.length; i += columns) {
      rows.push(options.slice(i, i + columns) as T[]);
    }

    return (
      <View style={styles.optionGrid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.optionRow}>
            {row.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  selected === option && styles.optionButtonActive,
                ]}
                onPress={() => onSelect(selected === option ? undefined : option)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected === option && styles.optionTextActive,
                  ]}
                >
                  {t(`${translationPrefix}.${option}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Basic Information */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="leaf" size={20} color="#8BC34A" />
              <Text style={styles.sectionTitle}>{t('form.basicInfo')}</Text>
            </View>

            <Input
              label={`${t('form.nameLabel')} *`}
              value={name}
              onChangeText={setName}
              placeholder={t('form.namePlaceholder')}
            />

            <Input
              label={t('form.breederLabel')}
              value={breeder}
              onChangeText={setBreeder}
              placeholder={t('form.breederPlaceholder')}
            />

            <Input
              label={t('form.seedBankLabel')}
              value={seedBank}
              onChangeText={setSeedBank}
              placeholder={t('form.seedBankPlaceholder')}
            />

            <Input
              label={t('form.lineageLabel')}
              value={lineage}
              onChangeText={setLineage}
              placeholder={t('form.lineagePlaceholder')}
            />
          </Card>

          {/* Genetic Classification */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-branch" size={20} color="#8BC34A" />
              <Text style={styles.sectionTitle}>{t('form.geneticClassification')}</Text>
            </View>

            <Text style={styles.inputLabel}>{t('form.geneticGenerationLabel')}</Text>
            {renderOptionGrid(GENETIC_GENERATIONS, geneticGeneration, setGeneticGeneration, 'generations', 4)}

            <Text style={styles.inputLabel}>{t('form.seedTypeLabel')}</Text>
            {renderOptionGrid(SEED_TYPES, seedType, setSeedType, 'seedTypes', 3)}

            <Text style={styles.inputLabel}>{t('form.floweringTypeLabel')}</Text>
            {renderOptionGrid(FLOWERING_TYPES, floweringType, setFloweringType, 'floweringTypes', 2)}

            <Text style={styles.inputLabel}>{t('form.dominanceLabel')}</Text>
            {renderOptionGrid(DOMINANCE_OPTIONS, dominance, setDominance, 'dominance', 2)}
          </Card>

          {/* Characteristics */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="flask" size={20} color="#8BC34A" />
              <Text style={styles.sectionTitle}>{t('form.characteristics')}</Text>
            </View>

            <Input
              label={t('form.floweringTimeLabel')}
              value={floweringTime}
              onChangeText={setFloweringTime}
              placeholder={t('form.floweringTimePlaceholder')}
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Input
                  label={t('form.expectedThcLabel')}
                  value={expectedThc}
                  onChangeText={setExpectedThc}
                  placeholder="0-30"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label={t('form.expectedCbdLabel')}
                  value={expectedCbd}
                  onChangeText={setExpectedCbd}
                  placeholder="0-30"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Terpene Profile */}
            <Text style={styles.inputLabel}>{t('form.terpenesLabel')}</Text>
            <Text style={styles.terpeneHint}>{t('form.terpenesHint')}</Text>
            <View style={styles.terpeneGrid}>
              {TERPENES.map((terpene) => (
                <TouchableOpacity
                  key={terpene}
                  style={[
                    styles.terpeneChip,
                    selectedTerpenes.includes(terpene) && styles.terpeneChipActive,
                  ]}
                  onPress={() => toggleTerpene(terpene)}
                >
                  <Text
                    style={[
                      styles.terpeneChipText,
                      selectedTerpenes.includes(terpene) && styles.terpeneChipTextActive,
                    ]}
                  >
                    {t(`terpenes.${terpene}`)}
                  </Text>
                  {selectedTerpenes.includes(terpene) && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>{t('form.growDifficultyLabel')}</Text>
            {renderOptionGrid(GROW_DIFFICULTIES, growDifficulty, setGrowDifficulty, 'difficulty', 3)}
          </Card>

          {/* Yield & Height */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="resize" size={20} color="#8BC34A" />
              <Text style={styles.sectionTitle}>{t('form.yieldInfo')}</Text>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Input
                  label={t('form.yieldIndoorLabel')}
                  value={yieldIndoor}
                  onChangeText={setYieldIndoor}
                  placeholder={t('form.yieldPlaceholder')}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label={t('form.yieldOutdoorLabel')}
                  value={yieldOutdoor}
                  onChangeText={setYieldOutdoor}
                  placeholder={t('form.yieldPlaceholder')}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Input
                  label={t('form.heightIndoorLabel')}
                  value={heightIndoor}
                  onChangeText={setHeightIndoor}
                  placeholder={t('form.heightPlaceholder')}
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label={t('form.heightOutdoorLabel')}
                  value={heightOutdoor}
                  onChangeText={setHeightOutdoor}
                  placeholder={t('form.heightPlaceholder')}
                />
              </View>
            </View>
          </Card>

          {/* Description & Notes */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#8BC34A" />
              <Text style={styles.sectionTitle}>{t('form.descriptionSection')}</Text>
            </View>

            <Input
              label={t('form.descriptionLabel')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('form.descriptionPlaceholder')}
              multiline
              numberOfLines={3}
            />

            <Input
              label={t('form.notesLabel')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('form.notesPlaceholder')}
              multiline
              numberOfLines={2}
            />
          </Card>

          {/* Submit Buttons */}
          <Button
            title={submitting ? t('common:saving') : t('form.createGenetic')}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />

          <Button
            title={t('common:cancel')}
            onPress={() => router.back()}
            variant="secondary"
            disabled={submitting}
          />
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
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  optionGrid: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  optionButtonActive: {
    backgroundColor: '#8BC34A',
    borderColor: '#8BC34A',
  },
  optionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  optionTextActive: {
    color: '#fff',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#8BC34A',
    marginTop: 8,
  },
  // Terpene styles
  terpeneHint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  terpeneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  terpeneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 4,
  },
  terpeneChipActive: {
    backgroundColor: '#8BC34A',
    borderColor: '#8BC34A',
  },
  terpeneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  terpeneChipTextActive: {
    color: '#fff',
  },
});

