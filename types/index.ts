export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: number;
}

// Audit Log Types
export type AuditAction = 'create' | 'update' | 'delete';

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: AuditAction;
  entityType: string; // e.g., 'plant', 'harvest', 'patient', 'distribution', 'extract'
  entityId: string;
  entityDisplayName?: string;
  previousValue?: string; // JSON stringified
  newValue?: string; // JSON stringified
  changedFields?: string[];
  timestamp: number;
  notes?: string;
}

// Friend System Types
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserEmail: string;
  fromUserDisplayName?: string;
  toUserId: string;
  toUserEmail: string;
  toUserDisplayName?: string;
  status: FriendRequestStatus;
  createdAt: number;
}

export interface Friendship {
  id: string;
  users: string[]; // Array of 2 user IDs for bidirectional queries
  userEmails: string[]; // For display purposes
  userDisplayNames?: string[];
  createdAt: number;
}

// Environment Types
export type EnvironmentType = "indoor" | "outdoor" | "greenhouse";

export interface EnvironmentDimensions {
  width: number;
  length: number;
  height: number;
  unit: "m" | "ft";
}

export interface Environment {
  id: string;
  userId: string;
  name: string;
  type: EnvironmentType;
  dimensions?: EnvironmentDimensions;
  lightSetup?: string;
  ventilation?: string;
  notes?: string;
  isPublic: boolean; // If true, friends can view this environment and its plants
  createdAt: number;
  plantCounter: number; // Counter for generating sequential control numbers
  harvestCounter: number; // Counter for generating sequential harvest control numbers
}

// Plant Types
export type StageName = "Seedling" | "Veg" | "Flower" | "Drying" | "Curing";

// Genetic Origin Types
export type PlantSourceType = "seed" | "clone" | "cutting" | "tissue_culture";

export interface GeneticInfo {
  sourceType: PlantSourceType;
  breeder?: string;           // Seed breeder name
  seedBank?: string;          // Where acquired
  parentPlantId?: string;     // For clones, reference to mother plant
  parentControlNumber?: string;
  batchId?: string;           // For batch identification
  acquisitionDate?: number;
  acquisitionSource?: string;
  geneticLineage?: string;    // e.g., "OG Kush x Purple Punch"
}

export interface Chemotype {
  thcPercent?: number;
  cbdPercent?: number;
  cbgPercent?: number;
  cbnPercent?: number;
  terpeneProfile?: string[];
  analysisDate?: number;
  labName?: string;
  reportUrl?: string;
}

export interface Plant {
  id: string;
  userId: string;
  environmentId: string;
  controlNumber: string;
  name: string;
  strain: string;
  startDate: number;
  stageId?: string;
  currentStage?: StageName;
  // Genetic tracking (optional for backward compatibility)
  genetics?: GeneticInfo;
  chemotype?: Chemotype;
  isMotherPlant?: boolean;    // Mark plants used for cloning
  motherPlantId?: string;     // Back-reference for clones (same as genetics.parentPlantId)
  // Soft delete - plant is hidden but can still be accessed from related records
  deletedAt?: number;
}

export interface Stage {
  id: string;
  plantId: string;
  name: StageName;
  startDate: number;
}

// Log Types (Legacy - kept for backward compatibility)
export interface WaterRecord {
  id: string;
  plantId: string;
  date: number;
  ingredients: string[];
  notes: string;
}

export interface EnvironmentRecord {
  id: string;
  environmentId: string;
  date: number;
  temp: number;
  humidity: number;
  lightHours: number;
  notes: string;
}

// ==================== ENHANCED PLANT LOG TYPES ====================

// Plant Log Types for Cannabis Growing
export type PlantLogType = 
  | 'watering'           // Plain water
  | 'nutrient_feed'      // Nutrient solution feeding
  | 'soil_add'           // Adding soil/medium/amendments
  | 'defoliation'        // Removing leaves
  | 'lollipopping'       // Bottom trimming
  | 'lst'                // Low Stress Training (bending, tying)
  | 'hst'                // High Stress Training
  | 'topping'            // Cutting main cola
  | 'fimming'            // FIM technique
  | 'supercropping'      // Stem crushing/bending
  | 'transplant'         // Moving to new pot/medium
  | 'pest_treatment'     // Pest control
  | 'disease_treatment'  // Disease treatment
  | 'ph_adjustment'      // pH correction
  | 'flush'              // Pre-harvest or salt buildup flush
  | 'foliar_spray'       // Leaf feeding/treatment
  | 'clone_cut'          // Taking cuttings
  | 'observation'        // General observation/note
  | 'other';

