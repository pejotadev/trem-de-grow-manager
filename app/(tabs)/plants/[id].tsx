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
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getPlant,
  getPlantStages,
  getEnvironment,
  deletePlant,
  createStage,
  updatePlant,
  updateStage,
  deleteStage,
  getUserEnvironments,
  getUserPlants,
  clonePlants,
  getPlantHarvests,
  updateHarvest,
  getPlantLogs,
  getAllLogsForPlant,
  getSeedGenetic,
} from '../../../firebase/firestore';
import { Plant, Stage, StageName, Environment, PlantSourceType, GeneticInfo, Chemotype, Harvest, HarvestStatus, HarvestPurpose, PlantLog, BulkPlantLog, SeedGenetic, SeedType, PlantDominance } from '../../../types';
import { getLogTypeInfo } from '../../../components/LogTypeSelector';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { DatePicker } from '../../../components/DatePicker';
import { Loading } from '../../../components/Loading';
import { AuditHistoryModal } from '../../../components/AuditHistoryModal';
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

const SEED_TYPE_COLORS: Record<SeedType, string> = {
  regular: '#9E9E9E',
  feminized: '#E91E63',
  autoflower: '#FF9800',
  fast_version: '#03A9F4',
  cbd: '#4CAF50',
  cbg: '#8BC34A',
};

const DOMINANCE_COLORS: Record<PlantDominance, string> = {
  indica: '#7B1FA2',
  sativa: '#FF5722',
  hybrid: '#4CAF50',
  indica_dominant: '#9C27B0',
  sativa_dominant: '#FF7043',
  balanced: '#66BB6A',
};

const DOMINANCE_LABELS: Record<PlantDominance, string> = {
  indica: 'Indica',
  sativa: 'Sativa',
  hybrid: 'Hybrid',
  indica_dominant: 'Indica Dom.',
  sativa_dominant: 'Sativa Dom.',
  balanced: 'Balanced',
};

const STAGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Seedling: 'leaf-outline',
  Veg: 'leaf',
  Flower: 'flower-outline',
  Drying: 'sunny-outline',
  Curing: 'time-outline',
};

const STAGE_COLORS: Record<string, string> = {
  Seedling: '#8BC34A',
  Veg: '#4CAF50',
  Flower: '#E91E63',
  Drying: '#FF9800',
  Curing: '#9C27B0',
};

interface TimelineItem {
  id: string;
  type: 'stage' | 'harvest' | 'log';
  date: number;
  data: Stage | Harvest | PlantLog | BulkPlantLog;
  logType?: 'individual' | 'bulk';
}

