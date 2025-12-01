import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlantLogType, PlantLogTypeInfo } from '../types';

// Log type configurations with display info
export const PLANT_LOG_TYPES: PlantLogTypeInfo[] = [
  // Feeding Category
  {
    type: 'watering',
    label: 'Watering',
    icon: 'water',
    color: '#2196F3',
    category: 'feeding',
    description: 'Plain water without nutrients',
  },
  {
    type: 'nutrient_feed',
    label: 'Nutrient Feed',
    icon: 'flask',
    color: '#4CAF50',
    category: 'feeding',
    description: 'Feeding with nutrient solution',
  },
  {
    type: 'flush',
    label: 'Flush',
    icon: 'water-outline',
    color: '#00BCD4',
    category: 'feeding',
    description: 'Flushing to remove salt buildup',
  },
  {
    type: 'foliar_spray',
    label: 'Foliar Spray',
    icon: 'sparkles',
    color: '#8BC34A',
    category: 'feeding',
    description: 'Leaf feeding or treatment spray',
  },
  
  // Training Category
  {
    type: 'lst',
    label: 'LST',
    icon: 'git-branch',
    color: '#9C27B0',
    category: 'training',
    description: 'Low Stress Training - bending, tying',
  },
  {
    type: 'hst',
    label: 'HST',
    icon: 'flash',
    color: '#E91E63',
    category: 'training',
    description: 'High Stress Training techniques',
  },
  {
    type: 'topping',
    label: 'Topping',
    icon: 'cut',
    color: '#FF5722',
    category: 'training',
    description: 'Cutting the main cola',
  },
  {
    type: 'fimming',
    label: 'FIMming',
    icon: 'cut-outline',
    color: '#FF9800',
    category: 'training',
    description: 'FIM technique on growth tip',
  },
  {
    type: 'supercropping',
    label: 'Supercropping',
    icon: 'swap-horizontal',
    color: '#795548',
    category: 'training',
    description: 'Stem crushing/bending technique',
  },
  
  // Maintenance Category
  {
    type: 'defoliation',
    label: 'Defoliation',
    icon: 'leaf',
    color: '#607D8B',
    category: 'maintenance',
    description: 'Removing fan leaves',
  },
  {
    type: 'lollipopping',
    label: 'Lollipopping',
    icon: 'layers',
    color: '#455A64',
    category: 'maintenance',
    description: 'Removing lower growth',
  },
  {
    type: 'transplant',
    label: 'Transplant',
    icon: 'flower',
    color: '#8D6E63',
    category: 'maintenance',
    description: 'Moving to new pot/medium',
  },
  {
    type: 'soil_add',
    label: 'Soil/Medium Add',
    icon: 'layers-outline',
    color: '#6D4C41',
    category: 'maintenance',
    description: 'Adding soil or amendments',
  },
  {
    type: 'clone_cut',
    label: 'Clone Cutting',
    icon: 'git-merge',
    color: '#4CAF50',
    category: 'maintenance',
    description: 'Taking cuttings for cloning',
  },
  {
    type: 'ph_adjustment',
    label: 'pH Adjustment',
    icon: 'analytics',
    color: '#3F51B5',
    category: 'maintenance',
    description: 'Adjusting pH levels',
  },
  
  // Treatment Category
  {
    type: 'pest_treatment',
    label: 'Pest Treatment',
    icon: 'bug',
    color: '#F44336',
    category: 'treatment',
    description: 'Treating pest infestation',
  },
  {
    type: 'disease_treatment',
    label: 'Disease Treatment',
    icon: 'medkit',
    color: '#E53935',
    category: 'treatment',
    description: 'Treating plant disease',
  },
  
  // Other Category
  {
    type: 'observation',
    label: 'Observation',
    icon: 'eye',
    color: '#9E9E9E',
    category: 'other',
    description: 'General observation or note',
  },
  {
    type: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal',
    color: '#757575',
    category: 'other',
    description: 'Other activity not listed',
  },
];

// Helper function to get log type info
export const getLogTypeInfo = (logType: PlantLogType): PlantLogTypeInfo => {
  return PLANT_LOG_TYPES.find(t => t.type === logType) || PLANT_LOG_TYPES[PLANT_LOG_TYPES.length - 1];
};

// Category labels
const CATEGORY_LABELS = {
  feeding: { label: '💧 Feeding & Watering', color: '#2196F3' },
  training: { label: '🌿 Training', color: '#9C27B0' },
  maintenance: { label: '🔧 Maintenance', color: '#607D8B' },
  treatment: { label: '🏥 Treatment', color: '#F44336' },
  other: { label: '📝 Other', color: '#9E9E9E' },
};