// Nutrient entry for detailed feeding logs
export interface NutrientEntry {
  name: string;
  brand?: string;
  amountMl?: number;
  npkRatio?: string;    // e.g., "3-1-2"
}

// Medium types for soil/transplant logs
export type MediumType = 'soil' | 'coco' | 'perlite' | 'vermiculite' | 'rockwool' | 'clay_pebbles' | 'dwc' | 'nft' | 'other';

// Comprehensive Plant Log
export interface PlantLog {
  id: string;
  plantId: string;
  userId: string;
  logType: PlantLogType;
  date: number;
  
  // Watering/Feeding specifics
  waterAmountMl?: number;
  phLevel?: number;
  ecPpm?: number;           // EC in PPM
  runoffPh?: number;
  runoffEc?: number;
  nutrients?: NutrientEntry[];
  
  // Soil/Medium additions
  mediumType?: MediumType;
  mediumBrand?: string;
  mediumAmount?: string;    // e.g., "2 liters"
  amendmentsAdded?: string[];
  
  // Training specifics (LST/HST/Topping/etc)
  trainingMethod?: string;
  branchesAffected?: number;
  trainingNotes?: string;
  
  // Defoliation/Lollipopping
  leavesRemoved?: number;
  fanLeaves?: boolean;
  sugarLeaves?: boolean;
  
  // Transplant specifics
  fromPotSize?: string;
  toPotSize?: string;
  rootBound?: boolean;
  
  // Pest/Disease treatment
  pestType?: string;
  diseaseType?: string;
  treatmentProduct?: string;
  treatmentBrand?: string;
  applicationMethod?: string;  // spray, drench, etc.
  
  // Foliar spray
  foliarProduct?: string;
  foliarDilution?: string;
  
  // Common fields
  notes?: string;
  photoUrl?: string;
  createdAt: number;
  
  // Bulk update tracking (set when log was created from a bulk update)
  bulkLogId?: string;          // Reference to parent BulkPlantLog
  fromBulkUpdate?: boolean;    // Flag indicating this came from a bulk operation
}

// Bulk Log for applying to multiple plants at once
export interface BulkPlantLog {
  id: string;
  environmentId: string;
  userId: string;
  plantIds: string[];         // Plants this was applied to
  plantCount: number;         // Quick reference count
  logType: PlantLogType;
  date: number;
  
  // Same optional fields as PlantLog
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
  
  pestType?: string;
  diseaseType?: string;
  treatmentProduct?: string;
  treatmentBrand?: string;
  applicationMethod?: string;
  
  foliarProduct?: string;
  foliarDilution?: string;
  
  notes?: string;
  createdAt: number;
}

// Log type display info for UI
export interface PlantLogTypeInfo {
  type: PlantLogType;
  label: string;
  icon: string;
  color: string;
  category: 'feeding' | 'training' | 'maintenance' | 'treatment' | 'other';
  description: string;
}

// Harvest Types
export type HarvestPurpose = 'patient' | 'research' | 'extract' | 'personal' | 'donation' | 'other';

export type HarvestStatus = 'fresh' | 'drying' | 'curing' | 'processed' | 'distributed';

export interface Harvest {
  id: string;
  plantId: string;
  userId: string;
  controlNumber: string; // Format: H-{ENV}-{YEAR}-{SEQUENCE}
  harvestDate: number;
  wetWeightGrams: number;
  dryWeightGrams?: number;
  trimWeightGrams?: number;
  finalWeightGrams?: number;
  distributedGrams?: number; // Track how much has been distributed
  extractedGrams?: number; // Track how much has been used for extraction
  extractedForIds?: string[]; // Track which extracts used this harvest
  status: HarvestStatus;
  purpose: HarvestPurpose;
  destinationPatientId?: string;
  qualityGrade?: 'A' | 'B' | 'C';
  storageLocation?: string;
  notes?: string;
  createdAt: number;
}

// Patient Types
export type PatientStatus = 'active' | 'inactive' | 'pending';

export type PatientDocumentType = 'cpf' | 'rg' | 'passport' | 'other';

export interface Patient {
  id: string;
  associationId?: string; // For future association feature
  userId: string; // Who registered this patient
  name: string; // Required
  documentType: PatientDocumentType;
  documentNumber: string; // Required
  email?: string;
  phone?: string;
  address?: string;
  joinDate: number;
  status: PatientStatus;
  medicalCondition?: string;
  prescribingDoctor?: string;
  doctorCrm?: string;
  prescriptionDate?: number;
  prescriptionExpirationDate?: number;
  prescriptionFileUrl?: string;
  consentSignedDate?: number;
  consentFileUrl?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  // Prescription allowances (max grams per month)
  allowanceOilGrams?: number;
  allowanceExtractGrams?: number;
  allowanceFlowerThcGrams?: number;
  allowanceFlowerCbdGrams?: number;
}