export default function PlantDetailScreen() {
  const { t } = useTranslation(['plants', 'common']);
  const { id } = useLocalSearchParams();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [parentPlant, setParentPlant] = useState<Plant | null>(null);
  const [seedGenetic, setSeedGenetic] = useState<SeedGenetic | null>(null);
  const [cloneChildren, setCloneChildren] = useState<Plant[]>([]);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [plantLogs, setPlantLogs] = useState<PlantLog[]>([]);
  const [allLogs, setAllLogs] = useState<{ type: 'individual' | 'bulk'; log: PlantLog | BulkPlantLog }[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [envModalVisible, setEnvModalVisible] = useState(false);
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
  const [editAnalysisDate, setEditAnalysisDate] = useState<Date | null>(null);
  
  // Clone state
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [cloneEnvModalVisible, setCloneEnvModalVisible] = useState(false);
  const [cloneCount, setCloneCount] = useState('1');
  const [cloneStage, setCloneStage] = useState<StageName>('Seedling');
  const [cloneEnvironment, setCloneEnvironment] = useState<Environment | null>(null);
  const [cloning, setCloning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Curing transition modal state
  const [curingModalVisible, setCuringModalVisible] = useState(false);
  const [curingDryWeight, setCuringDryWeight] = useState('');
  const [curingTrimWeight, setCuringTrimWeight] = useState('');
  const [curingWasteNotes, setCuringWasteNotes] = useState('');
  const [selectedHarvestForCuring, setSelectedHarvestForCuring] = useState<Harvest | null>(null);
  const [updatingCuring, setUpdatingCuring] = useState(false);
  
  // Audit history modal state
  const [auditHistoryVisible, setAuditHistoryVisible] = useState(false);
  
  // Stage edit modal state
  const [stageEditModalVisible, setStageEditModalVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [editStageDate, setEditStageDate] = useState<Date | null>(null);
  const [updatingStage, setUpdatingStage] = useState(false);
  
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

      const [stagesData, harvestsData] = await Promise.all([
        getPlantStages(id),
        getPlantHarvests(id),
      ]);
      
      // Load all logs (individual + bulk) - may fail if index is still building
      let allLogsData: { type: 'individual' | 'bulk'; log: PlantLog | BulkPlantLog }[] = [];
      let plantLogsData: PlantLog[] = [];
      try {
        // Get all logs (no limit to show everything in timeline)
        allLogsData = await getAllLogsForPlant(id);
        // Also keep individual logs for the recent activity section (backward compatibility)
        plantLogsData = allLogsData
          .filter(item => item.type === 'individual')
          .map(item => item.log as PlantLog);
      } catch (logError: any) {
        console.warn('[PlantDetail] Failed to load plant logs (index may be building):', logError.message);
        // Fallback to individual logs only
        try {
          plantLogsData = await getPlantLogs(id, undefined, 10);
        } catch (fallbackError: any) {
          console.warn('[PlantDetail] Failed to load individual logs:', fallbackError.message);
        }
      }

      console.log('[PlantDetail] Plant data loaded:', plantData);
      setPlant(plantData);
      setEnvironment(envData);
      setStages(stagesData);
      setPlantLogs(plantLogsData);
      setAllLogs(allLogsData);
      setHarvests(harvestsData);

      // Load parent plant if this is a clone
      if (plantData.genetics?.parentPlantId || plantData.motherPlantId) {
        const parentId = plantData.genetics?.parentPlantId || plantData.motherPlantId;
        if (parentId) {
          const parent = await getPlant(parentId);
          setParentPlant(parent);
        }
      }

      // Load seed genetic library entry if linked
      if (plantData.genetics?.seedGeneticId) {
        try {
          const genetic = await getSeedGenetic(plantData.genetics.seedGeneticId);
          setSeedGenetic(genetic);
        } catch (error) {
          console.warn('[PlantDetail] Failed to load seed genetic:', error);
        }
      } else {
        setSeedGenetic(null);
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
      'Archive Plant',
      'Are you sure you want to archive this plant? The plant will be hidden from your list but can still be accessed from related harvest records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deletePlant(id);
              Alert.alert('Success', 'Plant archived successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to archive plant');
            }
          },
        },
      ]
    );
  };

  const handleUpdateStage = (newStage: StageName) => {
    const currentStage = plant?.currentStage;
    
    // Special handling for Flower → Drying: Require harvest first
    if (currentStage === 'Flower' && newStage === 'Drying') {
      if (harvests.length === 0) {
        Alert.alert(
          'Harvest Required',
          'You need to harvest this plant before moving to the Drying stage. This records the wet weight and other harvest details.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Go to Harvest',
              onPress: () => navigateToHarvest(),
            },
          ]
        );
        return;
      }
      
      // Has harvest, proceed with stage update and update harvest status
      Alert.alert(
        'Move to Drying',
        'This plant has been harvested. Update stage to Drying and set harvest status to "drying"?',
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
                  name: 'Drying',
                  startDate: now,
                });
                await updatePlant(id, { currentStage: 'Drying' });
                
                // Update the latest harvest status to 'drying'
                const latestHarvest = harvests[0]; // harvests are ordered by date desc
                if (latestHarvest && latestHarvest.status === 'fresh') {
                  await updateHarvest(latestHarvest.id, { status: 'drying' });
                }
                
                loadPlantData();
                Alert.alert('Success', 'Stage updated to Drying!');
              } catch (error) {
                Alert.alert('Error', 'Failed to update stage');
              }
            },
          },
        ]
      );
      return;
    }
    
    // Special handling for Drying → Curing: Collect dry weight and waste info
    if (currentStage === 'Drying' && newStage === 'Curing') {
      // Find the latest harvest that's in drying status
      const dryingHarvest = harvests.find(h => h.status === 'drying');
      
      if (!dryingHarvest) {
        // Check if there's any harvest at all
        if (harvests.length === 0) {
          Alert.alert(
            'No Harvest Found',
            'You need to harvest and dry this plant before moving to the Curing stage.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // There are harvests but none in drying status - maybe already curing
        const alreadyCuringHarvest = harvests.find(h => h.status === 'curing' || h.status === 'processed');
        if (alreadyCuringHarvest) {
          // Allow stage update without modal since harvest already processed
          Alert.alert(
            'Update Stage',
            'Change stage to Curing?',
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
                      name: 'Curing',
                      startDate: now,
                    });
                    await updatePlant(id, { currentStage: 'Curing' });
                    loadPlantData();
                    Alert.alert('Success', 'Stage updated!');
                  } catch (error) {
                    Alert.alert('Error', 'Failed to update stage');
                  }
                },
              },
            ]
          );
          return;
        }
        
        // Has fresh harvest, needs to go through drying first
        Alert.alert(
          'Drying Required',
          'The harvest needs to be in the Drying stage before moving to Curing. Please update the harvest status first.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Open the curing modal to collect dry weight
      setSelectedHarvestForCuring(dryingHarvest);
      setCuringDryWeight('');
      setCuringTrimWeight('');
      setCuringWasteNotes('');
      setCuringModalVisible(true);
      return;
    }
    
    // Standard stage update for other transitions
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
  
  // Handle curing transition with dry weight data
  const handleCuringSubmit = async () => {
    if (!selectedHarvestForCuring || !id || typeof id !== 'string') return;
    
    // Validate dry weight
    const dryWeightNum = parseFloat(curingDryWeight);
    if (!curingDryWeight.trim() || isNaN(dryWeightNum) || dryWeightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid dry weight');
      return;
    }
    
    // Validate dry weight is less than wet weight
    if (dryWeightNum > selectedHarvestForCuring.wetWeightGrams) {
      Alert.alert('Error', 'Dry weight cannot be greater than wet weight');
      return;
    }
    
    const trimWeightNum = curingTrimWeight.trim() ? parseFloat(curingTrimWeight) : undefined;
    if (curingTrimWeight.trim() && (isNaN(trimWeightNum!) || trimWeightNum! < 0)) {
      Alert.alert('Error', 'Please enter a valid trim/waste weight');
      return;
    }
    
    setUpdatingCuring(true);
    
    try {
      const now = Date.now();
      
      // Update plant stage to Curing
      await createStage({
        plantId: id,
        name: 'Curing',
        startDate: now,
      });
      await updatePlant(id, { currentStage: 'Curing' });
      
      // Update harvest with dry weight and status
      const harvestUpdate: Partial<Harvest> = {
        status: 'curing',
        dryWeightGrams: dryWeightNum,
      };
      
      if (trimWeightNum !== undefined) {
        harvestUpdate.trimWeightGrams = trimWeightNum;
      }
      
      // Calculate final weight if trim is provided
      if (trimWeightNum !== undefined) {
        harvestUpdate.finalWeightGrams = dryWeightNum - trimWeightNum;
      }
      
      if (curingWasteNotes.trim()) {
        // Append waste notes to existing notes
        const existingNotes = selectedHarvestForCuring.notes || '';
        harvestUpdate.notes = existingNotes 
          ? `${existingNotes}\n\n[Curing] ${curingWasteNotes.trim()}`
          : `[Curing] ${curingWasteNotes.trim()}`;
      }
      
      await updateHarvest(selectedHarvestForCuring.id, harvestUpdate);
      
      // Calculate drying loss percentage
      const dryingLoss = ((selectedHarvestForCuring.wetWeightGrams - dryWeightNum) / selectedHarvestForCuring.wetWeightGrams * 100).toFixed(1);
      
      setCuringModalVisible(false);
      loadPlantData();
      
      Alert.alert(
        'Moved to Curing! 🎉',
        `Dry Weight: ${dryWeightNum}g\nDrying Loss: ${dryingLoss}%${trimWeightNum ? `\nTrim/Waste: ${trimWeightNum}g` : ''}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('[PlantDetail] Error updating to curing:', error);
      Alert.alert('Error', 'Failed to update: ' + (error.message || 'Unknown error'));
    } finally {
      setUpdatingCuring(false);
    }
  };

  const handleEditPress = () => {
    if (plant) {
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
        ? new Date(plant.chemotype.analysisDate) 
        : null);
      
      setEditModalVisible(true);
    }
  };

  const handleEditSave = async () => {
    if (!editStrain) {
      Alert.alert('Error', 'Please enter a strain');
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
      const hasChemotypeData = editThcPercent.trim() || editCbdPercent.trim() || editCbgPercent.trim() || editLabName.trim() || editAnalysisDate;
      
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
        if (editAnalysisDate) {
          updatedChemotype.analysisDate = editAnalysisDate.getTime();
        }
      }

      // Build update object
      const updateData: any = {
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

  const navigateToSeedGenetic = () => {
    if (seedGenetic) {
      router.push(`/(tabs)/genetics/${seedGenetic.id}`);
    }
  };

  const navigateToClone = (cloneId: string) => {
    router.push(`/(tabs)/plants/${cloneId}`);
  };

  const navigateToHarvest = () => {
    router.push(`/(tabs)/plants/harvest?plantId=${id}`);
  };

  const canHarvest = plant?.currentStage && HARVESTABLE_STAGES.includes(plant.currentStage);

  // Build unified timeline from stages, harvests, and all logs
  const buildTimeline = (): TimelineItem[] => {
    const timelineItems: TimelineItem[] = [];

    // Add stages
    stages.forEach(stage => {
      timelineItems.push({
        id: `stage-${stage.id}`,
        type: 'stage',
        date: stage.startDate,
        data: stage,
      });
    });

    // Add harvests
    harvests.forEach(harvest => {
      timelineItems.push({
        id: `harvest-${harvest.id}`,
        type: 'harvest',
        date: harvest.harvestDate,
        data: harvest,
      });
    });

    // Add all logs (individual + bulk)
    allLogs.forEach(logItem => {
      timelineItems.push({
        id: logItem.type === 'individual' 
          ? `log-${(logItem.log as PlantLog).id}` 
          : `bulk-log-${(logItem.log as BulkPlantLog).id}`,
        type: 'log',
        date: logItem.log.date,
        data: logItem.log,
        logType: logItem.type,
      });
    });

    // Sort by date descending (newest first)
    timelineItems.sort((a, b) => b.date - a.date);

    return timelineItems;
  };

  const timeline = buildTimeline();

  // Handle stage edit
  const handleStageEditPress = (stage: Stage) => {
    setSelectedStage(stage);
    setEditStageDate(new Date(stage.startDate));
    setStageEditModalVisible(true);
  };

  const handleStageEditSave = async () => {
    if (!selectedStage || !editStageDate) return;
    
    setUpdatingStage(true);
    try {
      await updateStage(selectedStage.id, {
        startDate: editStageDate.getTime(),
      });
      setStageEditModalVisible(false);
      loadPlantData();
      Alert.alert('Success', 'Stage date updated!');
    } catch (error: any) {
      console.error('[PlantDetail] Error updating stage:', error);
      Alert.alert('Error', 'Failed to update stage: ' + (error.message || 'Unknown error'));
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleStageDelete = () => {
    if (!selectedStage) return;
    
    Alert.alert(
      'Delete Stage',
      `Are you sure you want to delete the "${selectedStage.name}" stage record?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteStage(selectedStage.id);
              setStageEditModalVisible(false);
              loadPlantData();
              Alert.alert('Success', 'Stage record deleted!');
            } catch (error: any) {
              console.error('[PlantDetail] Error deleting stage:', error);
              Alert.alert('Error', 'Failed to delete stage: ' + (error.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

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
        {/* Archived Notice (for soft-deleted plants) */}
        {plant.deletedAt && (
          <View style={styles.archivedNotice}>
            <Ionicons name="archive-outline" size={20} color="#fff" />
            <View style={styles.archivedNoticeContent}>
              <Text style={styles.archivedNoticeTitle}>Archived Plant</Text>
              <Text style={styles.archivedNoticeText}>
                This plant was archived on {format(new Date(plant.deletedAt), 'MMM dd, yyyy')}. 
                You can view it from related harvest records.
              </Text>
            </View>
          </View>
        )}

        {/* Plant Info */}
        <Card>
          <View style={styles.plantHeader}>
            <View style={styles.plantHeaderContent}>
              <View style={styles.nameRow}>
                <Text style={[styles.plantStrain, plant.deletedAt ? styles.plantNameArchived : undefined]}>{plant.strain}</Text>
                <View style={styles.controlBadge}>
                  <Text style={styles.controlText}>#{plant.controlNumber}</Text>
                </View>
              </View>
              <View style={styles.badgeRow}>
                {plant.deletedAt && (
                  <View style={styles.archivedBadge}>
                    <Ionicons name="archive-outline" size={12} color="#fff" />
                    <Text style={styles.archivedBadgeText}>Archived</Text>
                  </View>
                )}
                {plant.currentStage && (
                  <View style={[styles.badge, plant.deletedAt ? styles.badgeArchived : undefined]}>
                    <Text style={styles.badgeText}>{t(`common:stages.${plant.currentStage.toLowerCase()}`)}</Text>
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
            {!plant.deletedAt && (
              <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
                <Ionicons name="pencil" size={24} color="#4CAF50" />
              </TouchableOpacity>
            )}
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
                  Cloned from: <Text style={styles.parentLinkName}>{parentPlant.strain}</Text>
                </Text>
                <View style={styles.parentControlBadge}>
                  <Text style={styles.parentControlText}>#{parentPlant.controlNumber}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            )}

            {/* Seed Genetic Library Link */}
            {seedGenetic && (
              <TouchableOpacity style={styles.seedGeneticLink} onPress={navigateToSeedGenetic}>
                <View style={styles.seedGeneticHeader}>
                  <Ionicons name="library" size={18} color="#8BC34A" />
                  <Text style={styles.seedGeneticLabel}>From Genetics Library:</Text>
                </View>
                <View style={styles.seedGeneticContent}>
                  <View style={[
                    styles.seedGeneticIcon,
                    { backgroundColor: seedGenetic.seedType ? SEED_TYPE_COLORS[seedGenetic.seedType] + '20' : '#8BC34A20' },
                  ]}>
                    <Ionicons
                      name="leaf"
                      size={22}
                      color={seedGenetic.seedType ? SEED_TYPE_COLORS[seedGenetic.seedType] : '#8BC34A'}
                    />
                  </View>
                  <View style={styles.seedGeneticInfo}>
                    <Text style={styles.seedGeneticName}>{seedGenetic.name}</Text>
                    {seedGenetic.breeder && (
                      <Text style={styles.seedGeneticBreeder}>by {seedGenetic.breeder}</Text>
                    )}
                    <View style={styles.seedGeneticBadges}>
                      {seedGenetic.seedType && (
                        <View style={[styles.seedTypeBadgeSmall, { backgroundColor: SEED_TYPE_COLORS[seedGenetic.seedType] }]}>
                          <Text style={styles.seedTypeBadgeSmallText}>
                            {seedGenetic.seedType.replace('_', ' ')}
                          </Text>
                        </View>
                      )}
                      {seedGenetic.dominance && (
                        <View style={[styles.dominanceBadge, { backgroundColor: DOMINANCE_COLORS[seedGenetic.dominance] }]}>
                          <Text style={styles.dominanceBadgeText}>
                            {DOMINANCE_LABELS[seedGenetic.dominance]}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
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
                  <Text style={styles.cloneChildName}>{clone.strain}</Text>
                  <Text style={styles.cloneChildControl}>#{clone.controlNumber}</Text>
                </View>
                {clone.currentStage && (
                  <View style={styles.cloneChildStageBadge}>
                    <Text style={styles.cloneChildStageText}>{t(`common:stages.${clone.currentStage.toLowerCase()}`)}</Text>
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
          
          {/* Stage transition hints */}
          {plant.currentStage === 'Flower' && harvests.length === 0 && (
            <View style={styles.stageHint}>
              <Ionicons name="alert-circle" size={16} color="#FF9800" />
              <Text style={styles.stageHintText}>
                Harvest required before moving to Drying
              </Text>
            </View>
          )}
          {plant.currentStage === 'Drying' && (
            <View style={styles.stageHintCuring}>
              <Ionicons name="information-circle" size={16} color="#9C27B0" />
              <Text style={styles.stageHintCuringText}>
                Moving to Curing will collect dry weight & waste info
              </Text>
            </View>
          )}
          
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
                    {t(`common:stages.${stage.toLowerCase()}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.stageRow}>
              {STAGES.slice(3, 5).map((stage) => {
                // Check for special indicators
                const needsHarvest = stage === 'Drying' && plant.currentStage === 'Flower' && harvests.length === 0;
                const willCollectDryWeight = stage === 'Curing' && plant.currentStage === 'Drying';
                
                return (
                  <TouchableOpacity
                    key={stage}
                    style={[
                      styles.stageButtonWide,
                      plant.currentStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                      needsHarvest && styles.stageButtonNeedsAction,
                      willCollectDryWeight && styles.stageButtonCuring,
                    ]}
                    onPress={() => handleUpdateStage(stage)}
                  >
                    <View style={styles.stageButtonContent}>
                      {needsHarvest && (
                        <Ionicons name="cut-outline" size={14} color="#fff" style={styles.stageButtonIcon} />
                      )}
                      {willCollectDryWeight && (
                        <Ionicons name="scale-outline" size={14} color="#fff" style={styles.stageButtonIcon} />
                      )}
                      <Text
                        style={[
                          styles.stageButtonText,
                          plant.currentStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                        ]}
                      >
                        {t(`common:stages.${stage.toLowerCase()}`)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Stage History */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stage History ({stages.length})</Text>
            {!plant.deletedAt && stages.length > 0 && (
              <Text style={styles.tapToEditHint}>Tap to edit dates</Text>
            )}
          </View>
          {stages.length > 0 ? (
            stages.map((stage) => (
              <TouchableOpacity 
                key={stage.id} 
                style={styles.stageHistoryItem}
                onPress={() => !plant.deletedAt && handleStageEditPress(stage)}
                disabled={!!plant.deletedAt}
              >
                <View style={styles.stageHistoryIcon}>
                  <Ionicons name="git-branch-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.stageHistoryContent}>
                  <Text style={styles.stageHistoryTitle}>{t(`common:stages.${stage.name.toLowerCase()}`)}</Text>
                  <Text style={styles.stageHistoryDate}>
                    {format(new Date(stage.startDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
                {!plant.deletedAt && (
                  <Ionicons name="create-outline" size={18} color="#999" />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No stage history</Text>
          )}
        </Card>

        {/* Timeline View - All Events */}
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="time-outline" size={20} color="#333" />
              <Text style={styles.sectionTitle}>Timeline ({timeline.length})</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/logs/plant-log')}>
              <Text style={styles.viewAll}>Add Log</Text>
            </TouchableOpacity>
          </View>
          
          {timeline.length === 0 ? (
            <View style={styles.emptyTimelineContainer}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No timeline events yet</Text>
              <Text style={styles.emptyTimelineSubtext}>
                Stage changes, harvests, and activity logs will appear here.
              </Text>
              <TouchableOpacity 
                style={styles.addLogButton}
                onPress={() => router.push('/(tabs)/logs/plant-log')}
              >
                <Text style={styles.addLogButtonText}>+ Add Activity Log</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              {timeline.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === timeline.length - 1;

                // Render stage
                if (item.type === 'stage') {
                  const stage = item.data as Stage;
                  const stageColor = STAGE_COLORS[stage.name] || '#4CAF50';
                  const stageIcon = STAGE_ICONS[stage.name] || 'leaf';

                  return (
                    <View key={item.id} style={styles.timelineItem}>
                      <View style={styles.timelineConnector}>
                        {!isFirst && <View style={styles.connectorLineTop} />}
                        <View style={[styles.timelineDot, { backgroundColor: stageColor }]}>
                          <Ionicons name={stageIcon} size={14} color="#fff" />
                        </View>
                        {!isLast && <View style={styles.connectorLineBottom} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={[styles.timelineCard, { borderLeftColor: stageColor }]}>
                          <View style={styles.timelineCardHeader}>
                            <Text style={[styles.timelineCardTitle, { color: stageColor }]}>
                              {t(`common:stages.${stage.name.toLowerCase()}`)}
                            </Text>
                            <View style={[styles.timelineBadge, { backgroundColor: stageColor }]}>
                              <Text style={styles.timelineBadgeText}>Stage</Text>
                            </View>
                          </View>
                          <Text style={styles.timelineDate}>
                            {format(new Date(stage.startDate), 'EEEE, MMM dd, yyyy • h:mm a')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                }

                // Render harvest
                if (item.type === 'harvest') {
                  const harvest = item.data as Harvest;

                  return (
                    <View key={item.id} style={styles.timelineItem}>
                      <View style={styles.timelineConnector}>
                        {!isFirst && <View style={styles.connectorLineTop} />}
                        <View style={[styles.timelineDot, { backgroundColor: HARVEST_STATUS_COLORS[harvest.status] }]}>
                          <Ionicons name="cut" size={14} color="#fff" />
                        </View>
                        {!isLast && <View style={styles.connectorLineBottom} />}
                      </View>
                      <View style={styles.timelineContent}>
                        <View style={[styles.timelineCard, { borderLeftColor: HARVEST_STATUS_COLORS[harvest.status] }]}>
                          <View style={styles.timelineCardHeader}>
                            <Text style={[styles.timelineCardTitle, { color: HARVEST_STATUS_COLORS[harvest.status] }]}>
                              Harvest #{harvest.controlNumber}
                            </Text>
                            <View style={[styles.timelineBadge, { backgroundColor: HARVEST_STATUS_COLORS[harvest.status] }]}>
                              <Text style={styles.timelineBadgeText}>{harvest.status}</Text>
                            </View>
                          </View>
                          <Text style={styles.timelineDate}>
                            {format(new Date(harvest.harvestDate), 'EEEE, MMM dd, yyyy • h:mm a')}
                          </Text>
                          <View style={styles.timelineDetails}>
                            <Text style={styles.timelineDetailText}>
                              {harvest.wetWeightGrams}g wet
                              {harvest.dryWeightGrams && ` → ${harvest.dryWeightGrams}g dry`}
                            </Text>
                            <Text style={styles.timelineDetailSubtext}>
                              {HARVEST_PURPOSE_LABELS[harvest.purpose]}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }

                // Render log (individual or bulk)
                const log = item.data as PlantLog | BulkPlantLog;
                const isBulk = item.logType === 'bulk';
                const typeInfo = getLogTypeInfo(log.logType);

                return (
                  <View key={item.id} style={styles.timelineItem}>
                    <View style={styles.timelineConnector}>
                      {!isFirst && <View style={styles.connectorLineTop} />}
                      <View style={[styles.timelineDot, { backgroundColor: typeInfo.color }]}>
                        <Ionicons name={typeInfo.icon as any} size={14} color="#fff" />
                      </View>
                      {!isLast && <View style={styles.connectorLineBottom} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <View style={[styles.timelineCard, { borderLeftColor: typeInfo.color }]}>
                        <View style={styles.timelineCardHeader}>
                          <View style={styles.timelineCardTitleRow}>
                            <Text style={[styles.timelineCardTitle, { color: typeInfo.color }]}>
                              {typeInfo.label}
                            </Text>
                            {isBulk && (
                              <View style={styles.bulkTimelineBadge}>
                                <Ionicons name="layers" size={10} color="#7B1FA2" />
                                <Text style={styles.bulkTimelineBadgeText}>Bulk</Text>
                              </View>
                            )}
                            {(log as PlantLog).fromBulkUpdate && !isBulk && (
                              <View style={styles.bulkTimelineBadge}>
                                <Ionicons name="layers" size={10} color="#7B1FA2" />
                                <Text style={styles.bulkTimelineBadgeText}>Bulk</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Text style={styles.timelineDate}>
                          {format(new Date(log.date), 'EEEE, MMM dd, yyyy • h:mm a')}
                        </Text>
                        <View style={styles.timelineDetails}>
                          {log.waterAmountMl && (
                            <Text style={styles.timelineDetailBadge}>💧 {log.waterAmountMl}ml</Text>
                          )}
                          {log.phLevel && (
                            <Text style={styles.timelineDetailBadge}>pH {log.phLevel}</Text>
                          )}
                          {log.nutrients && log.nutrients.length > 0 && (
                            <Text style={styles.timelineDetailBadge}>
                              🧪 {log.nutrients.length} nutrient{log.nutrients.length > 1 ? 's' : ''}
                            </Text>
                          )}
                          {log.leavesRemoved && (
                            <Text style={styles.timelineDetailBadge}>🍃 {log.leavesRemoved} leaves</Text>
                          )}
                          {log.trainingMethod && (
                            <Text style={styles.timelineDetailBadge}>📐 {log.trainingMethod}</Text>
                          )}
                          {isBulk && (
                            <Text style={styles.timelineDetailBadge}>
                              🌱 {(log as BulkPlantLog).plantCount} plants
                            </Text>
                          )}
                        </View>
                        {log.notes && (
                          <Text style={styles.timelineNotes} numberOfLines={2}>{log.notes}</Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
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

        {/* Action Buttons - Hide for archived plants */}
        {!plant.deletedAt && (
          <>
            {/* Harvest Button - show if in harvestable stage */}
            {canHarvest && (
              <Button
                title="🌿 Harvest This Plant"
                onPress={navigateToHarvest}
                variant="primary"
              />
            )}

            <Button title="Clone Plant" onPress={handleClonePress} variant="secondary" />
          </>
        )}
        
        {/* View History Button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setAuditHistoryVisible(true)}
        >
          <Ionicons name="time-outline" size={20} color="#607D8B" />
          <Text style={styles.historyButtonText}>View Change History</Text>
        </TouchableOpacity>
        
        {/* Delete button - only show for active plants */}
        {!plant.deletedAt && (
          <Button title="Archive Plant" onPress={handleDelete} variant="danger" />
        )}
        
        {/* Go Back button for archived plants */}
        {plant.deletedAt && (
          <Button title="Go Back" onPress={() => router.back()} variant="secondary" />
        )}
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
                label="Strain *"
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
              <DatePicker
                label="Analysis Date"
                value={editAnalysisDate}
                onChange={setEditAnalysisDate}
                placeholder="Select analysis date"
                maximumDate={new Date()}
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
              <Text style={styles.cloneSourceText}>{plant?.strain}</Text>
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

      {/* Audit History Modal */}
      <AuditHistoryModal
        visible={auditHistoryVisible}
        onClose={() => setAuditHistoryVisible(false)}
        entityType="plant"
        entityId={id as string}
        entityDisplayName={plant ? `${plant.strain} #${plant.controlNumber}` : undefined}
      />

      {/* Curing Transition Modal - Collect Dry Weight */}
      <Modal
        visible={curingModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCuringModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Move to Curing</Text>

            {/* Harvest Info */}
            {selectedHarvestForCuring && (
              <View style={styles.curingHarvestInfo}>
                <View style={styles.curingHarvestRow}>
                  <Ionicons name="cut" size={20} color="#FF9800" />
                  <Text style={styles.curingHarvestControl}>
                    #{selectedHarvestForCuring.controlNumber}
                  </Text>
                  <View style={styles.curingStatusBadge}>
                    <Text style={styles.curingStatusText}>drying</Text>
                  </View>
                </View>
                <View style={styles.curingWetWeightRow}>
                  <Ionicons name="water" size={16} color="#2196F3" />
                  <Text style={styles.curingWetWeightText}>
                    Wet Weight: {selectedHarvestForCuring.wetWeightGrams}g
                  </Text>
                </View>
              </View>
            )}

            {/* Info Notice */}
            <View style={styles.curingInfoNotice}>
              <Ionicons name="information-circle" size={20} color="#9C27B0" />
              <Text style={styles.curingInfoText}>
                Enter the dry weight after drying. This will calculate the drying loss and update the harvest record.
              </Text>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Dry Weight Input */}
              <Input
                label="Dry Weight (grams) *"
                value={curingDryWeight}
                onChangeText={setCuringDryWeight}
                placeholder="Enter dry weight"
                keyboardType="decimal-pad"
              />
              {selectedHarvestForCuring && curingDryWeight && (
                <View style={styles.dryingLossPreview}>
                  <Text style={styles.dryingLossLabel}>Drying Loss:</Text>
                  <Text style={styles.dryingLossValue}>
                    {((selectedHarvestForCuring.wetWeightGrams - parseFloat(curingDryWeight || '0')) / selectedHarvestForCuring.wetWeightGrams * 100).toFixed(1)}%
                  </Text>
                </View>
              )}

              {/* Trim/Waste Weight Input */}
              <Input
                label="Trim/Waste Weight (grams)"
                value={curingTrimWeight}
                onChangeText={setCuringTrimWeight}
                placeholder="Optional - weight removed"
                keyboardType="decimal-pad"
              />
              {curingDryWeight && curingTrimWeight && (
                <View style={styles.finalWeightPreview}>
                  <Text style={styles.finalWeightLabel}>Final Weight:</Text>
                  <Text style={styles.finalWeightValue}>
                    {(parseFloat(curingDryWeight || '0') - parseFloat(curingTrimWeight || '0')).toFixed(1)}g
                  </Text>
                </View>
              )}

              {/* Notes */}
              <Input
                label="Waste/Processing Notes"
                value={curingWasteNotes}
                onChangeText={setCuringWasteNotes}
                placeholder="Any notes about the drying process, waste, etc."
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title={updatingCuring ? 'Updating...' : 'Confirm & Move to Curing'}
                onPress={handleCuringSubmit}
                disabled={updatingCuring}
              />
              <Button
                title="Cancel"
                onPress={() => setCuringModalVisible(false)}
                variant="secondary"
                disabled={updatingCuring}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stage Edit Modal */}
      <Modal
        visible={stageEditModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStageEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Stage Date</Text>

            {selectedStage && (
              <View style={styles.stageEditInfo}>
                <View style={styles.stageEditBadge}>
                  <Ionicons name="git-branch-outline" size={18} color="#fff" />
                  <Text style={styles.stageEditBadgeText}>
                    {t(`common:stages.${selectedStage.name.toLowerCase()}`)}
                  </Text>
                </View>
              </View>
            )}

            <DatePicker
              label="Stage Start Date"
              value={editStageDate}
              onChange={setEditStageDate}
              placeholder="Select date"
              maximumDate={new Date()}
            />

            <View style={styles.stageEditHint}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.stageEditHintText}>
                Change the date when this stage started. This affects timeline tracking and reporting.
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <Button
                title={updatingStage ? 'Saving...' : 'Save Changes'}
                onPress={handleStageEditSave}
                disabled={updatingStage}
              />
              <TouchableOpacity
                style={styles.deleteStageButton}
                onPress={handleStageDelete}
                disabled={updatingStage}
              >
                <Ionicons name="trash-outline" size={18} color="#F44336" />
                <Text style={styles.deleteStageButtonText}>Delete Stage Record</Text>
              </TouchableOpacity>
              <Button
                title="Cancel"
                onPress={() => setStageEditModalVisible(false)}
                variant="secondary"
                disabled={updatingStage}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
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
  // Archived Plant Notice
  archivedNotice: {
    flexDirection: 'row',
    backgroundColor: '#9E9E9E',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'flex-start',
    gap: 12,
  },
  archivedNoticeContent: {
    flex: 1,
  },
  archivedNoticeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  archivedNoticeText: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 18,
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#9E9E9E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  archivedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  plantNameArchived: {
    color: '#999',
  },
  badgeArchived: {
    backgroundColor: '#BDBDBD',
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
  // Seed Genetic Link styles
  seedGeneticLink: {
    backgroundColor: '#F1F8E9',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C5E1A5',
  },
  seedGeneticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  seedGeneticLabel: {
    fontSize: 12,
    color: '#558B2F',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  seedGeneticContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seedGeneticIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  seedGeneticInfo: {
    flex: 1,
  },
  seedGeneticName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#33691E',
    marginBottom: 2,
  },
  seedGeneticBreeder: {
    fontSize: 13,
    color: '#689F38',
    marginBottom: 6,
  },
  seedGeneticBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  seedTypeBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  seedTypeBadgeSmallText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  dominanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dominanceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  stageButtonNeedsAction: {
    backgroundColor: '#FF9800',
  },
  stageButtonCuring: {
    backgroundColor: '#9C27B0',
  },
  stageButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageButtonIcon: {
    marginRight: 2,
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
  stageHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  stageHintText: {
    fontSize: 13,
    color: '#E65100',
    flex: 1,
  },
  stageHintCuring: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  stageHintCuringText: {
    fontSize: 13,
    color: '#7B1FA2',
    flex: 1,
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
  activityLogIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logTitleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  bulkUpdateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E1BEE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bulkUpdateBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7B1FA2',
  },
  logDate: {
    fontSize: 12,
    color: '#999',
  },
  logDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  logDetailBadge: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyLogsContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  addLogButton: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  addLogButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  // Timeline Styles
  emptyTimelineContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTimelineSubtext: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineConnector: {
    width: 40,
    alignItems: 'center',
  },
  connectorLineTop: {
    width: 2,
    height: 16,
    backgroundColor: '#e0e0e0',
  },
  connectorLineBottom: {
    flex: 1,
    width: 2,
    backgroundColor: '#e0e0e0',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
    paddingLeft: 8,
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timelineCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  timelineCardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  timelineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timelineBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bulkTimelineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E1BEE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bulkTimelineBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7B1FA2',
  },
  timelineDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  timelineDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  timelineDetailText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  timelineDetailSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  timelineDetailBadge: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timelineNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  // Curing Modal Styles
  curingHarvestInfo: {
    backgroundColor: '#FFF3E0',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  curingHarvestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  curingHarvestControl: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flex: 1,
  },
  curingStatusBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  curingStatusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  curingWetWeightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  curingWetWeightText: {
    fontSize: 14,
    color: '#666',
  },
  curingInfoNotice: {
    flexDirection: 'row',
    backgroundColor: '#F3E5F5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  curingInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#7B1FA2',
    lineHeight: 18,
  },
  dryingLossPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  dryingLossLabel: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '500',
  },
  dryingLossValue: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  finalWeightPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  finalWeightLabel: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '500',
  },
  finalWeightValue: {
    fontSize: 16,
    color: '#1565C0',
    fontWeight: 'bold',
  },
  // History Button
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  historyButtonText: {
    fontSize: 15,
    color: '#607D8B',
    fontWeight: '500',
  },
  // Stage History styles
  tapToEditHint: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  stageHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  stageHistoryIcon: {
    marginRight: 12,
  },
  stageHistoryContent: {
    flex: 1,
  },
  stageHistoryTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  stageHistoryDate: {
    fontSize: 13,
    color: '#666',
  },
  // Stage Edit Modal styles
  stageEditInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stageEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  stageEditBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  stageEditHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  stageEditHintText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  deleteStageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  deleteStageButtonText: {
    fontSize: 15,
    color: '#F44336',
    fontWeight: '500',
  },
});
