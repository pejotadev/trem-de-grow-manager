// Export utilities for compliance reporting
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import {
  getUserPlants,
  getUserHarvests,
  getUserDistributions,
  getUserPatients,
  getUserExtracts,
  getUserEnvironments,
  getPlant,
} from '../firebase/firestore';
import { getUserWasteDisposals, getWasteDisposalStats } from '../firebase/wasteDisposal';
import { getRecentAuditLogs } from '../firebase/auditLog';
import {
  Plant,
  Harvest,
  Distribution,
  Patient,
  Extract,
  Environment,
  WasteDisposal,
  AuditLog,
} from '../types';

// ==================== REPORT DATA TYPES ====================

export interface DateRange {
  startDate: number;
  endDate: number;
}

export interface PlantReportData {
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalPlants: number;
  byStage: Record<string, number>;
  byStrain: Record<string, number>;
  plants: PlantReportItem[];
}

export interface PlantReportItem {
  controlNumber: string;
  name: string;
  strain: string;
  startDate: string;
  currentStage: string;
  environment: string;
  genetics?: {
    sourceType: string;
    parentControlNumber?: string;
    breeder?: string;
    geneticLineage?: string;
  };
  hasHarvest: boolean;
}

export interface HarvestReportData {
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalHarvests: number;
  totalWetWeight: number;
  totalDryWeight: number;
  totalDistributed: number;
  byPurpose: Record<string, { count: number; weight: number }>;
  byStatus: Record<string, number>;
  harvests: HarvestReportItem[];
}

export interface HarvestReportItem {
  controlNumber: string;
  sourcePlant: string;
  sourcePlantControlNumber: string;
  harvestDate: string;
  wetWeightGrams: number;
  dryWeightGrams?: number;
  finalWeightGrams?: number;
  distributedGrams: number;
  extractedGrams: number;
  availableGrams: number;
  status: string;
  purpose: string;
  qualityGrade?: string;
  storageLocation?: string;
}

export interface DistributionReportData {
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalDistributions: number;
  totalQuantityGrams: number;
  totalQuantityMl: number;
  byProductType: Record<string, { count: number; grams: number; ml: number }>;
  distributions: DistributionReportItem[];
}

export interface DistributionReportItem {
  distributionNumber: string;
  date: string;
  patientId: string; // Anonymized - just ID, not name
  patientInitials?: string; // Optional anonymized display
  productType: string;
  productDescription: string;
  quantityGrams?: number;
  quantityMl?: number;
  batchNumber: string;
  sourceControlNumber?: string;
  receivedBy: string;
  signatureConfirmed: boolean;
}

export interface PatientReportData {
  generatedAt: string;
  totalPatients: number;
  byStatus: Record<string, number>;
  patients: PatientReportItem[];
}

export interface PatientReportItem {
  id: string;
  initials: string; // Anonymized
  documentType: string;
  joinDate: string;
  status: string;
  hasValidPrescription: boolean;
  prescriptionExpiry?: string;
  medicalCondition?: string;
}

export interface WasteReportData {
  generatedAt: string;
  dateRange: { start: string; end: string };
  totalRecords: number;
  totalWeightGrams: number;
  byMaterialType: Record<string, { count: number; weightGrams: number }>;
  byMethod: Record<string, { count: number; weightGrams: number }>;
  disposals: WasteReportItem[];
}

export interface WasteReportItem {
  disposalDate: string;
  materialType: string;
  description: string;
  quantityGrams: number;
  disposalMethod: string;
  disposalCompany?: string;
  manifestNumber?: string;
  witnessName?: string;
  hasWitnessSignature: boolean;
  sourceControlNumber?: string;
}