// Extract Types
export type ExtractionMethod = 'co2' | 'ethanol' | 'butane' | 'rosin' | 'ice_water' | 'olive_oil' | 'other';

export type ExtractType = 'oil' | 'tincture' | 'concentrate' | 'isolate' | 'full_spectrum' | 'broad_spectrum' | 'other';

export interface Extract {
  id: string;
  userId: string;
  controlNumber: string; // Format: EX-YYYY-#####
  name: string;
  extractType: ExtractType;
  harvestIds: string[]; // Source harvests - can be multiple
  sourceControlNumbers: string[]; // For display
  extractionDate: number;
  extractionMethod: ExtractionMethod;
  inputWeightGrams: number; // Total input material
  outputVolumeMl?: number;
  outputWeightGrams?: number;
  thcMgPerMl?: number;
  cbdMgPerMl?: number;
  concentration?: string;
  carrier?: string; // e.g., "MCT oil", "olive oil"
  batchNumber: string;
  expirationDate?: number;
  storageLocation?: string;
  notes?: string;
  labAnalysisId?: string;
  createdAt: number;
}

// Distribution Types
export type ProductType = 'flower' | 'extract' | 'oil' | 'edible' | 'topical' | 'other';

export interface Distribution {
  id: string;
  distributionNumber: string; // Format: D-YYYY-#####
  userId: string;
  patientId: string;
  patientName: string; // Denormalized for display
  productType: ProductType;
  harvestId?: string; // If distributing flower
  harvestControlNumber?: string; // Denormalized for display
  extractId?: string; // If distributing extract
  extractControlNumber?: string; // Denormalized for display
  batchNumber: string; // Source batch
  productDescription: string;
  quantityGrams?: number;
  quantityMl?: number;
  quantityUnits?: number;
  distributionDate: number;
  receivedBy: string; // Who picked up
  signatureConfirmation?: boolean;
  notes?: string;
  createdAt: number;
}

// Order Types
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string; // Format: O-YYYY-#####
  userId: string;
  patientId: string;
  patientName: string; // Denormalized for display
  productType: ProductType;
  harvestId?: string; // If ordering from specific harvest/curing
  harvestControlNumber?: string; // Denormalized for display
  extractId?: string; // If ordering extract
  extractControlNumber?: string; // Denormalized for display
  requestedQuantityGrams?: number;
  requestedQuantityMl?: number;
  status: OrderStatus;
  notes?: string;
  requestedAt: number;
  processedAt?: number;
  processedBy?: string;
  distributionId?: string; // Reference to created distribution when fulfilled
  createdAt: number;
}

// Institutional Document Types
export type ProtocolCategory = 'cultivation' | 'security' | 'hygiene' | 'extraction' | 'distribution' | 'disposal' | 'emergency' | 'other';

export type DocumentType = 'protocol' | 'statute' | 'regulation' | 'consent_template' | 'meeting_minutes' | 'other';

export type DocumentStatus = 'draft' | 'active' | 'archived';

export interface InstitutionalDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  category?: ProtocolCategory;
  title: string;
  version: string;
  content?: string; // Rich text or markdown
  fileUrl?: string;
  effectiveDate: number;
  expirationDate?: number;
  approvedBy?: string;
  status: DocumentStatus;
  createdAt: number;
  updatedAt: number;
}

// Waste Disposal Types
export type WasteMaterialType = 'plant_material' | 'extraction_waste' | 'contaminated' | 'expired_product' | 'packaging' | 'other';

export type DisposalMethod = 'incineration' | 'composting' | 'licensed_disposal' | 'other';

export type WasteSourceEntityType = 'plant' | 'harvest' | 'extract';

export interface WasteDisposal {
  id: string;
  userId: string;
  disposalDate: number;
  materialType: WasteMaterialType;
  description: string;
  sourceEntityType?: WasteSourceEntityType;
  sourceEntityId?: string;
  sourceControlNumber?: string; // Denormalized for display
  quantityGrams: number;
  disposalMethod: DisposalMethod;
  disposalCompany?: string;
  manifestNumber?: string; // For licensed disposal
  witnessName?: string;
  witnessSignature?: boolean;
  photoUrl?: string;
  notes?: string;
  createdAt: number;
}
