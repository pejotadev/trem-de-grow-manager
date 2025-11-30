import React, { useEffect, useState, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getSeedGenetic, updateSeedGenetic, deleteSeedGenetic } from '../../../firebase/firestore';
import { 
  SeedGenetic,
  GeneticGeneration, 
  SeedType, 
  PlantDominance, 
  FloweringType,
} from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
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

const SEED_TYPE_COLORS: Record<SeedType, string> = {
  regular: '#9E9E9E',
  feminized: '#E91E63',
  autoflower: '#FF9800',
  fast_version: '#03A9F4',
  cbd: '#4CAF50',
  cbg: '#8BC34A',
};

export default function GeneticDetailScreen() {
  const { t } = useTranslation(['genetics', 'common']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [genetic, setGenetic] = useState<SeedGenetic | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [breeder, setBreeder] = useState('');
  const [seedBank, setSeedBank] = useState('');
  const [geneticGeneration, setGeneticGeneration] = useState<GeneticGeneration | undefined>();
  const [seedType, setSeedType] = useState<SeedType | undefined>();
  const [floweringType, setFloweringType] = useState<FloweringType | undefined>();
  const [dominance, setDominance] = useState<PlantDominance | undefined>();
  const [lineage, setLineage] = useState('');
  const [floweringTime, setFloweringTime] = useState('');
  const [expectedThc, setExpectedThc] = useState('');
  const [expectedCbd, setExpectedCbd] = useState('');
  const [selectedTerpenes, setSelectedTerpenes] = useState<string[]>([]);
  const [growDifficulty, setGrowDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | undefined>();
  const [yieldIndoor, setYieldIndoor] = useState('');
  const [yieldOutdoor, setYieldOutdoor] = useState('');
  const [heightIndoor, setHeightIndoor] = useState('');
  const [heightOutdoor, setHeightOutdoor] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const { userData } = useAuth();
  const router = useRouter();

  const loadGenetic = async () => {
    if (!id) return;

    try {
      const data = await getSeedGenetic(id);
      if (data) {
        setGenetic(data);
        populateFields(data);
      }
    } catch (error: any) {
      console.error('[GeneticDetail] Error loading genetic:', error);
      Alert.alert(t('common:error'), t('errors.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const populateFields = (data: SeedGenetic) => {
    setName(data.name);
    setBreeder(data.breeder || '');
    setSeedBank(data.seedBank || '');
    setGeneticGeneration(data.geneticGeneration);
    setSeedType(data.seedType);
    setFloweringType(data.floweringType);
    setDominance(data.dominance);
    setLineage(data.lineage || '');
    setFloweringTime(data.floweringTime || '');
    setExpectedThc(data.expectedThcPercent?.toString() || '');
    setExpectedCbd(data.expectedCbdPercent?.toString() || '');
    setSelectedTerpenes(data.terpenes || []);
    setGrowDifficulty(data.growDifficulty);
    setYieldIndoor(data.yieldIndoor || '');
    setYieldOutdoor(data.yieldOutdoor || '');
    setHeightIndoor(data.heightIndoor || '');
    setHeightOutdoor(data.heightOutdoor || '');
    setDescription(data.description || '');
    setNotes(data.notes || '');
  };

  // Toggle terpene selection
  const toggleTerpene = (terpene: string) => {
    if (!editing) return;
    setSelectedTerpenes(prev => 
      prev.includes(terpene)
        ? prev.filter(t => t !== terpene)
        : [...prev, terpene]
    );
  };

  useFocusEffect(
    useCallback(() => {
      loadGenetic();
    }, [id])
  );

  const handleSave = async () => {
    if (!id || !genetic) return;

    if (!name.trim()) {
      Alert.alert(t('common:error'), t('errors.nameRequired'));
      return;
    }

    setSubmitting(true);

    try {
      await updateSeedGenetic(id, {
        name: name.trim(),
        breeder: breeder.trim() || undefined,
        seedBank: seedBank.trim() || undefined,
        geneticGeneration,
        seedType,
        floweringType,
        dominance,
        lineage: lineage.trim() || undefined,
        floweringTime: floweringTime.trim() || undefined,
        expectedThcPercent: expectedThc ? parseFloat(expectedThc) : undefined,
        expectedCbdPercent: expectedCbd ? parseFloat(expectedCbd) : undefined,
        terpenes: selectedTerpenes.length > 0 ? selectedTerpenes : undefined,
        growDifficulty,
        yieldIndoor: yieldIndoor.trim() || undefined,
        yieldOutdoor: yieldOutdoor.trim() || undefined,
        heightIndoor: heightIndoor.trim() || undefined,
        heightOutdoor: heightOutdoor.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert(t('common:success'), t('detail.updateSuccess'));
      setEditing(false);
      loadGenetic();
    } catch (error: any) {
      console.error('[GeneticDetail] Error updating genetic:', error);
      Alert.alert(t('common:error'), t('errors.failedToUpdate'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('detail.deleteTitle'),
      t('detail.deleteMessage'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSeedGenetic(id!);
              Alert.alert(t('common:success'), t('detail.deleteSuccess'));
              router.back();
            } catch (error: any) {
              console.error('[GeneticDetail] Error deleting genetic:', error);
              Alert.alert(t('common:error'), t('errors.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const cancelEdit = () => {
    if (genetic) {
      populateFields(genetic);
    }
    setEditing(false);
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
                  !editing && styles.optionButtonDisabled,
                ]}
                onPress={() => editing && onSelect(selected === option ? undefined : option)}
                disabled={!editing}
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

  if (loading) {
    return <Loading message={t('common:loading')} />;
  }

  if (!genetic) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>{t('detail.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const seedTypeColor = genetic.seedType ? SEED_TYPE_COLORS[genetic.seedType] : '#8BC34A';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header with Name */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: seedTypeColor + '20' }]}>
              <Ionicons name="leaf" size={32} color={seedTypeColor} />
            </View>
            <View style={styles.headerInfo}>
              {editing ? (
                <Input
                  value={name}
                  onChangeText={setName}
                  placeholder={t('form.namePlaceholder')}
                  style={styles.headerNameInput}
                />
              ) : (
                <Text style={styles.headerName}>{genetic.name}</Text>
              )}
              {genetic.breeder && !editing && (
                <Text style={styles.headerBreeder}>
                  <Ionicons name="person-outline" size={14} color="#666" /> {genetic.breeder}
                </Text>
              )}
            </View>
            {genetic.seedType && !editing && (
              <View style={[styles.typeBadge, { backgroundColor: seedTypeColor }]}>
                <Text style={styles.typeText}>{t(`seedTypes.${genetic.seedType}`)}</Text>
              </View>
            )}
          </View>

          {/* Edit/Action Buttons */}
          {!editing ? (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setEditing(true)}
              >
                <Ionicons name="pencil" size={20} color="#8BC34A" />
                <Text style={styles.editButtonText}>{t('common:edit')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#f44336" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Basic Information */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#8BC34A" />
              <Text style={styles.sectionTitle}>{t('form.basicInfo')}</Text>
            </View>

            {editing ? (
              <>
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
              </>
            ) : (
              <View style={styles.infoGrid}>
                {genetic.breeder && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('form.breederLabel')}</Text>
                    <Text style={styles.infoValue}>{genetic.breeder}</Text>
                  </View>
                )}
                {genetic.seedBank && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('form.seedBankLabel')}</Text>
                    <Text style={styles.infoValue}>{genetic.seedBank}</Text>
                  </View>
                )}
                {genetic.lineage && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('form.lineageLabel')}</Text>
                    <Text style={styles.infoValue}>{genetic.lineage}</Text>
                  </View>
                )}
              </View>
            )}
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

            {editing ? (
              <>
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
              </>
            ) : (
              <View style={styles.infoGrid}>
                {genetic.floweringTime && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('form.floweringTimeLabel')}</Text>
                    <Text style={styles.infoValue}>{genetic.floweringTime}</Text>
                  </View>
                )}
                {(genetic.expectedThcPercent || genetic.expectedCbdPercent) && (
                  <View style={styles.cannabinoidRow}>
                    {genetic.expectedThcPercent && (
                      <View style={styles.cannabinoidBadge}>
                        <Text style={styles.cannabinoidText}>
                          THC {genetic.expectedThcPercent}%
                        </Text>
                      </View>
                    )}
                    {genetic.expectedCbdPercent && (
                      <View style={[styles.cannabinoidBadge, styles.cbdBadge]}>
                        <Text style={styles.cannabinoidText}>
                          CBD {genetic.expectedCbdPercent}%
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                {genetic.terpenes && genetic.terpenes.length > 0 && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('form.terpenesLabel')}</Text>
                    <View style={styles.terpeneDisplayGrid}>
                      {genetic.terpenes.map((terpene) => (
                        <View key={terpene} style={styles.terpeneDisplayChip}>
                          <Text style={styles.terpeneDisplayText}>{t(`terpenes.${terpene}`)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Terpene Profile - Editable */}
            <Text style={styles.inputLabel}>{t('form.terpenesLabel')}</Text>
            {editing && <Text style={styles.terpeneHint}>{t('form.terpenesHint')}</Text>}
            <View style={styles.terpeneGrid}>
              {TERPENES.map((terpene) => (
                <TouchableOpacity
                  key={terpene}
                  style={[
                    styles.terpeneChip,
                    selectedTerpenes.includes(terpene) && styles.terpeneChipActive,
                    !editing && styles.terpeneChipDisabled,
                  ]}
                  onPress={() => toggleTerpene(terpene)}
                  disabled={!editing}
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

          {/* Description & Notes */}
          {(editing || genetic.description || genetic.notes) && (
            <Card>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#8BC34A" />
                <Text style={styles.sectionTitle}>{t('form.descriptionSection')}</Text>
              </View>

              {editing ? (
                <>
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
                </>
              ) : (
                <View style={styles.infoGrid}>
                  {genetic.description && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{t('form.descriptionLabel')}</Text>
                      <Text style={styles.infoValue}>{genetic.description}</Text>
                    </View>
                  )}
                  {genetic.notes && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>{t('form.notesLabel')}</Text>
                      <Text style={styles.infoValue}>{genetic.notes}</Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          )}

          {/* Save/Cancel Buttons */}
          {editing && (
            <>
              <Button
                title={submitting ? t('common:saving') : t('common:saveChanges')}
                onPress={handleSave}
                disabled={submitting}
                style={styles.saveButton}
              />
              <Button
                title={t('common:cancel')}
                onPress={cancelEdit}
                variant="secondary"
                disabled={submitting}
              />
            </>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  headerNameInput: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerBreeder: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8BC34A',
  },
  deleteButton: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  optionButtonDisabled: {
    opacity: 0.7,
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
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: '#333',
  },
  cannabinoidRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cannabinoidBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cbdBadge: {
    backgroundColor: '#4CAF50',
  },
  cannabinoidText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#8BC34A',
    marginTop: 8,
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
  terpeneChipDisabled: {
    opacity: 0.7,
  },
  terpeneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  terpeneChipTextActive: {
    color: '#fff',
  },
  terpeneDisplayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  terpeneDisplayChip: {
    backgroundColor: '#e8f5e9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  terpeneDisplayText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
});

