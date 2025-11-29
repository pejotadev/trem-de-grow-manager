import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Linking,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getPlant,
  getPlantStages,
  getPlantWaterRecords,
  getEnvironment,
  deletePlant,
  createStage,
  updatePlant,
  getUserEnvironments,
  getUserPlants,
  clonePlants,
  getPlantHarvests,
} from '../../../firebase/firestore';
import { Plant, Stage, WaterRecord, StageName, Environment, PlantSourceType, GeneticInfo, Chemotype, Harvest, HarvestStatus, HarvestPurpose } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const STAGES: StageName[] = ['Seedling', 'Veg', 'Flower', 'Drying', 'Curing'];
const HARVESTABLE_STAGES: StageName[] = ['Flower', 'Drying', 'Curing'];

const HARVEST_STATUS_COLORS: Record<HarvestStatus, string> = {
  fresh: '#4CAF50',
  drying: '#FF9800',
  curing: '#9C27B0',
  processed: '#2196F3',
  distributed: '#607D8B',
};

const HARVEST_PURPOSE_LABELS: Record<HarvestPurpose, string> = {
  patient: 'Patient',
  research: 'Research',
  extract: 'Extract',
  personal: 'Personal',
  donation: 'Donation',
  other: 'Other',
};

const SOURCE_TYPE_LABELS: Record<PlantSourceType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  seed: { label: 'Seed', icon: 'ellipse', color: '#8BC34A' },
  clone: { label: 'Clone', icon: 'git-branch', color: '#4CAF50' },
  cutting: { label: 'Cutting', icon: 'cut', color: '#009688' },
  tissue_culture: { label: 'Tissue Culture', icon: 'flask', color: '#00BCD4' },
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

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [parentPlant, setParentPlant] = useState<Plant | null>(null);
  const [cloneChildren, setCloneChildren] = useState<Plant[]>([]);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterRecord[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [envModalVisible, setEnvModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStrain, setEditStrain] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  
  // Edit genetic fields
  const [editBreeder, setEditBreeder] = useState('');
  const [editSeedBank, setEditSeedBank] = useState('');
  const [editGeneticLineage, setEditGeneticLineage] = useState('');
  const [editIsMotherPlant, setEditIsMotherPlant] = useState(false);
  
  // Edit chemotype fields
  const [editThcPercent, setEditThcPercent] = useState('');
  const [editCbdPercent, setEditCbdPercent] = useState('');
  const [editCbgPercent, setEditCbgPercent] = useState('');
  const [editLabName, setEditLabName] = useState('');
  const [editAnalysisDate, setEditAnalysisDate] = useState('');
  
  // Clone state
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [cloneEnvModalVisible, setCloneEnvModalVisible] = useState(false);
  const [cloneCount, setCloneCount] = useState('1');
  const [cloneStage, setCloneStage] = useState<StageName>('Seedling');
  const [cloneEnvironment, setCloneEnvironment] = useState<Environment | null>(null);
  const [cloning, setCloning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const loadPlantData = async () => {
    if (!id || typeof id !== 'string') {
      console.log('[PlantDetail] Invalid ID:', id);
      return;
    }

    try {
      console.log('[PlantDetail] Loading plant data for ID:', id);
      
      const plantData = await getPlant(id);
      
      if (!plantData) {
        setLoading(false);
        return;
      }

      // Load environment data
      let envData: Environment | null = null;
      if (plantData.environmentId) {
        envData = await getEnvironment(plantData.environmentId);
      }

      const [stagesData, waterData, harvestsData] = await Promise.all([
        getPlantStages(id),
        getPlantWaterRecords(id),
        getPlantHarvests(id),
      ]);

      console.log('[PlantDetail] Plant data loaded:', plantData);
      setPlant(plantData);
      setEnvironment(envData);
      setStages(stagesData);
      setWaterRecords(waterData);
      setHarvests(harvestsData);

      // Load parent plant if this is a clone
      if (plantData.genetics?.parentPlantId || plantData.motherPlantId) {
        const parentId = plantData.genetics?.parentPlantId || plantData.motherPlantId;
        if (parentId) {
          const parent = await getPlant(parentId);
          setParentPlant(parent);
        }
      }
    } catch (error: any) {
      console.error('[PlantDetail] Error loading plant data:', error);
      Alert.alert('Error', 'Failed to load plant data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlantData();
    loadAllPlants();
    loadEnvironments();
  };

  const loadEnvironments = async () => {
    if (!userData) return;
    try {
      const userEnvs = await getUserEnvironments(userData.uid);
      setEnvironments(userEnvs);
    } catch (error) {
      console.error('[PlantDetail] Error loading environments:', error);
    }
  };

  const loadAllPlants = async () => {
    if (!userData) return;
    try {
      const plants = await getUserPlants(userData.uid);
      setAllPlants(plants);
      
      // Find clone children (plants that have this plant as parent)
      if (id && typeof id === 'string') {
        const children = plants.filter(p => 
          p.genetics?.parentPlantId === id || p.motherPlantId === id
        );
        setCloneChildren(children);
      }
    } catch (error) {
      console.error('[PlantDetail] Error loading plants:', error);
    }
  };

  // Reload data when screen comes into focus (e.g., after creating a harvest or environment)
  useFocusEffect(
    useCallback(() => {
      loadPlantData();
      loadAllPlants();
      loadEnvironments();
    }, [id, userData])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Plant',
      'Are you sure you want to delete this plant? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deletePlant(id);
              Alert.alert('Success', 'Plant deleted', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plant');
            }
          },
        },
      ]
    );
  };

  const handleUpdateStage = (newStage: StageName) => {
    Alert.alert(
      'Update Stage',
      `Change stage to ${newStage}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              const now = Date.now();
              await createStage({
                plantId: id,
                name: newStage,
                startDate: now,
              });
              await updatePlant(id, { currentStage: newStage });
              loadPlantData();
              Alert.alert('Success', 'Stage updated!');
            } catch (error) {
              Alert.alert('Error', 'Failed to update stage');
            }
          },
        },
      ]
    );
  };

  const handleEditPress = () => {
    if (plant) {
      setEditName(plant.name);
      setEditStrain(plant.strain);
      setSelectedEnvironment(environment);
      
      // Genetic fields
      setEditBreeder(plant.genetics?.breeder || '');
      setEditSeedBank(plant.genetics?.seedBank || '');
      setEditGeneticLineage(plant.genetics?.geneticLineage || '');
      setEditIsMotherPlant(plant.isMotherPlant || false);
      
      // Chemotype fields
      setEditThcPercent(plant.chemotype?.thcPercent?.toString() || '');
      setEditCbdPercent(plant.chemotype?.cbdPercent?.toString() || '');
      setEditCbgPercent(plant.chemotype?.cbgPercent?.toString() || '');
      setEditLabName(plant.chemotype?.labName || '');
      setEditAnalysisDate(plant.chemotype?.analysisDate 
        ? format(new Date(plant.chemotype.analysisDate), 'yyyy-MM-dd') 
        : '');
      
      setEditModalVisible(true);
    }
  };

  const handleEditSave = async () => {
    if (!editName || !editStrain) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedEnvironment) {
      Alert.alert('Error', 'Please select an environment');
      return;
    }

    if (!id || typeof id !== 'string' || !plant) return;

    try {
      // Build updated genetics - only include fields that have values
      const updatedGenetics: GeneticInfo = {
        sourceType: plant.genetics?.sourceType || 'seed',
      };
      
      // Preserve existing fields that shouldn't be changed
      if (plant.genetics?.parentPlantId) updatedGenetics.parentPlantId = plant.genetics.parentPlantId;
      if (plant.genetics?.parentControlNumber) updatedGenetics.parentControlNumber = plant.genetics.parentControlNumber;
      if (plant.genetics?.acquisitionDate) updatedGenetics.acquisitionDate = plant.genetics.acquisitionDate;
      if (plant.genetics?.acquisitionSource) updatedGenetics.acquisitionSource = plant.genetics.acquisitionSource;
      if (plant.genetics?.batchId) updatedGenetics.batchId = plant.genetics.batchId;
      
      // Update editable fields
      if (editBreeder.trim()) updatedGenetics.breeder = editBreeder.trim();
      if (editSeedBank.trim()) updatedGenetics.seedBank = editSeedBank.trim();
      if (editGeneticLineage.trim()) updatedGenetics.geneticLineage = editGeneticLineage.trim();

      // Build updated chemotype - only include if there's data
      let updatedChemotype: Chemotype | undefined;
      const hasChemotypeData = editThcPercent.trim() || editCbdPercent.trim() || editCbgPercent.trim() || editLabName.trim() || editAnalysisDate.trim();
      
      if (hasChemotypeData) {
        updatedChemotype = {
          ...(plant.chemotype || {}),
        };
        
        if (editThcPercent.trim()) {
          const thc = parseFloat(editThcPercent);
          if (!isNaN(thc)) updatedChemotype.thcPercent = thc;
        }
        if (editCbdPercent.trim()) {
          const cbd = parseFloat(editCbdPercent);
          if (!isNaN(cbd)) updatedChemotype.cbdPercent = cbd;
        }
        if (editCbgPercent.trim()) {
          const cbg = parseFloat(editCbgPercent);
          if (!isNaN(cbg)) updatedChemotype.cbgPercent = cbg;
        }
        if (editLabName.trim()) updatedChemotype.labName = editLabName.trim();
        if (editAnalysisDate.trim()) {
          const date = new Date(editAnalysisDate);
          if (!isNaN(date.getTime())) updatedChemotype.analysisDate = date.getTime();
        }
      }

      // Build update object
      const updateData: any = {
        name: editName.trim(),
        strain: editStrain.trim(),
        environmentId: selectedEnvironment.id,
        genetics: updatedGenetics,
      };

      // Only include chemotype if there's data, otherwise keep existing or omit
      if (updatedChemotype) {
        updateData.chemotype = updatedChemotype;
      }

      // Handle isMotherPlant - explicitly set true or false
      updateData.isMotherPlant = editIsMotherPlant;

      await updatePlant(id, updateData);
      setEditModalVisible(false);
      loadPlantData();
      Alert.alert('Success', 'Plant updated!');
    } catch (error: any) {
      console.error('[PlantDetail] Error updating plant:', error);
      Alert.alert('Error', 'Failed to update plant: ' + (error.message || 'Unknown error'));
    }
  };

  const handleClonePress = () => {
    setCloneCount('1');
    setCloneStage('Seedling');
    setCloneEnvironment(environments[0] || null);
    setCloneModalVisible(true);
  };

  const handleCloneSubmit = async () => {
    if (!plant || !userData || !cloneEnvironment) {
      Alert.alert('Error', 'Please select an environment');
      return;
    }

    const count = parseInt(cloneCount, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      Alert.alert('Error', 'Please enter a valid number of clones (1-100)');
      return;
    }

    setCloning(true);
    try {
      await clonePlants({
        sourcePlant: plant,
        targetEnvironmentId: cloneEnvironment.id,
        numberOfClones: count,
        stage: cloneStage,
        userId: userData.uid,
      });

      setCloneModalVisible(false);
      Alert.alert('Success', `Created ${count} clone(s) successfully!`, [
        { text: 'OK', onPress: () => {
          loadPlantData();
          loadAllPlants();
        }},
      ]);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create clones: ' + (error.message || 'Unknown error'));
    } finally {
      setCloning(false);
    }
  };

  const navigateToParent = () => {
    if (parentPlant) {
      router.push(`/(tabs)/plants/${parentPlant.id}`);
    }
  };

  const navigateToClone = (cloneId: string) => {
    router.push(`/(tabs)/plants/${cloneId}`);
  };

  const navigateToHarvest = () => {
    router.push(`/(tabs)/plants/harvest?plantId=${id}`);
  };

  const canHarvest = plant?.currentStage && HARVESTABLE_STAGES.includes(plant.currentStage);

  const openLabReport = () => {
    if (plant?.chemotype?.reportUrl) {
      Linking.openURL(plant.chemotype.reportUrl);
    }
  };

  if (loading) {
    return <Loading message="Loading plant details..." />;
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plant not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const sourceTypeInfo = plant.genetics?.sourceType 
    ? SOURCE_TYPE_LABELS[plant.genetics.sourceType] 
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Plant Info */}
        <Card>
          <View style={styles.plantHeader}>
            <View style={styles.plantHeaderContent}>
              <View style={styles.nameRow}>
                <Text style={styles.plantName}>{plant.name}</Text>
                <View style={styles.controlBadge}>
                  <Text style={styles.controlText}>#{plant.controlNumber}</Text>
                </View>
              </View>
              <Text style={styles.plantStrain}>{plant.strain}</Text>
              <View style={styles.badgeRow}>
                {plant.currentStage && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{plant.currentStage}</Text>
                  </View>
                )}
                {plant.isMotherPlant && (
                  <View style={styles.motherBadge}>
                    <Ionicons name="star" size={12} color="#fff" />
                    <Text style={styles.motherBadgeText}>Mother</Text>
                  </View>
                )}
              </View>
              <Text style={styles.date}>
                Started: {format(new Date(plant.startDate), 'MMM dd, yyyy')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
              <Ionicons name="pencil" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Genetic Info Card */}
        {(plant.genetics || plant.isMotherPlant) && (
          <Card>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.geneticIcon}>🧬</Text>
              <Text style={styles.sectionTitle}>Genetic Info</Text>
            </View>
            
            {/* Source Type */}
            {sourceTypeInfo && (
              <View style={styles.geneticRow}>
                <View style={[styles.sourceTypeBadge, { backgroundColor: sourceTypeInfo.color }]}>
                  <Ionicons name={sourceTypeInfo.icon} size={14} color="#fff" />
                  <Text style={styles.sourceTypeBadgeText}>{sourceTypeInfo.label}</Text>
                </View>
              </View>
            )}

            {/* Parent Plant Link (for clones) */}
            {parentPlant && (
              <TouchableOpacity style={styles.parentLink} onPress={navigateToParent}>
                <Ionicons name="git-branch" size={18} color="#4CAF50" />
                <Text style={styles.parentLinkText}>
                  Cloned from: <Text style={styles.parentLinkName}>{parentPlant.name}</Text>
                </Text>
                <View style={styles.parentControlBadge}>
                  <Text style={styles.parentControlText}>#{parentPlant.controlNumber}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            )}

            {/* Breeder & Seed Bank */}
            {plant.genetics?.breeder && (
              <View style={styles.geneticInfoRow}>
                <Text style={styles.geneticInfoLabel}>Breeder:</Text>
                <Text style={styles.geneticInfoValue}>{plant.genetics.breeder}</Text>
              </View>
            )}
            {plant.genetics?.seedBank && (
              <View style={styles.geneticInfoRow}>
                <Text style={styles.geneticInfoLabel}>Seed Bank:</Text>
                <Text style={styles.geneticInfoValue}>{plant.genetics.seedBank}</Text>
              </View>
            )}

            {/* Genetic Lineage */}
            {plant.genetics?.geneticLineage && (
              <View style={styles.lineageBox}>
                <Ionicons name="git-merge-outline" size={16} color="#666" />
                <Text style={styles.lineageText}>{plant.genetics.geneticLineage}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Chemotype Card */}
        {plant.chemotype && (plant.chemotype.thcPercent || plant.chemotype.cbdPercent || plant.chemotype.cbgPercent) && (
          <Card>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.geneticIcon}>🔬</Text>
              <Text style={styles.sectionTitle}>Chemotype</Text>
            </View>
            
            {/* Cannabinoid Stats Row */}
            <View style={styles.chemotypeStatsRow}>
              {plant.chemotype.thcPercent !== undefined && (
                <View style={[styles.chemotypeStat, styles.thcStat]}>
                  <Text style={styles.chemotypeStatLabel}>THC</Text>
                  <Text style={styles.chemotypeStatValue}>{plant.chemotype.thcPercent}%</Text>
                </View>
              )}
              {plant.chemotype.cbdPercent !== undefined && (
                <View style={[styles.chemotypeStat, styles.cbdStat]}>
                  <Text style={styles.chemotypeStatLabel}>CBD</Text>
                  <Text style={styles.chemotypeStatValue}>{plant.chemotype.cbdPercent}%</Text>
                </View>
              )}
              {plant.chemotype.cbgPercent !== undefined && (
                <View style={[styles.chemotypeStat, styles.cbgStat]}>
                  <Text style={styles.chemotypeStatLabel}>CBG</Text>
                  <Text style={styles.chemotypeStatValue}>{plant.chemotype.cbgPercent}%</Text>
                </View>
              )}
            </View>

            {/* Lab Info */}
            {(plant.chemotype.labName || plant.chemotype.analysisDate) && (
              <View style={styles.labInfoRow}>
                <Ionicons name="business-outline" size={14} color="#666" />
                <Text style={styles.labInfoText}>
                  {plant.chemotype.labName && `Lab: ${plant.chemotype.labName}`}
                  {plant.chemotype.labName && plant.chemotype.analysisDate && ' | '}
                  {plant.chemotype.analysisDate && `Analyzed: ${format(new Date(plant.chemotype.analysisDate), 'MMM dd, yyyy')}`}
                </Text>
              </View>
            )}

            {/* View Lab Report Button */}
            {plant.chemotype.reportUrl && (
              <TouchableOpacity style={styles.viewReportButton} onPress={openLabReport}>
                <Ionicons name="document-text-outline" size={18} color="#4CAF50" />
                <Text style={styles.viewReportText}>View Lab Report</Text>
                <Ionicons name="open-outline" size={16} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </Card>
        )}

        {/* Clone History Card */}
        {cloneChildren.length > 0 && (
          <Card>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.geneticIcon}>🌱</Text>
              <Text style={styles.sectionTitle}>Clone History ({cloneChildren.length})</Text>
            </View>
            <Text style={styles.cloneHistorySubtext}>Plants cloned from this one:</Text>
            {cloneChildren.map((clone) => (
              <TouchableOpacity 
                key={clone.id} 
                style={styles.cloneChildItem}
                onPress={() => navigateToClone(clone.id)}
              >
                <View style={styles.cloneChildIcon}>
                  <Ionicons name="leaf" size={18} color="#4CAF50" />
                </View>
                <View style={styles.cloneChildInfo}>
                  <Text style={styles.cloneChildName}>{clone.name}</Text>
                  <Text style={styles.cloneChildControl}>#{clone.controlNumber}</Text>
                </View>
                {clone.currentStage && (
                  <View style={styles.cloneChildStageBadge}>
                    <Text style={styles.cloneChildStageText}>{clone.currentStage}</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Environment Info */}
        {environment && (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/environments/${environment.id}`)}>
            <Card>
              <View style={styles.envCard}>
                <View
                  style={[
                    styles.envIconSmall,
                    { backgroundColor: ENVIRONMENT_COLORS[environment.type] + '20' },
                  ]}
                >
                  <Ionicons
                    name={ENVIRONMENT_ICONS[environment.type]}
                    size={24}
                    color={ENVIRONMENT_COLORS[environment.type]}
                  />
                </View>
                <View style={styles.envInfo}>
                  <Text style={styles.envLabel}>Environment</Text>
                  <Text style={styles.envName}>{environment.name}</Text>
                  <Text style={styles.envType}>{environment.type}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Update Stage */}
        <Card>
          <Text style={styles.sectionTitle}>Update Stage</Text>
          <View style={styles.stageGrid}>
            <View style={styles.stageRow}>
              {STAGES.slice(0, 3).map((stage) => (
                <TouchableOpacity
                  key={stage}
                  style={[
                    styles.stageButton,
                    plant.currentStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                  ]}
                  onPress={() => handleUpdateStage(stage)}
                >
                  <Text
                    style={[
                      styles.stageButtonText,
                      plant.currentStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
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
                    plant.currentStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                  ]}
                  onPress={() => handleUpdateStage(stage)}
                >
                  <Text
                    style={[
                      styles.stageButtonText,
                      plant.currentStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                    ]}
                  >
                    {stage}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Stage History */}
        <Card>
          <Text style={styles.sectionTitle}>Stage History ({stages.length})</Text>
          {stages.length > 0 ? (
            stages.map((stage) => (
              <View key={stage.id} style={styles.logItem}>
                <View style={styles.logIcon}>
                  <Ionicons name="git-branch-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logTitle}>{stage.name}</Text>
                  <Text style={styles.logDate}>
                    {format(new Date(stage.startDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No stage history</Text>
          )}
        </Card>

        {/* Recent Watering Logs */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Recent Watering ({waterRecords.length})
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/logs/watering')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {waterRecords.slice(0, 3).map((record) => (
            <View key={record.id} style={styles.logItem}>
              <View style={styles.logIcon}>
                <Ionicons name="water" size={20} color="#2196F3" />
              </View>
              <View style={styles.logContent}>
                <Text style={styles.logTitle}>
                  {record.ingredients.length} ingredient(s)
                </Text>
                <Text style={styles.logDate}>
                  {format(new Date(record.date), 'MMM dd, yyyy')}
                </Text>
                {record.notes && (
                  <Text style={styles.logNotes}>{record.notes}</Text>
                )}
              </View>
            </View>
          ))}
          {waterRecords.length === 0 && (
            <Text style={styles.emptyText}>No watering logs</Text>
          )}
        </Card>

        {/* Harvests Section */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Harvests ({harvests.length})</Text>
          </View>
          {harvests.length > 0 ? (
            harvests.map((harvest) => (
              <View key={harvest.id} style={styles.harvestItem}>
                <View style={styles.harvestIcon}>
                  <Ionicons name="cut" size={20} color="#4CAF50" />
                </View>
                <View style={styles.harvestContent}>
                  <View style={styles.harvestHeader}>
                    <Text style={styles.harvestControlNumber}>#{harvest.controlNumber}</Text>
                    <View style={[styles.harvestStatusBadge, { backgroundColor: HARVEST_STATUS_COLORS[harvest.status] }]}>
                      <Text style={styles.harvestStatusText}>{harvest.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.harvestDate}>
                    {format(new Date(harvest.harvestDate), 'MMM dd, yyyy')}
                  </Text>
                  <View style={styles.harvestDetails}>
                    <Text style={styles.harvestWeight}>
                      {harvest.wetWeightGrams}g wet
                      {harvest.dryWeightGrams && ` → ${harvest.dryWeightGrams}g dry`}
                    </Text>
                    <Text style={styles.harvestPurpose}>
                      {HARVEST_PURPOSE_LABELS[harvest.purpose]}
                    </Text>
                  </View>
                  {harvest.qualityGrade && (
                    <View style={styles.harvestGradeBadge}>
                      <Text style={styles.harvestGradeText}>Grade {harvest.qualityGrade}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No harvests recorded</Text>
          )}
        </Card>

        {/* Harvest Button - show if in harvestable stage */}
        {canHarvest && (
          <Button
            title="🌿 Harvest This Plant"
            onPress={navigateToHarvest}
            variant="primary"
          />
        )}

        <Button title="Clone Plant" onPress={handleClonePress} variant="secondary" />
        <Button title="Delete Plant" onPress={handleDelete} variant="danger" />
      </ScrollView>

      {/* Edit Plant Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Plant</Text>
            {plant && (
              <View style={styles.controlNumberDisplay}>
                <Text style={styles.controlNumberDisplayLabel}>Control Number</Text>
                <Text style={styles.controlNumberDisplayValue}>{plant.controlNumber}</Text>
                <Text style={styles.controlNumberDisplayHint}>Auto-generated, cannot be changed</Text>
              </View>
            )}
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Plant Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g., Northern Lights #1"
              />
              <Input
                label="Strain"
                value={editStrain}
                onChangeText={setEditStrain}
                placeholder="e.g., Northern Lights"
              />
              
              <Text style={styles.inputLabel}>Environment</Text>
              <TouchableOpacity
                style={styles.envSelector}
                onPress={() => setEnvModalVisible(true)}
              >
                {selectedEnvironment && (
                  <View style={styles.selectedEnv}>
                    <View
                      style={[
                        styles.envIconTiny,
                        { backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment.type] + '20' },
                      ]}
                    >
                      <Ionicons
                        name={ENVIRONMENT_ICONS[selectedEnvironment.type]}
                        size={16}
                        color={ENVIRONMENT_COLORS[selectedEnvironment.type]}
                      />
                    </View>
                    <Text style={styles.envSelectorName}>{selectedEnvironment.name}</Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {/* Genetic Info Section */}
              <View style={styles.editSectionHeader}>
                <Text style={styles.editSectionIcon}>🧬</Text>
                <Text style={styles.editSectionTitle}>Genetic Info</Text>
              </View>
              
              <Input
                label="Breeder"
                value={editBreeder}
                onChangeText={setEditBreeder}
                placeholder="e.g., Sensi Seeds"
              />
              <Input
                label="Seed Bank / Source"
                value={editSeedBank}
                onChangeText={setEditSeedBank}
                placeholder="e.g., Seedsman"
              />
              <Input
                label="Genetic Lineage"
                value={editGeneticLineage}
                onChangeText={setEditGeneticLineage}
                placeholder="e.g., OG Kush x Purple Punch"
              />

              {/* Mother Plant Toggle */}
              <View style={styles.motherToggleRow}>
                <View style={styles.motherToggleLabel}>
                  <Ionicons name="star" size={18} color="#4CAF50" />
                  <Text style={styles.motherToggleText}>Mark as Mother Plant</Text>
                </View>
                <Switch
                  value={editIsMotherPlant}
                  onValueChange={setEditIsMotherPlant}
                  trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                  thumbColor={editIsMotherPlant ? '#4CAF50' : '#f4f3f4'}
                />
              </View>

              {/* Chemotype Section */}
              <View style={styles.editSectionHeader}>
                <Text style={styles.editSectionIcon}>🔬</Text>
                <Text style={styles.editSectionTitle}>Chemotype Data</Text>
              </View>
              
              <View style={styles.chemotypeEditRow}>
                <View style={styles.chemotypeEditInput}>
                  <Input
                    label="THC %"
                    value={editThcPercent}
                    onChangeText={setEditThcPercent}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.chemotypeEditInput}>
                  <Input
                    label="CBD %"
                    value={editCbdPercent}
                    onChangeText={setEditCbdPercent}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.chemotypeEditInput}>
                  <Input
                    label="CBG %"
                    value={editCbgPercent}
                    onChangeText={setEditCbgPercent}
                    placeholder="0.0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <Input
                label="Lab Name"
                value={editLabName}
                onChangeText={setEditLabName}
                placeholder="e.g., SC Labs"
              />
              <Input
                label="Analysis Date"
                value={editAnalysisDate}
                onChangeText={setEditAnalysisDate}
                placeholder="YYYY-MM-DD"
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button title="Save Changes" onPress={handleEditSave} />
              <Button
                title="Cancel"
                onPress={() => setEditModalVisible(false)}
                variant="secondary"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                      styles.envIconTiny,
                      { backgroundColor: ENVIRONMENT_COLORS[env.type] + '20' },
                    ]}
                  >
                    <Ionicons
                      name={ENVIRONMENT_ICONS[env.type]}
                      size={16}
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

      {/* Clone Plant Modal */}
      <Modal
        visible={cloneModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCloneModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Clone Plant</Text>

            {/* Source plant info */}
            <View style={styles.cloneSourceInfo}>
              <Ionicons name="leaf" size={20} color="#4CAF50" />
              <Text style={styles.cloneSourceText}>{plant?.name}</Text>
              <View style={styles.controlBadge}>
                <Text style={styles.controlText}>#{plant?.controlNumber}</Text>
              </View>
            </View>

            {/* Genetic Inheritance Notice */}
            <View style={styles.geneticInheritanceBox}>
              <Text style={styles.geneticInheritanceIcon}>🧬</Text>
              <View style={styles.geneticInheritanceContent}>
                <Text style={styles.geneticInheritanceTitle}>Genetic Lineage Inherited</Text>
                <Text style={styles.geneticInheritanceText}>
                  Clones will inherit: {plant?.genetics?.geneticLineage || plant?.strain}
                </Text>
                {plant?.genetics?.breeder && (
                  <Text style={styles.geneticInheritanceText}>
                    Breeder: {plant.genetics.breeder}
                  </Text>
                )}
              </View>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Input
                label="Number of Clones *"
                value={cloneCount}
                onChangeText={setCloneCount}
                placeholder="1"
                keyboardType="number-pad"
              />

              {/* Environment Selection */}
              <Text style={styles.inputLabel}>Target Environment *</Text>
              <TouchableOpacity
                style={styles.envSelector}
                onPress={() => {
                  console.log('[PlantDetail] Opening clone environment modal, environments count:', environments.length);
                  setCloneModalVisible(false);
                  setTimeout(() => setCloneEnvModalVisible(true), 300);
                }}
              >
                {cloneEnvironment ? (
                  <View style={styles.selectedEnv}>
                    <View
                      style={[
                        styles.envIconTiny,
                        { backgroundColor: ENVIRONMENT_COLORS[cloneEnvironment.type] + '20' },
                      ]}
                    >
                      <Ionicons
                        name={ENVIRONMENT_ICONS[cloneEnvironment.type]}
                        size={16}
                        color={ENVIRONMENT_COLORS[cloneEnvironment.type]}
                      />
                    </View>
                    <Text style={styles.envSelectorName}>{cloneEnvironment.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.envSelectorPlaceholder}>Select environment...</Text>
                )}
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {/* Stage Selection */}
              <Text style={styles.inputLabel}>Starting Stage *</Text>
              <View style={styles.stageGrid}>
                <View style={styles.stageRow}>
                  {STAGES.slice(0, 3).map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.stageButton,
                        cloneStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                      ]}
                      onPress={() => setCloneStage(stage)}
                    >
                      <Text
                        style={[
                          styles.stageButtonText,
                          cloneStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
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
                        cloneStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                      ]}
                      onPress={() => setCloneStage(stage)}
                    >
                      <Text
                        style={[
                          styles.stageButtonText,
                          cloneStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                        ]}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Clone info hint */}
              <View style={styles.cloneHint}>
                <Ionicons name="information-circle-outline" size={16} color="#666" />
                <Text style={styles.cloneHintText}>
                  Clones will have control numbers starting with "CL", inherit genetic info, and won't include watering logs.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title={cloning ? 'Creating Clones...' : 'Create Clones'}
                onPress={handleCloneSubmit}
                disabled={cloning}
              />
              <Button
                title="Cancel"
                onPress={() => setCloneModalVisible(false)}
                variant="secondary"
                disabled={cloning}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Clone Environment Selection Modal */}
      <Modal
        visible={cloneEnvModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCloneEnvModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Target Environment</Text>
            {environments.length === 0 && (
              <Text style={styles.emptyText}>No environments available. Create one first.</Text>
            )}
            <ScrollView keyboardShouldPersistTaps="handled">
              {environments.map((env) => (
                <TouchableOpacity
                  key={env.id}
                  style={styles.envOption}
                  onPress={() => {
                    setCloneEnvironment(env);
                    setCloneEnvModalVisible(false);
                    setTimeout(() => setCloneModalVisible(true), 300);
                  }}
                >
                  <View
                    style={[
                      styles.envIconTiny,
                      { backgroundColor: ENVIRONMENT_COLORS[env.type] + '20' },
                    ]}
                  >
                    <Ionicons
                      name={ENVIRONMENT_ICONS[env.type]}
                      size={16}
                      color={ENVIRONMENT_COLORS[env.type]}
                    />
                  </View>
                  <View style={styles.envOptionText}>
                    <Text style={styles.envOptionName}>{env.name}</Text>
                    <Text style={styles.envOptionType}>{env.type}</Text>
                  </View>
                  {cloneEnvironment?.id === env.id && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => {
                setCloneEnvModalVisible(false);
                setTimeout(() => setCloneModalVisible(true), 300);
              }}
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
  scrollContent: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 16,
  },
  plantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  plantHeaderContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  plantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  controlBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  plantStrain: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  motherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  motherBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  editButton: {
    padding: 4,
  },
  // Genetic Info Card styles
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  geneticIcon: {
    fontSize: 18,
  },
  geneticRow: {
    marginBottom: 12,
  },
  sourceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sourceTypeBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  parentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 8,
  },
  parentLinkText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  parentLinkName: {
    fontWeight: '600',
    color: '#2E7D32',
  },
  parentControlBadge: {
    backgroundColor: '#c8e6c9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  parentControlText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  geneticInfoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  geneticInfoLabel: {
    fontSize: 14,
    color: '#666',
    width: 90,
  },
  geneticInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  lineageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  lineageText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    flex: 1,
  },
  // Chemotype Card styles
  chemotypeStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  chemotypeStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  thcStat: {
    backgroundColor: '#FFEBEE',
  },
  cbdStat: {
    backgroundColor: '#E3F2FD',
  },
  cbgStat: {
    backgroundColor: '#E8F5E9',
  },
  chemotypeStatLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  chemotypeStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  labInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  labInfoText: {
    fontSize: 13,
    color: '#666',
  },
  viewReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 10,
  },
  viewReportText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  // Clone History styles
  cloneHistorySubtext: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  cloneChildItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cloneChildIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cloneChildInfo: {
    flex: 1,
  },
  cloneChildName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cloneChildControl: {
    fontSize: 12,
    color: '#666',
  },
  cloneChildStageBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  cloneChildStageText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  // Environment Card
  envCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  envIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  envIconTiny: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  envInfo: {
    flex: 1,
  },
  envLabel: {
    fontSize: 12,
    color: '#999',
  },
  envName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  envType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  viewAll: {
    color: '#4CAF50',
    fontWeight: '600',
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
  logItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  logDate: {
    fontSize: 12,
    color: '#999',
  },
  logNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalButtons: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  envSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
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
  envSelectorName: {
    fontSize: 14,
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
  controlNumberDisplay: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  controlNumberDisplayLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  controlNumberDisplayValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controlNumberDisplayHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Edit Modal Section Headers
  editSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  editSectionIcon: {
    fontSize: 16,
  },
  editSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  motherToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  motherToggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  motherToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chemotypeEditRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chemotypeEditInput: {
    flex: 1,
  },
  // Clone Modal
  cloneSourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  cloneSourceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  geneticInheritanceBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  geneticInheritanceIcon: {
    fontSize: 20,
  },
  geneticInheritanceContent: {
    flex: 1,
  },
  geneticInheritanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 4,
  },
  geneticInheritanceText: {
    fontSize: 13,
    color: '#666',
  },
  cloneHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  cloneHintText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  envSelectorPlaceholder: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  // Harvest styles
  harvestItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  harvestIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  harvestContent: {
    flex: 1,
  },
  harvestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  harvestControlNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  harvestStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  harvestStatusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  harvestDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  harvestDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  harvestWeight: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  harvestPurpose: {
    fontSize: 12,
    color: '#999',
  },
  harvestGradeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  harvestGradeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
});
