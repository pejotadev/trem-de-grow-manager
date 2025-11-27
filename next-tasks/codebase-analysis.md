# 🌱 GrowControl Codebase Analysis

## Current Implementation Summary

### Existing Data Models (`types/index.ts`)

| Entity | Current Fields |
|--------|----------------|
| **User** | `uid`, `email`, `displayName`, `createdAt` |
| **Plant** | `id`, `userId`, `environmentId`, `controlNumber` (auto: A-XX-YYYY-#####), `name`, `strain`, `startDate`, `stageId`, `currentStage` |
| **Environment** | `id`, `userId`, `name`, `type` (indoor/outdoor/greenhouse), `dimensions`, `lightSetup`, `ventilation`, `notes`, `isPublic`, `createdAt`, `plantCounter` |
| **Stage** | `id`, `plantId`, `name` (Seedling/Veg/Flower/Drying/Curing), `startDate` |
| **WaterRecord** | `id`, `plantId`, `date`, `ingredients[]`, `notes` |
| **EnvironmentRecord** | `id`, `environmentId`, `date`, `temp`, `humidity`, `lightHours`, `notes` |
| **FriendRequest/Friendship** | Standard friend request system |

### Current Features ✅

1. **Plant Management**
   - Auto-generated unique control numbers (format: `A-{ENV_INITIALS}-{YEAR}-{SEQUENCE}`)
   - Stage tracking with history (Seedling → Veg → Flower → Drying → Curing)
   - Environment association

2. **Cloning**
   - Clone plants with `CL-` prefix control numbers
   - Batch cloning (1-100 clones at once)
   - Target environment selection
   - Starting stage selection

3. **Environments**
   - Types: indoor, outdoor, greenhouse
   - Dimensions, light setup, ventilation
   - Public/private visibility for friends

4. **Logging**
   - Watering logs with ingredients and notes
   - Environment logs (temperature, humidity, light hours)

5. **Social Features**
   - Friend system with requests
   - View friends' public environments/plants

---

## Gap Analysis: What's Missing

### 1. 🧬 Genetic Origin / Seed / Clone Cataloging

| Required | Current Status | Priority |
|----------|----------------|----------|
| Seed source (breeder, bank, origin) | ❌ Missing | High |
| Chemotype data (THC%, CBD%, terpene profile) | ❌ Missing | High |
| Genetic lineage/parent tracking | ❌ Missing (clones only have CL- prefix) | High |
| Individual vs batch identification | ❌ Missing | Medium |
| Source type (seed, clone, cutting) | ❌ Missing | High |

**Proposed additions to `Plant` type:**
```typescript
export type PlantSourceType = 'seed' | 'clone' | 'cutting' | 'tissue_culture';

export interface GeneticInfo {
  sourceType: PlantSourceType;
  breeder?: string;
  seedBank?: string;
  parentPlantId?: string;  // For clones - link to mother plant
  parentControlNumber?: string;
  batchId?: string;  // For batch identification
  acquisitionDate?: number;
  acquisitionSource?: string;
  geneticLineage?: string;  // e.g., "OG Kush x Purple Punch"
}

export interface Chemotype {
  thcPercent?: number;
  cbdPercent?: number;
  cbgPercent?: number;
  cbnPercent?: number;
  terpeneProfile?: string[];
  analysisDate?: number;
  labName?: string;
  reportUrl?: string;  // Link to lab report
}
```

---

### 2. 📋 Harvest & Production Records

| Required | Current Status | Priority |
|----------|----------------|----------|
| Harvest date | ❌ Missing | High |
| Weight (wet/dry) | ❌ Missing | High |
| Purpose (patient, research, extract) | ❌ Missing | High |
| Yield tracking | ❌ Missing | High |
| Processing records | ❌ Missing | Medium |

**Proposed new types:**
```typescript
export type HarvestPurpose = 'patient' | 'research' | 'extract' | 'personal' | 'donation' | 'other';

export interface Harvest {
  id: string;
  plantId: string;
  userId: string;
  harvestDate: number;
  wetWeightGrams: number;
  dryWeightGrams?: number;
  purpose: HarvestPurpose;
  destinationPatientId?: string;
  batchNumber: string;  // e.g., "H-2025-00001"
  notes?: string;
  qualityGrade?: string;
}

export interface Extract {
  id: string;
  userId: string;
  harvestIds: string[];  // Source harvests
  extractionDate: number;
  extractionMethod: string;  // e.g., "CO2", "ethanol", "rosin"
  volumeMl?: number;
  weightGrams?: number;
  batchNumber: string;  // e.g., "EX-2025-00001"
  thcMgPerMl?: number;
  cbdMgPerMl?: number;
  notes?: string;
}
```

---

### 3. 🔍 Traceability & Patient Distribution

| Required | Current Status | Priority |
|----------|----------------|----------|
| Patient/recipient registry | ❌ Missing | Critical |
| Distribution records | ❌ Missing | Critical |
| Product identification (batch, origin) | ❌ Missing | Critical |
| Seed-to-sale tracking | ❌ Missing | Critical |

**Proposed new types:**
```typescript
export interface Patient {
  id: string;
  associationId: string;
  name: string;
  documentNumber: string;  // CPF or other ID
  email?: string;
  phone?: string;
  joinDate: number;
  medicalJustification?: string;
  prescribingDoctor?: string;
  crmNumber?: string;  // Doctor's registration
  consentSignedDate?: number;
  active: boolean;
}

export interface Distribution {
  id: string;
  userId: string;
  patientId: string;
  productType: 'flower' | 'extract' | 'oil' | 'other';
  harvestId?: string;
  extractId?: string;
  batchNumber: string;
  quantityGrams?: number;
  quantityMl?: number;
  distributionDate: number;
  receivedBy: string;  // Signature/confirmation
  notes?: string;
}
```

---

### 4. ✅ Quality Control & Compliance

| Required | Current Status | Priority |
|----------|----------------|----------|
| Lab analysis attachments | ❌ Missing | High |
| Cultivation protocols | ❌ Missing | Medium |
| Security protocols | ❌ Missing | Medium |
| Waste/disposal records | ❌ Missing | Medium |
| Activity/audit logs | ❌ Missing | High |

**Proposed new types:**
```typescript
export interface LabAnalysis {
  id: string;
  entityType: 'harvest' | 'extract';
  entityId: string;
  labName: string;
  analysisDate: number;
  thcPercent?: number;
  cbdPercent?: number;
  pesticidesFree: boolean;
  moldFree: boolean;
  heavyMetalsFree: boolean;
  reportFileUrl: string;
  notes?: string;
}

export interface Protocol {
  id: string;
  associationId: string;
  title: string;
  category: 'cultivation' | 'security' | 'hygiene' | 'extraction' | 'disposal';
  version: string;
  content: string;
  effectiveDate: number;
  approvedBy: string;
  fileUrl?: string;
}

export interface WasteDisposal {
  id: string;
  userId: string;
  disposalDate: number;
  materialType: string;
  quantityGrams: number;
  disposalMethod: string;
  witnessedBy?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;  // 'create' | 'update' | 'delete'
  entityType: string;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  timestamp: number;
  ipAddress?: string;
}
```

---

### 5. 📁 Administrative Transparency

| Required | Current Status | Priority |
|----------|----------------|----------|
| Association/organization data | ❌ Missing | High |
| Meeting minutes (atas) | ❌ Missing | Medium |
| Member list management | ❌ Missing (only users exist) | High |
| Institutional documentation | ❌ Missing | Medium |
| Consent terms | ❌ Missing | High |

**Proposed new types:**
```typescript
export interface Association {
  id: string;
  name: string;
  cnpj?: string;
  legalName: string;
  address: string;
  foundingDate: number;
  statuteFileUrl?: string;
  internalRegulationsUrl?: string;
  responsiblePerson: string;
  responsibleCpf: string;
  contactEmail: string;
  contactPhone: string;
}

export interface Member {
  id: string;
  associationId: string;
  userId?: string;  // Link to app user if applicable
  name: string;
  documentNumber: string;
  role: 'admin' | 'cultivator' | 'patient' | 'volunteer';
  joinDate: number;
  consentFormSignedDate?: number;
  consentFormUrl?: string;
  active: boolean;
}

export interface MeetingMinutes {
  id: string;
  associationId: string;
  meetingDate: number;
  meetingType: 'ordinary' | 'extraordinary';
  attendees: string[];
  agenda: string;
  decisions: string;
  documentUrl?: string;
  approvedBy: string;
}

export interface ConsentTerm {
  id: string;
  patientId: string;
  templateVersion: string;
  signedDate: number;
  signatureUrl?: string;
  witnessName?: string;
  expirationDate?: number;
}
```

---

### 6. 🏥 Medical Use Documentation

| Required | Current Status | Priority |
|----------|----------------|----------|
| Medical prescriptions | ❌ Missing | Critical |
| Doctor recommendations | ❌ Missing | Critical |
| Patient medical justifications | ❌ Missing | Critical |
| Medical reports/laudos | ❌ Missing | High |

**Proposed new types:**
```typescript
export interface MedicalPrescription {
  id: string;
  patientId: string;
  doctorName: string;
  doctorCrm: string;
  prescriptionDate: number;
  expirationDate?: number;
  diagnosis?: string;
  recommendedProduct: string;
  dosage: string;
  frequency: string;
  documentUrl: string;
  active: boolean;
}

export interface MedicalReport {
  id: string;
  patientId: string;
  reportDate: number;
  doctorName: string;
  doctorCrm: string;
  reportType: 'laudo' | 'parecer' | 'atestado';
  content: string;
  documentUrl: string;
}
```

---

## Firestore Collections Summary

### Currently Existing:
- `users`
- `environments`
- `plants`
- `stages`
- `wateringLogs`
- `environmentLogs`
- `friendRequests`
- `friendships`

### Need to Add:
- `harvests`
- `extracts`
- `patients`
- `distributions`
- `labAnalyses`
- `protocols`
- `wasteDisposals`
- `auditLogs`
- `associations`
- `members`
- `meetingMinutes`
- `consentTerms`
- `medicalPrescriptions`
- `medicalReports`

---

## Summary of Gaps by Category

| Category | Completeness | Critical Items Missing |
|----------|--------------|------------------------|
| **1. Genetic Cataloging** | 🔴 10% | Seed source, chemotype, lineage tracking |
| **2. Harvest/Production Records** | 🔴 0% | Harvest tracking, weight, purpose, processing |
| **3. Traceability** | 🔴 0% | Patient registry, distribution records, batch tracking |
| **4. Quality Control** | 🔴 5% | Lab analyses, protocols, audit logs |
| **5. Administrative Transparency** | 🔴 0% | Association data, members, meeting minutes |
| **6. Medical Documentation** | 🔴 0% | Prescriptions, medical reports |

---

## Current App Screens & Navigation

```
(tabs)/
├── index.tsx              ← Home: Plant list by environment
├── environments/
│   ├── index.tsx          ← List environments
│   ├── [id].tsx           ← Environment details
│   └── new.tsx            ← Create environment
├── plants/
│   ├── [id].tsx           ← Plant details + clone
│   └── new.tsx            ← Create plant
├── logs/
│   ├── index.tsx          ← Logs hub
│   ├── watering.tsx       ← Watering logs
│   └── environment.tsx    ← Environment logs
└── friends/
    ├── index.tsx          ← Friends list + requests
    ├── [id].tsx           ← Friend profile
    └── search.tsx         ← Search users
```

---

This analysis shows that while you have a solid foundation for **plant cultivation tracking**, the app is currently missing the core components needed for **regulatory compliance, traceability, and medical documentation** that would be required for an association-style cannabis cultivation management system.

