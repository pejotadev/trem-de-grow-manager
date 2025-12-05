import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { createPlant, createStage, getEnvironmentsForContext, getPlantsForContext, generateControlNumber, getSeedGeneticsForContext } from '../../../firebase/firestore';
import { StageName, Environment, Plant, PlantSourceType, GeneticInfo, Chemotype, SeedGenetic, SeedType } from '../../../types';
import { Input } from '../../../components/Input';
import { DatePicker } from '../../../components/DatePicker';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { Ionicons } from '@expo/vector-icons';
import { showSuccess, showError, showWarning } from '../../../utils/toast';

const STAGES: StageName[] = ['Seedling', 'Veg', 'Flower', 'Drying', 'Curing'];

const SOURCE_TYPE_ICONS: Record<PlantSourceType, keyof typeof Ionicons.glyphMap> = {
  seed: 'ellipse',
  clone: 'git-branch',
  cutting: 'cut',
  tissue_culture: 'flask',
};

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

const SEED_TYPE_COLORS: Record<SeedType, string> = {
  regular: '#9E9E9E',
  feminized: '#E91E63',
  autoflower: '#FF9800',
  fast_version: '#03A9F4',
  cbd: '#4CAF50',
  cbg: '#8BC34A',
};

export default function NewPlantScreen() {
  const { t } = useTranslation(['plants', 'common', 'genetics']);
  // Basic plant info
  const [strain, setStrain] = useState('');
  const [selectedStage, setSelectedStage] = useState<StageName>('Seedling');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  const [envModalVisible, setEnvModalVisible] = useState(false);
  
  // Genetics Library Integration
  const [seedGenetics, setSeedGenetics] = useState<SeedGenetic[]>([]);
  const [selectedGenetic, setSelectedGenetic] = useState<SeedGenetic | null>(null);
  const [geneticsModalVisible, setGeneticsModalVisible] = useState(false);
  
  // Genetic origin fields
  const [sourceType, setSourceType] = useState<PlantSourceType>('seed');
  const [breeder, setBreeder] = useState('');
  const [seedBank, setSeedBank] = useState('');
  const [geneticLineage, setGeneticLineage] = useState('');
  const [isMotherPlant, setIsMotherPlant] = useState(false);
  
  // Parent plant for clones/cuttings
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [selectedParentPlant, setSelectedParentPlant] = useState<Plant | null>(null);
  const [parentModalVisible, setParentModalVisible] = useState(false);
  const [manualParentInfo, setManualParentInfo] = useState('');
  
  // Chemotype fields
  const [showChemotype, setShowChemotype] = useState(false);
  const [thcPercent, setThcPercent] = useState('');
  const [cbdPercent, setCbdPercent] = useState('');
  const [labName, setLabName] = useState('');
  const [analysisDate, setAnalysisDate] = useState<Date | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingEnvs, setLoadingEnvs] = useState(true);
  const { userData, currentAssociation } = useAuth();
  const router = useRouter();

  const SOURCE_TYPES: PlantSourceType[] = ['seed', 'clone', 'cutting', 'tissue_culture'];

  useEffect(() => {
    loadEnvironments();
    loadPlants();
    loadSeedGenetics();
  }, [userData, currentAssociation]);

  // Auto-fill genetic lineage when parent plant is selected
  useEffect(() => {
    if (selectedParentPlant) {
      const parentLineage = selectedParentPlant.genetics?.geneticLineage || selectedParentPlant.strain;
      setGeneticLineage(parentLineage);
    }
  }, [selectedParentPlant]);

  // Auto-fill fields when a genetic is selected from library
  useEffect(() => {
    if (selectedGenetic) {
      setStrain(selectedGenetic.name);
      setBreeder(selectedGenetic.breeder || '');
      setSeedBank(selectedGenetic.seedBank || '');
      setGeneticLineage(selectedGenetic.lineage || '');
      // Pre-fill chemotype if available
      if (selectedGenetic.expectedThcPercent || selectedGenetic.expectedCbdPercent) {
        setShowChemotype(true);
        setThcPercent(selectedGenetic.expectedThcPercent?.toString() || '');
        setCbdPercent(selectedGenetic.expectedCbdPercent?.toString() || '');
      }
    }
  }, [selectedGenetic]);

  const loadEnvironments = async () => {
    if (!userData) return;
    
    try {
      const userEnvs = await getEnvironmentsForContext(userData.uid, currentAssociation?.id);
      setEnvironments(userEnvs);
      if (userEnvs.length > 0) {
        setSelectedEnvironment(userEnvs[0]);
      }
    } catch (error) {
      console.error('[NewPlant] Error loading environments:', error);
      showError(t('plants:loadingEnvironments'), t('common:error'));
    } finally {
      setLoadingEnvs(false);
    }
  };

  const loadPlants = async () => {
    if (!userData) return;
    
    try {
      const userPlants = await getPlantsForContext(userData.uid, currentAssociation?.id);
      setAllPlants(userPlants);
    } catch (error) {
      console.error('[NewPlant] Error loading plants:', error);
    }
  };

  const loadSeedGenetics = async () => {
    if (!userData) return;
    
    try {
      const genetics = await getSeedGeneticsForContext(userData.uid, currentAssociation?.id);
      setSeedGenetics(genetics);
    } catch (error) {
      console.error('[NewPlant] Error loading seed genetics:', error);
    }
  };

  // Clear selected genetic and reset auto-filled fields
  const clearSelectedGenetic = () => {
    setSelectedGenetic(null);
    setStrain('');
    setBreeder('');
    setSeedBank('');
    setGeneticLineage('');
  };

  // Filter plants that can be used as parents (preferably mother plants)
  const getParentPlantOptions = () => {
    const motherPlants = allPlants.filter(p => p.isMotherPlant);
    if (motherPlants.length > 0) {
      return { plants: motherPlants, hasMotherPlants: true };
    }
    return { plants: allPlants, hasMotherPlants: false };
  };

  // Preview the next control number
  const getNextControlNumberPreview = (): string => {
    if (!selectedEnvironment) return '---';
    const nextSequence = (selectedEnvironment.plantCounter || 0) + 1;
    return generateControlNumber(nextSequence);
  };

  const handleSubmit = async () => {
    if (!strain) {
      showWarning(t('plants:form.strainRequired'), t('common:error'));
      return;
    }

    if (!selectedEnvironment) {
      showWarning(t('plants:form.selectEnvironment'), t('common:error'));
      return;
    }

    if (!userData || !userData.uid) {
      showWarning(t('common:validation.userNotAuthenticated'), t('common:error'));
      return;
    }

    setLoading(true);
    try {
      console.log('[NewPlant] Creating plant for user:', userData.uid);
      const now = Date.now();

      // Build genetic info
      const genetics: GeneticInfo = {
        sourceType,
        acquisitionDate: now,
      };

      if (sourceType === 'seed') {
        if (selectedGenetic) genetics.seedGeneticId = selectedGenetic.id;
        if (breeder) genetics.breeder = breeder;
        if (seedBank) genetics.seedBank = seedBank;
      } else if (sourceType === 'clone' || sourceType === 'cutting') {
        if (selectedParentPlant) {
          genetics.parentPlantId = selectedParentPlant.id;
          genetics.parentControlNumber = selectedParentPlant.controlNumber;
          genetics.acquisitionSource = `${sourceType === 'clone' ? 'Cloned' : 'Cutting'} from ${selectedParentPlant.name}`;
          if (selectedParentPlant.genetics?.breeder) {
            genetics.breeder = selectedParentPlant.genetics.breeder;
          }
        } else if (manualParentInfo) {
          genetics.acquisitionSource = manualParentInfo;
        }
      }

      if (geneticLineage) genetics.geneticLineage = geneticLineage;

      // Build chemotype if provided
      let chemotype: Chemotype | undefined;
      if (showChemotype && (thcPercent || cbdPercent || labName || analysisDate)) {
        chemotype = {};
        if (thcPercent) chemotype.thcPercent = parseFloat(thcPercent);
        if (cbdPercent) chemotype.cbdPercent = parseFloat(cbdPercent);
        if (labName) chemotype.labName = labName;
        if (analysisDate) chemotype.analysisDate = analysisDate.getTime();
      }

      console.log('[NewPlant] Creating plant for user:', userData.uid, 'associationId:', currentAssociation?.id);
      
      const plantData: any = {
        userId: userData.uid,
        environmentId: selectedEnvironment.id,
        strain,
        startDate: now,
        currentStage: selectedStage,
        genetics,
        ...(chemotype && { chemotype }),
        ...(isMotherPlant && { isMotherPlant: true }),
        ...(selectedParentPlant && { motherPlantId: selectedParentPlant.id }),
      };
      
      // Only add associationId if it exists
      if (currentAssociation?.id) {
        plantData.associationId = currentAssociation.id;
      }
      
      const plantId = await createPlant(plantData);
      console.log('[NewPlant] Plant created with ID:', plantId);

      // Create initial stage
      console.log('[NewPlant] Creating initial stage');
      await createStage({
        plantId,
        name: selectedStage,
        startDate: now,
      });
      console.log('[NewPlant] Stage created successfully');

      showSuccess(t('plants:form.createPlant') + '!', t('common:success'), () => router.replace(`/(tabs)/plants/${plantId}`));
    } catch (error: any) {
      console.error('[NewPlant] Error creating plant:', error);
      showError(error.message || 'Unknown error', t('common:error'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingEnvs) {
    return <Loading message={t('plants:loadingEnvironments')} />;
  }

  if (environments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>{t('plants:detail.noEnvironments')}</Text>
          <Text style={styles.emptySubtext}>
            {t('plants:detail.createEnvironmentFirst')}
          </Text>
          <Button
            title={t('plants:createEnvironment')}
            onPress={() => router.push('/(tabs)/environments/new')}
            style={styles.createEnvButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { plants: parentOptions, hasMotherPlants } = getParentPlantOptions();
  const showParentSelector = sourceType === 'clone' || sourceType === 'cutting';

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
              <Text style={styles.label}>{t('plants:form.environmentLabel')} *</Text>
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
                      <Text style={styles.envSelectorType}>{t(`common:environmentTypes.${selectedEnvironment.type}`)}</Text>
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
                <Text style={styles.controlNumberLabel}>{t('plants:form.controlNumber')}</Text>
                <View style={styles.autoBadge}>
                  <Text style={styles.autoBadgeText}>{t('plants:form.autoGenerated')}</Text>
                </View>
              </View>
              <Text style={styles.controlNumberValue}>{getNextControlNumberPreview()}</Text>
              <Text style={styles.controlNumberHint}>
                {t('plants:form.controlNumberHint')}
              </Text>
            </View>

            {/* Genetics Library Selector */}
            {sourceType === 'seed' && seedGenetics.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="library-outline" size={18} color="#8BC34A" />
                  <Text style={styles.label}>{t('plants:form.selectFromLibrary')}</Text>
                </View>
                <TouchableOpacity
                  style={styles.geneticSelector}
                  onPress={() => setGeneticsModalVisible(true)}
                >
                  {selectedGenetic ? (
                    <View style={styles.selectedGenetic}>
                      <View style={[
                        styles.geneticIconSmall,
                        { backgroundColor: selectedGenetic.seedType ? SEED_TYPE_COLORS[selectedGenetic.seedType] + '20' : '#8BC34A20' },
                      ]}>
                        <Ionicons
                          name="leaf"
                          size={20}
                          color={selectedGenetic.seedType ? SEED_TYPE_COLORS[selectedGenetic.seedType] : '#8BC34A'}
                        />
                      </View>
                      <View style={styles.geneticSelectorText}>
                        <Text style={styles.geneticSelectorName}>{selectedGenetic.name}</Text>
                        <Text style={styles.geneticSelectorBreeder}>
                          {selectedGenetic.breeder || t('plants:form.noBreeder')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.clearGeneticButton}
                        onPress={clearSelectedGenetic}
                      >
                        <Ionicons name="close-circle" size={24} color="#999" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.geneticPlaceholder}>
                      <Ionicons name="add-circle-outline" size={24} color="#8BC34A" />
                      <Text style={styles.geneticPlaceholderText}>{t('plants:form.selectGenetic')}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {selectedGenetic && (
                  <View style={styles.geneticAutoFillNote}>
                    <Ionicons name="information-circle-outline" size={14} color="#8BC34A" />
                    <Text style={styles.geneticAutoFillText}>{t('plants:form.autoFilledFromGenetic')}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Link to create genetics if none exist */}
            {sourceType === 'seed' && seedGenetics.length === 0 && (
              <TouchableOpacity
                style={styles.createGeneticsLink}
                onPress={() => router.push('/(tabs)/genetics/new')}
              >
                <Ionicons name="add-circle-outline" size={20} color="#8BC34A" />
                <Text style={styles.createGeneticsText}>{t('plants:form.createGeneticFirst')}</Text>
              </TouchableOpacity>
            )}

            <Input
              label={`${t('plants:form.strainLabel')} *`}
              value={strain}
              onChangeText={setStrain}
              placeholder={t('plants:form.strainPlaceholder')}
            />

            {/* Source Type Selector */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="leaf-outline" size={18} color="#2E7D32" />
                <Text style={styles.label}>{t('plants:form.sourceTypeLabel')} *</Text>
              </View>
              <View style={styles.sourceTypeGrid}>
                {SOURCE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.sourceTypeButton,
                      sourceType === type && styles.sourceTypeButtonActive,
                    ]}
                    onPress={() => {
                      setSourceType(type);
                      setSelectedParentPlant(null);
                      setManualParentInfo('');
                    }}
                  >
                    <Ionicons
                      name={SOURCE_TYPE_ICONS[type]}
                      size={20}
                      color={sourceType === type ? '#fff' : '#4CAF50'}
                    />
                    <Text
                      style={[
                        styles.sourceTypeText,
                        sourceType === type && styles.sourceTypeTextActive,
                      ]}
                    >
                      {t(`common:sourceTypes.${type}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Seed-specific fields */}
            {sourceType === 'seed' && (
              <View style={styles.conditionalSection}>
                <Input
                  label={`${t('plants:form.breederLabel')} (${t('common:optional')})`}
                  value={breeder}
                  onChangeText={setBreeder}
                  placeholder={t('plants:form.breederPlaceholder')}
                />
                <Input
                  label={`${t('plants:form.seedBankLabel')} (${t('common:optional')})`}
                  value={seedBank}
                  onChangeText={setSeedBank}
                  placeholder={t('plants:form.seedBankPlaceholder')}
                />
                <Input
                  label={`${t('plants:form.geneticLineageLabel')} (${t('common:optional')})`}
                  value={geneticLineage}
                  onChangeText={setGeneticLineage}
                  placeholder={t('plants:form.geneticLineagePlaceholder')}
                />
              </View>
            )}

            {/* Clone/Cutting-specific fields */}
            {showParentSelector && (
              <View style={styles.conditionalSection}>
                <Text style={styles.label}>{t('plants:form.parentPlant')}</Text>
                
                {parentOptions.length > 0 ? (
                  <>
                    {!hasMotherPlants && (
                      <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={16} color="#FF9800" />
                        <Text style={styles.infoText}>
                          {t('plants:form.noMotherPlantsFound')}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.parentSelector}
                      onPress={() => setParentModalVisible(true)}
                    >
                      {selectedParentPlant ? (
                        <View style={styles.selectedParent}>
                          <Ionicons name="leaf" size={20} color="#4CAF50" />
                          <View style={styles.parentInfo}>
                            <Text style={styles.parentName}>{selectedParentPlant.name}</Text>
                            <Text style={styles.parentControl}>#{selectedParentPlant.controlNumber}</Text>
                          </View>
                          {selectedParentPlant.isMotherPlant && (
                            <View style={styles.motherBadge}>
                              <Text style={styles.motherBadgeText}>{t('plants:detail.mother')}</Text>
                            </View>
                          )}
                        </View>
                      ) : (
                        <Text style={styles.parentPlaceholder}>{t('plants:form.selectParentPlant')}</Text>
                      )}
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.noParentsBox}>
                    <Ionicons name="alert-circle-outline" size={20} color="#666" />
                    <Text style={styles.noParentsText}>{t('plants:form.noParentPlants')}</Text>
                  </View>
                )}

                <Input
                  label={t('plants:form.orEnterManually')}
                  value={manualParentInfo}
                  onChangeText={setManualParentInfo}
                  placeholder={t('plants:form.manualParentPlaceholder')}
                />

                <Input
                  label={t('plants:form.geneticLineageLabel')}
                  value={geneticLineage}
                  onChangeText={setGeneticLineage}
                  placeholder={selectedParentPlant ? t('plants:form.autoFilledFromParent') : t('plants:form.geneticLineagePlaceholder')}
                />
              </View>
            )}

            {/* Tissue Culture fields */}
            {sourceType === 'tissue_culture' && (
              <View style={styles.conditionalSection}>
                <Input
                  label={`${t('plants:form.seedBankLabel')} (${t('common:optional')})`}
                  value={seedBank}
                  onChangeText={setSeedBank}
                  placeholder={t('plants:form.sourceLabPlaceholder')}
                />
                <Input
                  label={`${t('plants:form.geneticLineageLabel')} (${t('common:optional')})`}
                  value={geneticLineage}
                  onChangeText={setGeneticLineage}
                  placeholder={t('plants:form.geneticLineagePlaceholder')}
                />
              </View>
            )}

            {/* Stage Selector */}
            <View style={styles.stageSection}>
              <Text style={styles.label}>{t('plants:form.startingStage')}</Text>
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
                        {t(`common:stages.${stage.toLowerCase()}`)}
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
                        {t(`common:stages.${stage.toLowerCase()}`)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Mother Plant Toggle */}
            <View style={styles.motherPlantSection}>
              <View style={styles.motherPlantHeader}>
                <View style={styles.motherPlantLabel}>
                  <Ionicons name="git-network-outline" size={20} color="#4CAF50" />
                  <Text style={styles.motherPlantTitle}>{t('plants:form.markAsMother')}</Text>
                </View>
                <Switch
                  value={isMotherPlant}
                  onValueChange={setIsMotherPlant}
                  trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                  thumbColor={isMotherPlant ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.motherPlantHint}>
                {t('plants:form.motherPlantHint')}
              </Text>
            </View>

            {/* Chemotype Section (Expandable) */}
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={() => setShowChemotype(!showChemotype)}
            >
              <View style={styles.expandableTitle}>
                <Ionicons name="flask-outline" size={20} color="#2E7D32" />
                <Text style={styles.expandableTitleText}>{t('plants:form.chemotypeData')}</Text>
              </View>
              <Ionicons
                name={showChemotype ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

            {showChemotype && (
              <View style={styles.chemotypeSection}>
                <View style={styles.chemotypeRow}>
                  <View style={styles.chemotypeInput}>
                    <Input
                      label={t('plants:form.thcPercent')}
                      value={thcPercent}
                      onChangeText={setThcPercent}
                      placeholder="0.0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.chemotypeInput}>
                    <Input
                      label={t('plants:form.cbdPercent')}
                      value={cbdPercent}
                      onChangeText={setCbdPercent}
                      placeholder="0.0"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <Input
                  label={t('plants:form.labName')}
                  value={labName}
                  onChangeText={setLabName}
                  placeholder={t('plants:form.labNamePlaceholder')}
                />
                <DatePicker
                  label={t('plants:form.analysisDate')}
                  value={analysisDate}
                  onChange={setAnalysisDate}
                  placeholder={t('plants:form.selectAnalysisDate')}
                  maximumDate={new Date()}
                />
              </View>
            )}

            <Button
              title={t('plants:form.createPlant')}
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
            <Text style={styles.modalTitle}>{t('plants:form.selectEnvironment')}</Text>
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
                    <Text style={styles.envOptionType}>{t(`common:environmentTypes.${env.type}`)}</Text>
                  </View>
                  {selectedEnvironment?.id === env.id && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title={t('common:cancel')}
              onPress={() => setEnvModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>

      {/* Genetics Library Selection Modal */}
      <Modal
        visible={geneticsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGeneticsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('plants:form.selectGeneticTitle')}</Text>
            <Text style={styles.modalSubtitleText}>{t('plants:form.selectGeneticSubtitle')}</Text>
            <ScrollView style={styles.geneticsModalScroll}>
              {seedGenetics.map((genetic) => (
                <TouchableOpacity
                  key={genetic.id}
                  style={styles.geneticOption}
                  onPress={() => {
                    setSelectedGenetic(genetic);
                    setGeneticsModalVisible(false);
                  }}
                >
                  <View style={[
                    styles.geneticOptionIcon,
                    { backgroundColor: genetic.seedType ? SEED_TYPE_COLORS[genetic.seedType] + '20' : '#8BC34A20' },
                  ]}>
                    <Ionicons
                      name="leaf"
                      size={20}
                      color={genetic.seedType ? SEED_TYPE_COLORS[genetic.seedType] : '#8BC34A'}
                    />
                  </View>
                  <View style={styles.geneticOptionInfo}>
                    <Text style={styles.geneticOptionName}>{genetic.name}</Text>
                    {genetic.breeder && (
                      <Text style={styles.geneticOptionBreeder}>{genetic.breeder}</Text>
                    )}
                    <View style={styles.geneticOptionTags}>
                      {genetic.seedType && (
                        <View style={[styles.geneticTag, { backgroundColor: SEED_TYPE_COLORS[genetic.seedType] }]}>
                          <Text style={styles.geneticTagText}>{t(`genetics:seedTypes.${genetic.seedType}`)}</Text>
                        </View>
                      )}
                      {genetic.dominance && (
                        <View style={[styles.geneticTag, { backgroundColor: '#9E9E9E' }]}>
                          <Text style={styles.geneticTagText}>{t(`genetics:dominance.${genetic.dominance}`)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {selectedGenetic?.id === genetic.id && (
                    <Ionicons name="checkmark" size={24} color="#8BC34A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title={t('common:cancel')}
              onPress={() => setGeneticsModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>

      {/* Parent Plant Selection Modal */}
      <Modal
        visible={parentModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setParentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('plants:clone.selectTargetEnvironment')}</Text>
            {hasMotherPlants && (
              <View style={styles.modalSubtitle}>
                <Ionicons name="star" size={14} color="#4CAF50" />
                <Text style={styles.modalSubtitleText}>{t('plants:clone.showingMotherPlants')}</Text>
              </View>
            )}
            <ScrollView>
              {parentOptions.map((plant) => (
                <TouchableOpacity
                  key={plant.id}
                  style={styles.parentOption}
                  onPress={() => {
                    setSelectedParentPlant(plant);
                    setParentModalVisible(false);
                  }}
                >
                  <View style={styles.parentOptionIcon}>
                    <Ionicons name="leaf" size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.parentOptionInfo}>
                    <View style={styles.parentOptionHeader}>
                      <Text style={styles.parentOptionName}>{plant.name}</Text>
                      {plant.isMotherPlant && (
                        <View style={styles.motherBadgeSmall}>
                          <Ionicons name="star" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.parentOptionStrain}>{plant.strain}</Text>
                    <Text style={styles.parentOptionControl}>#{plant.controlNumber}</Text>
                  </View>
                  {selectedParentPlant?.id === plant.id && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title={t('common:cancel')}
              onPress={() => setParentModalVisible(false)}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
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
  // Source Type Selector
  sourceTypeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  sourceTypeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    gap: 4,
  },
  sourceTypeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  sourceTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  sourceTypeTextActive: {
    color: '#fff',
  },
  // Conditional sections
  conditionalSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8f5e9',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#E65100',
    flex: 1,
  },
  // Parent Plant Selector
  parentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  selectedParent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  parentInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  parentControl: {
    fontSize: 12,
    color: '#666',
  },
  parentPlaceholder: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  motherBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  motherBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  noParentsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  noParentsText: {
    fontSize: 14,
    color: '#666',
  },
  // Stage Selector
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
  // Mother Plant Toggle
  motherPlantSection: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  motherPlantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  motherPlantLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  motherPlantTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  motherPlantHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  // Expandable Chemotype Section
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  expandableTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandableTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chemotypeSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8f5e9',
  },
  chemotypeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chemotypeInput: {
    flex: 1,
  },
  // Submit Button
  submitButton: {
    marginTop: 24,
  },
  // Empty State
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
  // Modals
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
  modalSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  modalSubtitleText: {
    fontSize: 13,
    color: '#4CAF50',
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
  // Parent Plant Modal
  parentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  parentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  parentOptionInfo: {
    flex: 1,
  },
  parentOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  parentOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  motherBadgeSmall: {
    backgroundColor: '#4CAF50',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parentOptionStrain: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  parentOptionControl: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  // Genetics Library Selector
  geneticSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8BC34A',
    borderStyle: 'dashed',
  },
  selectedGenetic: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  geneticIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  geneticSelectorText: {
    flex: 1,
  },
  geneticSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  geneticSelectorBreeder: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  clearGeneticButton: {
    padding: 4,
  },
  geneticPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  geneticPlaceholderText: {
    fontSize: 14,
    color: '#8BC34A',
    fontWeight: '500',
  },
  geneticAutoFillNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  geneticAutoFillText: {
    fontSize: 12,
    color: '#8BC34A',
    fontStyle: 'italic',
  },
  createGeneticsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f1f8e9',
    borderRadius: 10,
    marginBottom: 16,
  },
  createGeneticsText: {
    fontSize: 14,
    color: '#8BC34A',
    fontWeight: '500',
  },
  // Genetics Modal
  geneticsModalScroll: {
    maxHeight: 400,
  },
  geneticOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  geneticOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  geneticOptionInfo: {
    flex: 1,
  },
  geneticOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  geneticOptionBreeder: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  geneticOptionTags: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  geneticTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  geneticTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
});