export interface FullComplianceReport {
  generatedAt: string;
  dateRange: { start: string; end: string };
  summary: {
    totalPlants: number;
    totalHarvests: number;
    totalDistributions: number;
    totalPatients: number;
    totalExtracts: number;
    totalWasteDisposals: number;
    totalWasteWeightGrams: number;
    totalDistributedGrams: number;
    totalExtractedGrams: number;
  };
  plants: PlantReportData;
  harvests: HarvestReportData;
  distributions: DistributionReportData;
  patients: PatientReportData;
  waste: WasteReportData;
  auditLogSummary: {
    recentActions: number;
    byAction: Record<string, number>;
    byEntityType: Record<string, number>;
  };
}

// ==================== EXPORT FUNCTIONS ====================

/**
 * Converts data to CSV format and triggers download/share
 */
export const exportToCSV = async (data: any[], filename: string): Promise<void> => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from first object keys
  const headers = Object.keys(data[0]);
  
  // Build CSV content
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle special characters and escape quotes
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes and wrap in quotes if contains comma, newline, or quote
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    ),
  ];

  const csvContent = csvRows.join('\n');
  
  // Save to file and share
  const fileUri = `${FileSystem.cacheDirectory}${filename}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Check if sharing is available and share
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: `Export ${filename}`,
    });
  }

  return;
};

/**
 * Converts data to JSON format and triggers download/share
 */
export const exportToJSON = async (data: any, filename: string): Promise<void> => {
  const jsonContent = JSON.stringify(data, null, 2);
  
  // Save to file and share
  const fileUri = `${FileSystem.cacheDirectory}${filename}.json`;
  await FileSystem.writeAsStringAsync(fileUri, jsonContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Check if sharing is available and share
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: `Export ${filename}`,
    });
  }

  return;
};

// ==================== REPORT GENERATORS ====================

/**
 * Generate a comprehensive plant report
 */
export const generatePlantReport = async (
  userId: string,
  dateRange?: DateRange
): Promise<PlantReportData> => {
  const plants = await getUserPlants(userId);
  const harvests = await getUserHarvests(userId);
  const environments = await getUserEnvironments(userId);
  
  // Create environment lookup map
  const envMap = new Map(environments.map(e => [e.id, e.name]));
  
  // Create harvest lookup (plants that have been harvested)
  const harvestedPlantIds = new Set(harvests.map(h => h.plantId));
  
  // Filter by date range if provided
  let filteredPlants = plants;
  if (dateRange) {
    filteredPlants = plants.filter(
      p => p.startDate >= dateRange.startDate && p.startDate <= dateRange.endDate
    );
  }

  // Aggregate statistics
  const byStage: Record<string, number> = {};
  const byStrain: Record<string, number> = {};
  
  const plantItems: PlantReportItem[] = filteredPlants.map(plant => {
    // Count by stage
    const stage = plant.currentStage || 'Unknown';
    byStage[stage] = (byStage[stage] || 0) + 1;
    
    // Count by strain
    byStrain[plant.strain] = (byStrain[plant.strain] || 0) + 1;
    
    return {
      controlNumber: plant.controlNumber,
      strain: plant.strain,
      startDate: format(new Date(plant.startDate), 'yyyy-MM-dd'),
      currentStage: stage,
      environment: envMap.get(plant.environmentId) || 'Unknown',
      genetics: plant.genetics ? {
        sourceType: plant.genetics.sourceType,
        parentControlNumber: plant.genetics.parentControlNumber,
        breeder: plant.genetics.breeder,
        geneticLineage: plant.genetics.geneticLineage,
      } : undefined,
      hasHarvest: harvestedPlantIds.has(plant.id),
    };
  });

  return {
    generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    dateRange: dateRange ? {
      start: format(new Date(dateRange.startDate), 'yyyy-MM-dd'),
      end: format(new Date(dateRange.endDate), 'yyyy-MM-dd'),
    } : { start: 'All time', end: 'All time' },
    totalPlants: filteredPlants.length,
    byStage,
    byStrain,
    plants: plantItems,
  };
};

/**
 * Generate a comprehensive harvest report
 */
export const generateHarvestReport = async (
  userId: string,
  dateRange?: DateRange
): Promise<HarvestReportData> => {
  const harvests = await getUserHarvests(userId);
  const plants = await getUserPlants(userId);
  
  // Create plant lookup map
  const plantMap = new Map(plants.map(p => [p.id, p]));
  
  // Filter by date range if provided
  let filteredHarvests = harvests;
  if (dateRange) {
    filteredHarvests = harvests.filter(
      h => h.harvestDate >= dateRange.startDate && h.harvestDate <= dateRange.endDate
    );
  }

  // Aggregate statistics
  let totalWetWeight = 0;
  let totalDryWeight = 0;
  let totalDistributed = 0;
  const byPurpose: Record<string, { count: number; weight: number }> = {};
  const byStatus: Record<string, number> = {};
  
  const harvestItems: HarvestReportItem[] = filteredHarvests.map(harvest => {
    const plant = plantMap.get(harvest.plantId);
    const finalWeight = harvest.finalWeightGrams || harvest.dryWeightGrams || harvest.wetWeightGrams;
    const distributed = harvest.distributedGrams || 0;
    const extracted = harvest.extractedGrams || 0;
    const available = Math.max(0, finalWeight - distributed - extracted);
    
    // Aggregate
    totalWetWeight += harvest.wetWeightGrams;
    totalDryWeight += harvest.dryWeightGrams || 0;
    totalDistributed += distributed;
    
    // By purpose
    if (!byPurpose[harvest.purpose]) {
      byPurpose[harvest.purpose] = { count: 0, weight: 0 };
    }
    byPurpose[harvest.purpose].count++;
    byPurpose[harvest.purpose].weight += finalWeight;
    
    // By status
    byStatus[harvest.status] = (byStatus[harvest.status] || 0) + 1;
    
    return {
      controlNumber: harvest.controlNumber,
      sourcePlant: plant?.name || 'Unknown',
      sourcePlantControlNumber: plant?.controlNumber || 'Unknown',
      harvestDate: format(new Date(harvest.harvestDate), 'yyyy-MM-dd'),
      wetWeightGrams: harvest.wetWeightGrams,
      dryWeightGrams: harvest.dryWeightGrams,
      finalWeightGrams: harvest.finalWeightGrams,
      distributedGrams: distributed,
      extractedGrams: extracted,
      availableGrams: available,
      status: harvest.status,
      purpose: harvest.purpose,
      qualityGrade: harvest.qualityGrade,
      storageLocation: harvest.storageLocation,
    };
  });

  return {
    generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    dateRange: dateRange ? {
      start: format(new Date(dateRange.startDate), 'yyyy-MM-dd'),
      end: format(new Date(dateRange.endDate), 'yyyy-MM-dd'),
    } : { start: 'All time', end: 'All time' },
    totalHarvests: filteredHarvests.length,
    totalWetWeight,
    totalDryWeight,
    totalDistributed,
    byPurpose,
    byStatus,
    harvests: harvestItems,
  };
};

/**
 * Generate a distribution report with optional anonymization
 */
export const generateDistributionReport = async (
  userId: string,
  dateRange?: DateRange,
  anonymize: boolean = true
): Promise<DistributionReportData> => {
  const distributions = await getUserDistributions(userId);
  const patients = await getUserPatients(userId);
  
  // Create patient lookup map
  const patientMap = new Map(patients.map(p => [p.id, p]));
  
  // Filter by date range if provided
  let filteredDistributions = distributions;
  if (dateRange) {
    filteredDistributions = distributions.filter(
      d => d.distributionDate >= dateRange.startDate && d.distributionDate <= dateRange.endDate
    );
  }

  // Aggregate statistics
  let totalQuantityGrams = 0;
  let totalQuantityMl = 0;
  const byProductType: Record<string, { count: number; grams: number; ml: number }> = {};
  
  const distributionItems: DistributionReportItem[] = filteredDistributions.map(dist => {
    const patient = patientMap.get(dist.patientId);
    const grams = dist.quantityGrams || 0;
    const ml = dist.quantityMl || 0;
    
    // Aggregate
    totalQuantityGrams += grams;
    totalQuantityMl += ml;
    
    // By product type
    if (!byProductType[dist.productType]) {
      byProductType[dist.productType] = { count: 0, grams: 0, ml: 0 };
    }
    byProductType[dist.productType].count++;
    byProductType[dist.productType].grams += grams;
    byProductType[dist.productType].ml += ml;
    
    // Get patient initials for anonymization
    const patientInitials = patient?.name
      ? patient.name.split(' ').map(n => n[0]).join('').toUpperCase()
      : 'XX';
    
    return {
      distributionNumber: dist.distributionNumber,
      date: format(new Date(dist.distributionDate), 'yyyy-MM-dd'),
      patientId: anonymize ? `P-${dist.patientId.substring(0, 6)}` : dist.patientId,
      patientInitials: anonymize ? patientInitials : undefined,
      productType: dist.productType,
      productDescription: dist.productDescription,
      quantityGrams: dist.quantityGrams,
      quantityMl: dist.quantityMl,
      batchNumber: dist.batchNumber,
      sourceControlNumber: dist.harvestControlNumber || dist.extractControlNumber,
      receivedBy: dist.receivedBy,
      signatureConfirmed: dist.signatureConfirmation || false,
    };
  });

  return {
    generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    dateRange: dateRange ? {
      start: format(new Date(dateRange.startDate), 'yyyy-MM-dd'),
      end: format(new Date(dateRange.endDate), 'yyyy-MM-dd'),
    } : { start: 'All time', end: 'All time' },
    totalDistributions: filteredDistributions.length,
    totalQuantityGrams,
    totalQuantityMl,
    byProductType,
    distributions: distributionItems,
  };
};

/**
 * Generate a patient report (anonymized by default)
 */
export const generatePatientReport = async (
  userId: string
): Promise<PatientReportData> => {
  const patients = await getUserPatients(userId);
  
  const byStatus: Record<string, number> = {};
  
  const patientItems: PatientReportItem[] = patients.map(patient => {
    // Count by status
    byStatus[patient.status] = (byStatus[patient.status] || 0) + 1;
    
    // Check prescription validity
    const now = Date.now();
    const hasValidPrescription = patient.prescriptionExpirationDate 
      ? patient.prescriptionExpirationDate > now 
      : false;
    
    // Get initials
    const initials = patient.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
    
    return {
      id: `P-${patient.id.substring(0, 6)}`,
      initials,
      documentType: patient.documentType,
      joinDate: format(new Date(patient.joinDate), 'yyyy-MM-dd'),
      status: patient.status,
      hasValidPrescription,
      prescriptionExpiry: patient.prescriptionExpirationDate 
        ? format(new Date(patient.prescriptionExpirationDate), 'yyyy-MM-dd')
        : undefined,
      medicalCondition: patient.medicalCondition,
    };
  });

  return {
    generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    totalPatients: patients.length,
    byStatus,
    patients: patientItems,
  };
};

/**
 * Generate a waste disposal report
 */
export const generateWasteReport = async (
  userId: string,
  dateRange?: DateRange
): Promise<WasteReportData> => {
  const disposals = await getUserWasteDisposals(userId);
  
  // Filter by date range if provided
  let filteredDisposals = disposals;
  if (dateRange) {
    filteredDisposals = disposals.filter(
      d => d.disposalDate >= dateRange.startDate && d.disposalDate <= dateRange.endDate
    );
  }

  // Get stats
  const stats = await getWasteDisposalStats(
    userId,
    dateRange?.startDate,
    dateRange?.endDate
  );

  const wasteItems: WasteReportItem[] = filteredDisposals.map(disposal => ({
    disposalDate: format(new Date(disposal.disposalDate), 'yyyy-MM-dd'),
    materialType: disposal.materialType,
    description: disposal.description,
    quantityGrams: disposal.quantityGrams,
    disposalMethod: disposal.disposalMethod,
    disposalCompany: disposal.disposalCompany,
    manifestNumber: disposal.manifestNumber,
    witnessName: disposal.witnessName,
    hasWitnessSignature: disposal.witnessSignature || false,
    sourceControlNumber: disposal.sourceControlNumber,
  }));

  return {
    generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    dateRange: dateRange ? {
      start: format(new Date(dateRange.startDate), 'yyyy-MM-dd'),
      end: format(new Date(dateRange.endDate), 'yyyy-MM-dd'),
    } : { start: 'All time', end: 'All time' },
    totalRecords: stats.totalRecords,
    totalWeightGrams: stats.totalWeightGrams,
    byMaterialType: stats.byMaterialType,
    byMethod: stats.byMethod,
    disposals: wasteItems,
  };
};

/**
 * Generate a complete compliance report
 */
export const generateComplianceReport = async (
  userId: string,
  dateRange?: DateRange
): Promise<FullComplianceReport> => {
  // Generate all sub-reports
  const [plants, harvests, distributions, patients, waste, auditLogs] = await Promise.all([
    generatePlantReport(userId, dateRange),
    generateHarvestReport(userId, dateRange),
    generateDistributionReport(userId, dateRange),
    generatePatientReport(userId),
    generateWasteReport(userId, dateRange),
    getRecentAuditLogs(100),
  ]);

  // Get extracts count
  const extracts = await getUserExtracts(userId);
  let filteredExtracts = extracts;
  if (dateRange) {
    filteredExtracts = extracts.filter(
      e => e.extractionDate >= dateRange.startDate && e.extractionDate <= dateRange.endDate
    );
  }

  // Process audit log summary
  const auditByAction: Record<string, number> = {};
  const auditByEntityType: Record<string, number> = {};
  
  auditLogs.forEach(log => {
    auditByAction[log.action] = (auditByAction[log.action] || 0) + 1;
    auditByEntityType[log.entityType] = (auditByEntityType[log.entityType] || 0) + 1;
  });

  // Calculate total distributed and extracted
  let totalDistributedGrams = 0;
  let totalExtractedGrams = 0;
  
  harvests.harvests.forEach(h => {
    totalDistributedGrams += h.distributedGrams;
    totalExtractedGrams += h.extractedGrams;
  });

  return {
    generatedAt: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    dateRange: dateRange ? {
      start: format(new Date(dateRange.startDate), 'yyyy-MM-dd'),
      end: format(new Date(dateRange.endDate), 'yyyy-MM-dd'),
    } : { start: 'All time', end: 'All time' },
    summary: {
      totalPlants: plants.totalPlants,
      totalHarvests: harvests.totalHarvests,
      totalDistributions: distributions.totalDistributions,
      totalPatients: patients.totalPatients,
      totalExtracts: filteredExtracts.length,
      totalWasteDisposals: waste.totalRecords,
      totalWasteWeightGrams: waste.totalWeightGrams,
      totalDistributedGrams,
      totalExtractedGrams,
    },
    plants,
    harvests,
    distributions,
    patients,
    waste,
    auditLogSummary: {
      recentActions: auditLogs.length,
      byAction: auditByAction,
      byEntityType: auditByEntityType,
    },
  };
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Flatten nested objects for CSV export
 */
export const flattenForCSV = (data: any[]): any[] => {
  return data.map(item => {
    const flattened: Record<string, any> = {};
    
    const flatten = (obj: any, prefix: string = '') => {
      for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}_${key}` : key;
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, newKey);
        } else if (Array.isArray(value)) {
          flattened[newKey] = value.join('; ');
        } else {
          flattened[newKey] = value;
        }
      }
    };
    
    flatten(item);
    return flattened;
  });
};