interface LogTypeSelectorProps {
  selectedType: PlantLogType | null;
  onSelect: (type: PlantLogType) => void;
  visible: boolean;
  onClose: () => void;
}

export const LogTypeSelector: React.FC<LogTypeSelectorProps> = ({
  selectedType,
  onSelect,
  visible,
  onClose,
}) => {
  const handleSelect = (type: PlantLogType) => {
    onSelect(type);
    onClose();
  };

  // Group by category
  const groupedTypes = PLANT_LOG_TYPES.reduce((acc, logType) => {
    if (!acc[logType.category]) {
      acc[logType.category] = [];
    }
    acc[logType.category].push(logType);
    return acc;
  }, {} as Record<string, PlantLogTypeInfo[]>);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Log Type</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {Object.entries(CATEGORY_LABELS).map(([category, { label, color }]) => {
              const types = groupedTypes[category];
              if (!types || types.length === 0) return null;

              return (
                <View key={category} style={styles.categorySection}>
                  <Text style={[styles.categoryLabel, { color }]}>{label}</Text>
                  <View style={styles.typeGrid}>
                    {types.map((logType) => (
                      <TouchableOpacity
                        key={logType.type}
                        style={[
                          styles.typeButton,
                          selectedType === logType.type && styles.typeButtonSelected,
                          { borderColor: logType.color },
                        ]}
                        onPress={() => handleSelect(logType.type)}
                      >
                        <View
                          style={[
                            styles.typeIconContainer,
                            { backgroundColor: logType.color + '20' },
                            selectedType === logType.type && { backgroundColor: logType.color },
                          ]}
                        >
                          <Ionicons
                            name={logType.icon as any}
                            size={20}
                            color={selectedType === logType.type ? '#fff' : logType.color}
                          />
                        </View>
                        <Text
                          style={[
                            styles.typeLabel,
                            selectedType === logType.type && styles.typeLabelSelected,
                          ]}
                        >
                          {logType.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Compact type selector for inline use
interface LogTypeBadgeProps {
  logType: PlantLogType;
  onPress?: () => void;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const LogTypeBadge: React.FC<LogTypeBadgeProps> = ({
  logType,
  onPress,
  showLabel = true,
  size = 'medium',
}) => {
  const info = getLogTypeInfo(logType);
  const iconSize = size === 'small' ? 14 : size === 'medium' ? 18 : 22;
  const containerSize = size === 'small' ? 28 : size === 'medium' ? 36 : 44;

  const content = (
    <View style={styles.badgeContainer}>
      <View
        style={[
          styles.badgeIcon,
          { 
            backgroundColor: info.color + '20',
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
          },
        ]}
      >
        <Ionicons name={info.icon as any} size={iconSize} color={info.color} />
      </View>
      {showLabel && (
        <Text style={[styles.badgeLabel, { color: info.color }]}>{info.label}</Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.badgeTouchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Quick type selector buttons (horizontal scroll)
interface QuickLogTypeSelectorProps {
  selectedType: PlantLogType | null;
  onSelect: (type: PlantLogType) => void;
  showOnlyCommon?: boolean;
}

export const QuickLogTypeSelector: React.FC<QuickLogTypeSelectorProps> = ({
  selectedType,
  onSelect,
  showOnlyCommon = false,
}) => {
  const commonTypes: PlantLogType[] = [
    'watering',
    'nutrient_feed',
    'defoliation',
    'lst',
    'topping',
    'observation',
  ];

  const typesToShow = showOnlyCommon
    ? PLANT_LOG_TYPES.filter(t => commonTypes.includes(t.type))
    : PLANT_LOG_TYPES;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickSelectorContainer}
    >
      {typesToShow.map((logType) => (
        <TouchableOpacity
          key={logType.type}
          style={[
            styles.quickTypeButton,
            selectedType === logType.type && { backgroundColor: logType.color },
          ]}
          onPress={() => onSelect(logType.type)}
        >
          <Ionicons
            name={logType.icon as any}
            size={20}
            color={selectedType === logType.type ? '#fff' : logType.color}
          />
          <Text
            style={[
              styles.quickTypeLabel,
              { color: selectedType === logType.type ? '#fff' : logType.color },
            ]}
          >
            {logType.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },

  // Category styles
  categorySection: {
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Type button styles
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    minWidth: '45%',
    flex: 1,
    maxWidth: '48%',
  },
  typeButtonSelected: {
    backgroundColor: '#f0f0f0',
  },
  typeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  typeLabelSelected: {
    fontWeight: '600',
  },

  // Badge styles
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Quick selector styles
  quickSelectorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 8,
  },
  quickTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    gap: 6,
  },
  quickTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default LogTypeSelector;


