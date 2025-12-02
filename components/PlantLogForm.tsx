import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlantLogType, NutrientEntry, MediumType } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { LogTypeSelector, LogTypeBadge, getLogTypeInfo } from './LogTypeSelector';

interface PlantLogFormData {
  logType: PlantLogType;
  waterAmountMl?: number;
  phLevel?: number;
  ecPpm?: number;
  runoffPh?: number;
  runoffEc?: number;
  nutrients?: NutrientEntry[];
  mediumType?: MediumType;
  mediumBrand?: string;
  mediumAmount?: string;
  amendmentsAdded?: string[];
  trainingMethod?: string;
  branchesAffected?: number;
  trainingNotes?: string;
  leavesRemoved?: number;
  fanLeaves?: boolean;
  sugarLeaves?: boolean;
  fromPotSize?: string;
  toPotSize?: string;
  rootBound?: boolean;
  pestType?: string;
  diseaseType?: string;
  treatmentProduct?: string;
  treatmentBrand?: string;
  applicationMethod?: string;
  foliarProduct?: string;
  foliarDilution?: string;
  notes?: string;
}

interface PlantLogFormProps {
  initialLogType?: PlantLogType;
  onSubmit: (data: PlantLogFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

const MEDIUM_TYPES: { value: MediumType; label: string }[] = [
  { value: 'soil', label: 'Soil' },
  { value: 'coco', label: 'Coco Coir' },
  { value: 'perlite', label: 'Perlite' },
  { value: 'vermiculite', label: 'Vermiculite' },
  { value: 'rockwool', label: 'Rockwool' },
  { value: 'clay_pebbles', label: 'Clay Pebbles' },
  { value: 'dwc', label: 'DWC (Deep Water Culture)' },
  { value: 'nft', label: 'NFT' },
  { value: 'other', label: 'Other' },
];

const APPLICATION_METHODS = [
  'Spray',
  'Drench',
  'Foliar',
  'Root Application',
  'Systemic',
  'Other',
];

export const PlantLogForm: React.FC<PlantLogFormProps> = ({
  initialLogType = 'watering',
  onSubmit,
  onCancel,
  submitLabel = 'Save Log',
  isLoading = false,
}) => {
  const [logType, setLogType] = useState<PlantLogType>(initialLogType);
  const [typeModalVisible, setTypeModalVisible] = useState(false);

  // Feeding fields
  const [waterAmountMl, setWaterAmountMl] = useState('');
  const [phLevel, setPhLevel] = useState('');
  const [ecPpm, setEcPpm] = useState('');
  const [runoffPh, setRunoffPh] = useState('');
  const [runoffEc, setRunoffEc] = useState('');
  const [nutrients, setNutrients] = useState<NutrientEntry[]>([]);
  const [newNutrientName, setNewNutrientName] = useState('');
  const [newNutrientAmount, setNewNutrientAmount] = useState('');
  const [newNutrientBrand, setNewNutrientBrand] = useState('');

  // Medium fields
  const [mediumType, setMediumType] = useState<MediumType | undefined>();
  const [mediumBrand, setMediumBrand] = useState('');
  const [mediumAmount, setMediumAmount] = useState('');
  const [amendments, setAmendments] = useState('');

  // Training fields
  const [trainingMethod, setTrainingMethod] = useState('');
  const [branchesAffected, setBranchesAffected] = useState('');
  const [trainingNotes, setTrainingNotes] = useState('');

  // Defoliation fields
  const [leavesRemoved, setLeavesRemoved] = useState('');
  const [fanLeaves, setFanLeaves] = useState(true);
  const [sugarLeaves, setSugarLeaves] = useState(false);

  // Transplant fields
  const [fromPotSize, setFromPotSize] = useState('');
  const [toPotSize, setToPotSize] = useState('');
  const [rootBound, setRootBound] = useState(false);

  // Treatment fields
  const [pestType, setPestType] = useState('');
  const [diseaseType, setDiseaseType] = useState('');
  const [treatmentProduct, setTreatmentProduct] = useState('');
  const [treatmentBrand, setTreatmentBrand] = useState('');
  const [applicationMethod, setApplicationMethod] = useState('');

  // Foliar fields
  const [foliarProduct, setFoliarProduct] = useState('');
  const [foliarDilution, setFoliarDilution] = useState('');

  // Common fields
  const [notes, setNotes] = useState('');

  const addNutrient = () => {
    if (!newNutrientName.trim()) return;
    
    const entry: NutrientEntry = {
      name: newNutrientName.trim(),
      brand: newNutrientBrand.trim() || undefined,
      amountMl: newNutrientAmount ? parseFloat(newNutrientAmount) : undefined,
    };
    
    setNutrients([...nutrients, entry]);
    setNewNutrientName('');
    setNewNutrientAmount('');
    setNewNutrientBrand('');
  };

  const removeNutrient = (index: number) => {
    setNutrients(nutrients.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const data: PlantLogFormData = {
      logType,
      notes: notes.trim() || undefined,
    };

    // Add feeding fields
    if (isFeedingType) {
      if (waterAmountMl) data.waterAmountMl = parseFloat(waterAmountMl);
      if (phLevel) data.phLevel = parseFloat(phLevel);
      if (ecPpm) data.ecPpm = parseFloat(ecPpm);
      if (runoffPh) data.runoffPh = parseFloat(runoffPh);
      if (runoffEc) data.runoffEc = parseFloat(runoffEc);
      if (nutrients.length > 0) data.nutrients = nutrients;
    }

    // Add medium fields
    if (logType === 'soil_add' || logType === 'transplant') {
      if (mediumType) data.mediumType = mediumType;
      if (mediumBrand) data.mediumBrand = mediumBrand;
      if (mediumAmount) data.mediumAmount = mediumAmount;
      if (amendments) data.amendmentsAdded = amendments.split(',').map(a => a.trim()).filter(Boolean);
    }

    // Add training fields
    if (isTrainingType) {
      if (trainingMethod) data.trainingMethod = trainingMethod;
      if (branchesAffected) data.branchesAffected = parseInt(branchesAffected, 10);
      if (trainingNotes) data.trainingNotes = trainingNotes;
    }

    // Add defoliation fields
    if (logType === 'defoliation' || logType === 'lollipopping') {
      if (leavesRemoved) data.leavesRemoved = parseInt(leavesRemoved, 10);
      data.fanLeaves = fanLeaves;
      data.sugarLeaves = sugarLeaves;
    }

    // Add transplant fields
    if (logType === 'transplant') {
      if (fromPotSize) data.fromPotSize = fromPotSize;
      if (toPotSize) data.toPotSize = toPotSize;
      data.rootBound = rootBound;
    }

    // Add treatment fields
    if (logType === 'pest_treatment' || logType === 'disease_treatment') {
      if (pestType) data.pestType = pestType;
      if (diseaseType) data.diseaseType = diseaseType;
      if (treatmentProduct) data.treatmentProduct = treatmentProduct;
      if (treatmentBrand) data.treatmentBrand = treatmentBrand;
      if (applicationMethod) data.applicationMethod = applicationMethod;
    }

    // Add foliar fields
    if (logType === 'foliar_spray') {
      if (foliarProduct) data.foliarProduct = foliarProduct;
      if (foliarDilution) data.foliarDilution = foliarDilution;
    }

    onSubmit(data);
  };

  const logTypeInfo = getLogTypeInfo(logType);
  const isFeedingType = ['watering', 'nutrient_feed', 'flush', 'foliar_spray'].includes(logType);
  const isTrainingType = ['lst', 'hst', 'topping', 'fimming', 'supercropping'].includes(logType);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Log Type Selector */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Activity Type</Text>
        <TouchableOpacity
          style={[styles.typeSelector, { borderColor: logTypeInfo.color }]}
          onPress={() => setTypeModalVisible(true)}
        >
          <LogTypeBadge logType={logType} size="medium" />
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
        <Text style={styles.typeDescription}>{logTypeInfo.description}</Text>
      </View>

      {/* Feeding Fields */}
      {isFeedingType && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="water" size={18} color="#2196F3" />
            <Text style={styles.sectionTitle}>Feeding Details</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Water Amount (ml)"
                value={waterAmountMl}
                onChangeText={setWaterAmountMl}
                placeholder="e.g., 500"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="pH Level"
                value={phLevel}
                onChangeText={setPhLevel}
                placeholder="e.g., 6.2"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="EC/PPM"
                value={ecPpm}
                onChangeText={setEcPpm}
                placeholder="e.g., 800"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Runoff measurements */}
          <Text style={styles.subLabel}>Runoff Measurements (Optional)</Text>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="Runoff pH"
                value={runoffPh}
                onChangeText={setRunoffPh}
                placeholder="e.g., 6.0"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="Runoff EC"
                value={runoffEc}
                onChangeText={setRunoffEc}
                placeholder="e.g., 900"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Nutrients - only for nutrient_feed */}
          {logType === 'nutrient_feed' && (
            <View style={styles.nutrientsSection}>
              <Text style={styles.subLabel}>Nutrients Added</Text>
              
              {nutrients.map((nutrient, index) => (
                <View key={index} style={styles.nutrientItem}>
                  <View style={styles.nutrientInfo}>
                    <Text style={styles.nutrientName}>{nutrient.name}</Text>
                    {nutrient.brand && (
                      <Text style={styles.nutrientBrand}>{nutrient.brand}</Text>
                    )}
                    {nutrient.amountMl && (
                      <Text style={styles.nutrientAmount}>{nutrient.amountMl}ml</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeNutrient(index)}>
                    <Ionicons name="close-circle" size={24} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.addNutrientRow}>
                <View style={styles.nutrientInputs}>
                  <Input
                    label="Nutrient Name"
                    value={newNutrientName}
                    onChangeText={setNewNutrientName}
                    placeholder="e.g., CalMag"
                  />
                  <View style={styles.row}>
                    <View style={styles.halfInput}>
                      <Input
                        label="Brand"
                        value={newNutrientBrand}
                        onChangeText={setNewNutrientBrand}
                        placeholder="Optional"
                      />
                    </View>
                    <View style={styles.halfInput}>
                      <Input
                        label="Amount (ml)"
                        value={newNutrientAmount}
                        onChangeText={setNewNutrientAmount}
                        placeholder="e.g., 2"
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.addNutrientButton} onPress={addNutrient}>
                  <Ionicons name="add-circle" size={28} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Training Fields */}
      {isTrainingType && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="git-branch" size={18} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Training Details</Text>
          </View>

          <Input
            label="Training Method/Technique"
            value={trainingMethod}
            onChangeText={setTrainingMethod}
            placeholder={`e.g., ${logType === 'lst' ? 'Bent main stem to 90°' : logType === 'topping' ? 'Topped at 5th node' : 'Describe technique'}`}
          />

          <Input
            label="Branches Affected"
            value={branchesAffected}
            onChangeText={setBranchesAffected}
            placeholder="Number of branches"
            keyboardType="numeric"
          />

          <Input
            label="Additional Notes"
            value={trainingNotes}
            onChangeText={setTrainingNotes}
            placeholder="Any other details..."
            multiline
            numberOfLines={2}
          />
        </View>
      )}

      {/* Defoliation Fields */}
      {(logType === 'defoliation' || logType === 'lollipopping') && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="leaf" size={18} color="#607D8B" />
            <Text style={styles.sectionTitle}>Defoliation Details</Text>
          </View>

          <Input
            label="Leaves Removed (approx)"
            value={leavesRemoved}
            onChangeText={setLeavesRemoved}
            placeholder="e.g., 15"
            keyboardType="numeric"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Fan Leaves</Text>
            <Switch
              value={fanLeaves}
              onValueChange={setFanLeaves}
              trackColor={{ false: '#e0e0e0', true: '#81C784' }}
              thumbColor={fanLeaves ? '#4CAF50' : '#f4f3f4'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Sugar Leaves</Text>
            <Switch
              value={sugarLeaves}
              onValueChange={setSugarLeaves}
              trackColor={{ false: '#e0e0e0', true: '#81C784' }}
              thumbColor={sugarLeaves ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
        </View>
      )}

      {/* Transplant Fields */}
      {logType === 'transplant' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flower" size={18} color="#8D6E63" />
            <Text style={styles.sectionTitle}>Transplant Details</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Input
                label="From Pot Size"
                value={fromPotSize}
                onChangeText={setFromPotSize}
                placeholder="e.g., 1 gallon"
              />
            </View>
            <View style={styles.halfInput}>
              <Input
                label="To Pot Size"
                value={toPotSize}
                onChangeText={setToPotSize}
                placeholder="e.g., 5 gallon"
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Was Root Bound?</Text>
            <Switch
              value={rootBound}
              onValueChange={setRootBound}
              trackColor={{ false: '#e0e0e0', true: '#81C784' }}
              thumbColor={rootBound ? '#4CAF50' : '#f4f3f4'}
            />
          </View>

          <Text style={styles.subLabel}>New Medium</Text>
          <View style={styles.mediumTypeGrid}>
            {MEDIUM_TYPES.map((medium) => (
              <TouchableOpacity
                key={medium.value}
                style={[
                  styles.mediumTypeButton,
                  mediumType === medium.value && styles.mediumTypeButtonSelected,
                ]}
                onPress={() => setMediumType(medium.value)}
              >
                <Text
                  style={[
                    styles.mediumTypeText,
                    mediumType === medium.value && styles.mediumTypeTextSelected,
                  ]}
                >
                  {medium.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Soil Add Fields */}
      {logType === 'soil_add' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={18} color="#6D4C41" />
            <Text style={styles.sectionTitle}>Medium/Amendment Details</Text>
          </View>

          <Text style={styles.subLabel}>Medium Type</Text>
          <View style={styles.mediumTypeGrid}>
            {MEDIUM_TYPES.map((medium) => (
              <TouchableOpacity
                key={medium.value}
                style={[
                  styles.mediumTypeButton,
                  mediumType === medium.value && styles.mediumTypeButtonSelected,
                ]}
                onPress={() => setMediumType(medium.value)}
              >
                <Text
                  style={[
                    styles.mediumTypeText,
                    mediumType === medium.value && styles.mediumTypeTextSelected,
                  ]}
                >
                  {medium.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Brand"
            value={mediumBrand}
            onChangeText={setMediumBrand}
            placeholder="e.g., Fox Farm Ocean Forest"
          />

          <Input
            label="Amount Added"
            value={mediumAmount}
            onChangeText={setMediumAmount}
            placeholder="e.g., 2 liters, top dress"
          />

          <Input
            label="Amendments (comma separated)"
            value={amendments}
            onChangeText={setAmendments}
            placeholder="e.g., Worm castings, Perlite, Dolomite lime"
          />
        </View>
      )}

      {/* Treatment Fields */}
      {(logType === 'pest_treatment' || logType === 'disease_treatment') && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name={logType === 'pest_treatment' ? 'bug' : 'medkit'} size={18} color="#F44336" />
            <Text style={styles.sectionTitle}>Treatment Details</Text>
          </View>

          {logType === 'pest_treatment' && (
            <Input
              label="Pest Type"
              value={pestType}
              onChangeText={setPestType}
              placeholder="e.g., Spider mites, Aphids, Fungus gnats"
            />
          )}

          {logType === 'disease_treatment' && (
            <Input
              label="Disease Type"
              value={diseaseType}
              onChangeText={setDiseaseType}
              placeholder="e.g., Powdery mildew, Root rot, Bud rot"
            />
          )}

          <Input
            label="Treatment Product"
            value={treatmentProduct}
            onChangeText={setTreatmentProduct}
            placeholder="e.g., Neem oil, Hydrogen peroxide"
          />

          <Input
            label="Brand"
            value={treatmentBrand}
            onChangeText={setTreatmentBrand}
            placeholder="Optional"
          />

          <Text style={styles.subLabel}>Application Method</Text>
          <View style={styles.methodGrid}>
            {APPLICATION_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodButton,
                  applicationMethod === method && styles.methodButtonSelected,
                ]}
                onPress={() => setApplicationMethod(method)}
              >
                <Text
                  style={[
                    styles.methodText,
                    applicationMethod === method && styles.methodTextSelected,
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Foliar Spray Fields */}
      {logType === 'foliar_spray' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={18} color="#8BC34A" />
            <Text style={styles.sectionTitle}>Foliar Spray Details</Text>
          </View>

          <Input
            label="Product/Solution"
            value={foliarProduct}
            onChangeText={setFoliarProduct}
            placeholder="e.g., Epsom salt, Cal-Mag, Silica"
          />

          <Input
            label="Dilution Ratio"
            value={foliarDilution}
            onChangeText={setFoliarDilution}
            placeholder="e.g., 1 tsp per gallon"
          />
        </View>
      )}

      {/* Notes Section - Always Visible */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="create" size={18} color="#666" />
          <Text style={styles.sectionTitle}>Notes</Text>
        </View>

        <Input
          label=""
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes about this activity..."
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Button title={submitLabel} onPress={handleSubmit} disabled={isLoading} />
        <Button title="Cancel" onPress={onCancel} variant="secondary" disabled={isLoading} />
      </View>

      {/* Log Type Modal */}
      <LogTypeSelector
        selectedType={logType}
        onSelect={setLogType}
        visible={typeModalVisible}
        onClose={() => setTypeModalVisible(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 12,
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  typeDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  // Nutrients
  nutrientsSection: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  nutrientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  nutrientInfo: {
    flex: 1,
  },
  nutrientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  nutrientBrand: {
    fontSize: 12,
    color: '#666',
  },
  nutrientAmount: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  addNutrientRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  nutrientInputs: {
    flex: 1,
  },
  addNutrientButton: {
    padding: 8,
    marginBottom: 8,
  },
  // Switch rows
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  switchLabel: {
    fontSize: 14,
    color: '#333',
  },
  // Medium type grid
  mediumTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  mediumTypeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  mediumTypeButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  mediumTypeText: {
    fontSize: 13,
    color: '#666',
  },
  mediumTypeTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Method grid
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  methodButtonSelected: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  methodText: {
    fontSize: 13,
    color: '#666',
  },
  methodTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  // Buttons
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
});

export default PlantLogForm;



