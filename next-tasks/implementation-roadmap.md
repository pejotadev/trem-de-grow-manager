# 🗺️ Implementation Roadmap with Executable Prompts

Below is a prioritized roadmap organized in **6 phases**. Each task includes a **ready-to-use prompt** you can copy and use to implement that specific feature. Switch to **Agent Mode** before running these prompts.

---

## Phase 1: Foundation - Enhanced Data Models & Genetic Tracking
**Priority: Critical | Estimated Effort: 2-3 days**

### 1.1 Expand Plant Type with Genetic Information

```
Extend the Plant interface in types/index.ts to include comprehensive genetic tracking. Add:

1. A new PlantSourceType union type: 'seed' | 'clone' | 'cutting' | 'tissue_culture'

2. A new GeneticInfo interface with fields:
   - sourceType: PlantSourceType (required)
   - breeder: string (optional) - seed breeder name
   - seedBank: string (optional) - where acquired
   - parentPlantId: string (optional) - for clones, reference to mother plant
   - parentControlNumber: string (optional)
   - batchId: string (optional) - for batch identification  
   - acquisitionDate: number (optional)
   - acquisitionSource: string (optional)
   - geneticLineage: string (optional) - e.g., "OG Kush x Purple Punch"

3. A new Chemotype interface with fields:
   - thcPercent: number (optional)
   - cbdPercent: number (optional)
   - cbgPercent: number (optional)
   - cbnPercent: number (optional)
   - terpeneProfile: string[] (optional)
   - analysisDate: number (optional)
   - labName: string (optional)
   - reportUrl: string (optional)

4. Update the Plant interface to include:
   - genetics: GeneticInfo (optional)
   - chemotype: Chemotype (optional)
   - isMotherPlant: boolean (optional) - mark plants used for cloning
   - motherPlantId: string (optional) - back-reference for clones

5. Update the clonePlants function in firebase/firestore.ts to automatically:
   - Set sourceType to 'clone'
   - Set parentPlantId to the source plant ID
   - Set parentControlNumber to the source plant's control number
   - Copy the strain and geneticLineage from source

Keep backward compatibility with existing plants.
```

---

### 1.2 Update Plant Creation Screen with Genetic Fields

```
Update the plant creation screen (app/(tabs)/plants/new.tsx) to include genetic origin fields:

1. Add a "Source Type" selector with options: Seed, Clone, Cutting, Tissue Culture
   - Style it similar to the Stage selector with buttons in a row

2. When source is "Seed", show additional fields:
   - Breeder (text input, optional)
   - Seed Bank / Source (text input, optional)  
   - Genetic Lineage (text input, optional) - placeholder: "e.g., Northern Lights x Big Bud"

3. When source is "Clone" or "Cutting", show:
   - Parent Plant selector (dropdown with existing plants marked as mother plants)
   - If no mother plants exist, show a message and allow manual entry of parent info
   - Genetic Lineage (auto-filled from parent if selected)

4. Add a toggle for "Mark as Mother Plant" at the bottom
   - Explain: "Mother plants can be used to create clones"

5. Add an expandable "Chemotype Data (Optional)" section with:
   - THC % (number input)
   - CBD % (number input)
   - Lab Name (text input)
   - Analysis Date (date picker or text)

6. Update the createPlant call to include the new genetic data.

7. Update styles to maintain the current green/nature theme.
```

---

### 1.3 Update Plant Detail Screen to Show Genetic Info

```
Update the plant detail screen (app/(tabs)/plants/[id].tsx) to display genetic information:

1. Add a new "Genetic Info" Card section after the main plant info card, showing:
   - Source Type badge (Seed/Clone/Cutting with appropriate icons)
   - If clone: "Cloned from: [Parent Name] #[Control Number]" as a clickable link to parent plant
   - Breeder & Seed Bank (if available)
   - Genetic Lineage (if available)
   - Mother Plant badge (if isMotherPlant is true)

2. Add a "Chemotype" Card section (only if chemotype data exists) showing:
   - THC: X% | CBD: X% | CBG: X% in a stats row with colored badges
   - Lab: [Lab Name] | Analyzed: [Date]
   - "View Lab Report" button if reportUrl exists

3. In the Edit Plant Modal, add:
   - Ability to edit genetic info fields
   - Ability to add/update chemotype data
   - Toggle for "Mark as Mother Plant"

4. Update the Clone Plant flow to show:
   - Clear indication that genetic lineage will be inherited
   - Auto-populate parent reference

5. Add a "Clone History" section if this plant has been cloned:
   - List of plants cloned from this one with their control numbers
   - Query plants where parentPlantId equals this plant's ID

Use icons: 🧬 for genetics, 🔬 for chemotype, 🌱 for mother plant.
```

---

## Phase 2: Harvest & Production Tracking
**Priority: Critical | Estimated Effort: 2-3 days**

### 2.1 Create Harvest Data Model and Functions

```
Create the harvest tracking system:

1. In types/index.ts, add new types:

   HarvestPurpose = 'patient' | 'research' | 'extract' | 'personal' | 'donation' | 'other'
   
   HarvestStatus = 'fresh' | 'drying' | 'curing' | 'processed' | 'distributed'
   
   Harvest interface:
   - id: string
   - plantId: string
   - userId: string
   - controlNumber: string (format: H-{ENV}-{YEAR}-{SEQUENCE})
   - harvestDate: number
   - wetWeightGrams: number
   - dryWeightGrams?: number
   - trimWeightGrams?: number
   - finalWeightGrams?: number
   - status: HarvestStatus
   - purpose: HarvestPurpose
   - destinationPatientId?: string
   - qualityGrade?: 'A' | 'B' | 'C'
   - storageLocation?: string
   - notes?: string
   - createdAt: number

2. In firebase/firestore.ts, add functions:
   - generateHarvestControlNumber(environmentName, sequence): string
   - createHarvest(harvestData): Promise<string>
   - getHarvest(harvestId): Promise<Harvest | null>
   - getPlantHarvests(plantId): Promise<Harvest[]>
   - getUserHarvests(userId): Promise<Harvest[]>
   - updateHarvest(harvestId, data): Promise<void>
   - deleteHarvest(harvestId): Promise<void>

3. Update firestore.rules to add harvest collection rules:
   - Read/write only if authenticated and userId matches

4. Add 'harvestCounter' field to Environment type for sequential numbering.
```

---

### 2.2 Create Harvest Screen for Plants

```
Create a harvest recording screen accessible from plant details:

1. Create new file: app/(tabs)/plants/harvest.tsx

2. This screen should receive plantId as a parameter and show:
   - Plant info header (name, strain, control number, current stage)
   - Warning if plant is not in "Flower", "Drying", or "Curing" stage

3. Harvest form fields:
   - Harvest Date (date picker, default to today)
   - Wet Weight (number input, grams, required)
   - Purpose (selector: Patient, Research, Extract, Personal, Donation, Other)
   - If purpose is "Patient", show patient selector (for Phase 3)
   - Quality Grade (A/B/C selector, optional)
   - Storage Location (text input, optional)
   - Notes (multiline text, optional)

4. On submit:
   - Create harvest record
   - Auto-generate harvest control number (H-{ENV_INITIALS}-{YEAR}-{SEQ})
   - Optionally update plant stage to "Drying" or "Curing"
   - Show success with harvest control number

5. In plant detail screen ([id].tsx):
   - Add "Harvest This Plant" button (only if stage is Flower or later)
   - Add "Harvests" section showing list of harvests from this plant
   - Each harvest card shows: date, weight, purpose, status badge, control number

6. Style consistently with existing app theme.
```

---

### 2.3 Create Harvests Management Tab/Screen

```
Create a dedicated harvests management screen:

1. Create new file: app/(tabs)/harvests/index.tsx
2. Create new file: app/(tabs)/harvests/[id].tsx  
3. Create new file: app/(tabs)/harvests/_layout.tsx

4. Update app/(tabs)/_layout.tsx to add a new "Harvests" tab:
   - Icon: "archive" or "cube-outline"
   - Position after "Logs" tab

5. Harvests index screen should show:
   - Filter tabs: All | Fresh | Drying | Curing | Processed | Distributed
   - Sort options: Date (newest), Date (oldest), Weight
   - List of harvest cards showing:
     - Control number (H-XX-YYYY-#####)
     - Plant name and plant control number
     - Harvest date
     - Weight (wet/dry if available)
     - Purpose badge
     - Status badge
   - Floating "Record Harvest" button

6. Harvest detail screen ([id].tsx) should show:
   - Full harvest info card
   - Link to source plant
   - Weight tracking section:
     - Initial wet weight
     - Button to "Update Dry Weight" 
     - Button to "Update Final Weight"
   - Status progression buttons
   - If distributed: link to distribution record
   - Edit and Delete buttons
   - Timeline/history of weight updates

7. Add firestore functions to update harvest weights and status over time.
```

---

## Phase 3: Patient Registry & Distribution Tracking
**Priority: Critical | Estimated Effort: 3-4 days**

### 3.1 Create Patient Data Model

```
Create the patient registry system:

1. In types/index.ts, add new types:

   PatientStatus = 'active' | 'inactive' | 'pending'
   
   Patient interface:
   - id: string
   - associationId?: string (for future association feature)
   - userId: string (who registered this patient)
   - name: string (required)
   - documentType: 'cpf' | 'rg' | 'passport' | 'other'
   - documentNumber: string (required)
   - email?: string
   - phone?: string
   - address?: string
   - joinDate: number
   - status: PatientStatus
   - medicalCondition?: string
   - prescribingDoctor?: string
   - doctorCrm?: string
   - prescriptionDate?: number
   - prescriptionExpirationDate?: number
   - prescriptionFileUrl?: string
   - consentSignedDate?: number
   - consentFileUrl?: string
   - notes?: string
   - createdAt: number
   - updatedAt: number

2. In firebase/firestore.ts, add functions:
   - createPatient(patientData): Promise<string>
   - getPatient(patientId): Promise<Patient | null>
   - getUserPatients(userId): Promise<Patient[]>
   - searchPatients(userId, query): Promise<Patient[]>
   - updatePatient(patientId, data): Promise<void>
   - deactivatePatient(patientId): Promise<void>
   - deletePatient(patientId): Promise<void>

3. Update firestore.rules for patients collection:
   - Only authenticated users can read/write their own patients
   - Sensitive data should be protected

4. Create Firestore indexes for patient queries.
```

---

### 3.2 Create Patients Management Screen

```
Create a patients management section:

1. Create files:
   - app/(tabs)/patients/_layout.tsx
   - app/(tabs)/patients/index.tsx
   - app/(tabs)/patients/[id].tsx
   - app/(tabs)/patients/new.tsx

2. Update app/(tabs)/_layout.tsx to add "Patients" tab:
   - Icon: "people-circle" or "medical"
   - Position after Friends tab

3. Patients index screen should show:
   - Search bar to filter by name or document
   - Filter tabs: All | Active | Inactive | Pending
   - Patient cards showing:
     - Name (large)
     - Document number (masked: ***.***.XXX-XX)
     - Status badge (Active=green, Inactive=gray, Pending=yellow)
     - Join date
     - Medical condition (if set)
     - Prescription status (valid/expired/none)
   - "Add Patient" button

4. New patient screen should have:
   - Personal info section: Name, Document Type, Document Number, Email, Phone, Address
   - Medical info section: Condition, Prescribing Doctor, Doctor CRM
   - Prescription section: Date, Expiration Date, File upload placeholder (just URL for now)
   - Consent section: Signed Date, File URL placeholder
   - Notes field
   - Privacy notice about data handling

5. Patient detail screen should show:
   - All patient info organized in cards
   - Edit button
   - "Distribution History" section (list of all distributions to this patient)
   - "Deactivate Patient" button
   - Statistics: total received, last distribution date

6. Style with medical/healthcare colors (blues and greens).
```

---

### 3.3 Create Distribution Tracking System

```
Create the distribution (delivery to patients) tracking system:

1. In types/index.ts, add:

   ProductType = 'flower' | 'extract' | 'oil' | 'edible' | 'topical' | 'other'
   
   Distribution interface:
   - id: string
   - userId: string
   - patientId: string
   - patientName: string (denormalized for display)
   - productType: ProductType
   - harvestId?: string (if distributing flower)
   - extractId?: string (if distributing extract - for Phase 4)
   - batchNumber: string (source batch)
   - productDescription: string
   - quantityGrams?: number
   - quantityMl?: number
   - quantityUnits?: number
   - distributionDate: number
   - receivedBy: string (who picked up)
   - signatureConfirmation?: boolean
   - notes?: string
   - createdAt: number

2. In firebase/firestore.ts, add:
   - generateDistributionNumber(sequence): string (format: D-YYYY-#####)
   - createDistribution(data): Promise<string>
   - getDistribution(id): Promise<Distribution | null>
   - getUserDistributions(userId): Promise<Distribution[]>
   - getPatientDistributions(patientId): Promise<Distribution[]>
   - getHarvestDistributions(harvestId): Promise<Distribution[]>
   - updateDistribution(id, data): Promise<void>
   - deleteDistribution(id): Promise<void>

3. Create distribution screen: app/(tabs)/distributions/index.tsx
   - List all distributions with filters by date range and patient
   - Quick stats: total distributed this month, unique patients served

4. Add "Distribute" button to harvest detail screen:
   - Opens modal to select patient and enter quantity
   - Validates that distribution quantity doesn't exceed available harvest weight
   - Creates distribution record and updates harvest status

5. In patient detail screen, show distribution history section.
```

---

## Phase 4: Extracts & Processing
**Priority: High | Estimated Effort: 2-3 days**

### 4.1 Create Extract/Product Data Model

```
Create the extract and product processing system:

1. In types/index.ts, add:

   ExtractionMethod = 'co2' | 'ethanol' | 'butane' | 'rosin' | 'ice_water' | 'olive_oil' | 'other'
   
   ExtractType = 'oil' | 'tincture' | 'concentrate' | 'isolate' | 'full_spectrum' | 'broad_spectrum' | 'other'
   
   Extract interface:
   - id: string
   - userId: string
   - controlNumber: string (format: EX-YYYY-#####)
   - name: string
   - extractType: ExtractType
   - harvestIds: string[] (source harvests - can be multiple)
   - sourceControlNumbers: string[] (for display)
   - extractionDate: number
   - extractionMethod: ExtractionMethod
   - inputWeightGrams: number (total input material)
   - outputVolumeM?: number
   - outputWeightGrams?: number
   - thcMgPerMl?: number
   - cbdMgPerMl?: number
   - concentration?: string
   - carrier?: string (e.g., "MCT oil", "olive oil")
   - batchNumber: string
   - expirationDate?: number
   - storageLocation?: string
   - notes?: string
   - labAnalysisId?: string
   - createdAt: number

2. In firebase/firestore.ts, add:
   - generateExtractControlNumber(sequence): string
   - createExtract(data): Promise<string>
   - getExtract(id): Promise<Extract | null>
   - getUserExtracts(userId): Promise<Extract[]>
   - getHarvestExtracts(harvestId): Promise<Extract[]>
   - updateExtract(id, data): Promise<void>
   - deleteExtract(id): Promise<void>

3. Update Harvest type to track extraction:
   - Add extractedForIds: string[] to track which extracts used this harvest
   - Add remainingWeightGrams to track available weight

4. Update firestore.rules for extracts collection.
```

---

### 4.2 Create Extracts Management Screen

```
Create the extracts management section:

1. Create files:
   - app/(tabs)/extracts/_layout.tsx
   - app/(tabs)/extracts/index.tsx
   - app/(tabs)/extracts/[id].tsx
   - app/(tabs)/extracts/new.tsx

2. Add "Extracts" tab to _layout.tsx:
   - Icon: "flask" or "beaker"
   - Position between Harvests and Patients

3. Extracts index screen:
   - Filter by type: All | Oil | Tincture | Concentrate | etc.
   - List of extract cards showing:
     - Control number and name
     - Extract type badge
     - Volume/weight
     - THC/CBD concentration
     - Source harvest count
     - Expiration date (with warning if expiring soon)
   - "Create Extract" button

4. New extract screen:
   - Name input
   - Extract Type selector
   - Extraction Method selector
   - Harvest selector (multi-select from available harvests)
     - Show available weight for each harvest
     - Calculate total input weight
   - Input Weight (auto-calculated or manual override)
   - Output Volume (ml) and/or Weight (grams)
   - Carrier/base input
   - Concentration inputs (THC mg/ml, CBD mg/ml)
   - Expiration date picker
   - Storage location
   - Notes

5. Extract detail screen:
   - All extract info
   - Source harvests section (links to each harvest)
   - Lab analysis section (placeholder for Phase 5)
   - Distribution history (distributions of this extract)
   - "Distribute Extract" button
   - Edit and Delete buttons

6. Update Distribution to support extractId source.
```

---

## Phase 5: Quality Control & Lab Analysis
**Priority: High | Estimated Effort: 2 days**

### 5.1 Create Lab Analysis Data Model

```
Create the lab analysis and quality control system:

1. In types/index.ts, add:

   AnalysisEntityType = 'harvest' | 'extract'
   
   LabAnalysisStatus = 'pending' | 'completed' | 'failed'
   
   LabAnalysis interface:
   - id: string
   - userId: string
   - entityType: AnalysisEntityType
   - entityId: string
   - entityControlNumber: string (for display)
   - labName: string
   - analysisDate: number
   - resultsReceivedDate?: number
   - status: LabAnalysisStatus
   - sampleId?: string (lab's sample identifier)
   - thcPercent?: number
   - cbdPercent?: number
   - cbgPercent?: number
   - cbnPercent?: number
   - totalCannabinoids?: number
   - terpeneProfile?: { name: string; percent: number }[]
   - pesticidesFree?: boolean
   - moldFree?: boolean
   - heavyMetalsFree?: boolean
   - microbiologySafe?: boolean
   - moisturePercent?: number
   - overallPass: boolean
   - reportFileUrl?: string
   - notes?: string
   - createdAt: number

2. In firebase/firestore.ts, add:
   - createLabAnalysis(data): Promise<string>
   - getLabAnalysis(id): Promise<LabAnalysis | null>
   - getEntityLabAnalyses(entityType, entityId): Promise<LabAnalysis[]>
   - getUserLabAnalyses(userId): Promise<LabAnalysis[]>
   - updateLabAnalysis(id, data): Promise<void>
   - deleteLabAnalysis(id): Promise<void>

3. Create components/LabAnalysisCard.tsx:
   - Reusable component to display lab analysis results
   - Shows pass/fail badges for each test
   - Cannabinoid percentages with visual bar
   - Terpene profile list
   - Link to view full report

4. Update Harvest and Extract detail screens to include:
   - "Lab Analyses" section
   - "Request Analysis" or "Add Analysis Results" button
   - Display LabAnalysisCard for each analysis
```

---

### 5.2 Create Lab Analysis Entry Screen

```
Create the lab analysis results entry interface:

1. Create file: app/(tabs)/quality/index.tsx
2. Create file: app/(tabs)/quality/new.tsx
3. Create file: app/(tabs)/quality/[id].tsx

4. Add "Quality" tab or make it accessible from Harvests/Extracts screens.

5. New analysis screen should have:
   - Entity selector: Choose "Harvest" or "Extract"
   - Entity picker: Dropdown of harvests or extracts to analyze
   - Lab Information section:
     - Lab Name (required)
     - Sample ID
     - Analysis Date
     - Results Received Date
   - Cannabinoid Results section:
     - THC % (number input)
     - CBD % (number input)
     - CBG % (number input)
     - CBN % (number input)
     - Total Cannabinoids %
   - Safety Tests section (toggle switches):
     - Pesticides Free ✓/✗
     - Mold/Mildew Free ✓/✗
     - Heavy Metals Free ✓/✗
     - Microbiology Safe ✓/✗
   - Additional Data section:
     - Moisture %
     - Terpene profile (dynamic list to add name + %)
   - Report URL input (for uploaded PDF link)
   - Overall Pass/Fail toggle
   - Notes

6. Analysis detail screen:
   - Full display of all results
   - Visual indicators (green checkmarks, red X's)
   - Cannabinoid chart/visualization
   - Link to source entity
   - Edit and Delete options

7. Update Harvest and Extract models to include:
   - latestLabAnalysisId?: string
   - labVerified: boolean
```

---

## Phase 6: Administrative & Compliance
**Priority: Medium | Estimated Effort: 3-4 days**

### 6.1 Create Audit Log System

```
Implement automatic audit logging for all data changes:

1. In types/index.ts, add:

   AuditAction = 'create' | 'update' | 'delete'
   
   AuditLog interface:
   - id: string
   - userId: string
   - userEmail: string
   - action: AuditAction
   - entityType: string (e.g., 'plant', 'harvest', 'patient', 'distribution')
   - entityId: string
   - entityDisplayName?: string
   - previousValue?: any (JSON stringified)
   - newValue?: any (JSON stringified)
   - changedFields?: string[]
   - timestamp: number
   - notes?: string

2. Create firebase/auditLog.ts with:
   - logCreate(userId, userEmail, entityType, entityId, entityName, data): Promise<void>
   - logUpdate(userId, userEmail, entityType, entityId, entityName, previousData, newData): Promise<void>
   - logDelete(userId, userEmail, entityType, entityId, entityName, deletedData): Promise<void>
   - getEntityAuditLogs(entityType, entityId): Promise<AuditLog[]>
   - getUserAuditLogs(userId, limit): Promise<AuditLog[]>
   - getRecentAuditLogs(limit): Promise<AuditLog[]>
   - searchAuditLogs(filters): Promise<AuditLog[]>

3. Create a higher-order function or wrapper to automatically log:
   - Wrap createPlant, updatePlant, deletePlant with audit logging
   - Wrap createHarvest, updateHarvest, deleteHarvest
   - Wrap createPatient, updatePatient, deletePatient
   - Wrap createDistribution, updateDistribution, deleteDistribution
   - Wrap createExtract, updateExtract, deleteExtract

4. Create app/(tabs)/admin/audit-log.tsx screen:
   - Show recent activity log
   - Filter by entity type, action, date range, user
   - Each log entry shows: timestamp, user, action, entity, changed fields
   - Expandable to show before/after values

5. Add "View History" button to detail screens (plant, harvest, patient, etc.)
   - Opens modal with entity-specific audit log
```

---

### 6.2 Create Protocols & Documentation System

```
Create a system for managing cultivation protocols and institutional documents:

1. In types/index.ts, add:

   ProtocolCategory = 'cultivation' | 'security' | 'hygiene' | 'extraction' | 'distribution' | 'disposal' | 'emergency' | 'other'
   
   DocumentType = 'protocol' | 'statute' | 'regulation' | 'consent_template' | 'meeting_minutes' | 'other'
   
   InstitutionalDocument interface:
   - id: string
   - userId: string
   - documentType: DocumentType
   - category?: ProtocolCategory
   - title: string
   - version: string
   - content?: string (rich text or markdown)
   - fileUrl?: string
   - effectiveDate: number
   - expirationDate?: number
   - approvedBy?: string
   - status: 'draft' | 'active' | 'archived'
   - createdAt: number
   - updatedAt: number

2. Create firebase functions for documents CRUD.

3. Create app/(tabs)/admin/documents.tsx:
   - List all documents grouped by type
   - Filter by category and status
   - Each document card shows: title, version, effective date, status
   - "Add Document" button

4. Create app/(tabs)/admin/documents/new.tsx:
   - Document type selector
   - Category selector (if protocol)
   - Title, version inputs
   - Content editor (multiline text for now)
   - File URL input
   - Effective date picker
   - Status selector

5. Create document detail screen:
   - Display full document content
   - Version history (if multiple versions exist)
   - Download/view file option
   - Edit, Archive, Delete buttons

6. Add "Protocols" quick link to Settings or Admin area.
```

---

### 6.3 Create Waste Disposal Records

```
Create waste disposal tracking for compliance:

1. In types/index.ts, add:

   WasteMaterialType = 'plant_material' | 'extraction_waste' | 'contaminated' | 'expired_product' | 'packaging' | 'other'
   
   DisposalMethod = 'incineration' | 'composting' | 'licensed_disposal' | 'other'
   
   WasteDisposal interface:
   - id: string
   - userId: string
   - disposalDate: number
   - materialType: WasteMaterialType
   - description: string
   - sourceEntityType?: 'plant' | 'harvest' | 'extract'
   - sourceEntityId?: string
   - quantityGrams: number
   - disposalMethod: DisposalMethod
   - disposalCompany?: string
   - manifestNumber?: string (for licensed disposal)
   - witnessName?: string
   - witnessSignature?: boolean
   - photoUrl?: string
   - notes?: string
   - createdAt: number

2. Create firebase functions for waste disposal CRUD.

3. Create app/(tabs)/admin/waste/index.tsx:
   - List of disposal records
   - Filter by date range, material type
   - Total weight disposed summary
   - "Record Disposal" button

4. Create new disposal form:
   - Date picker
   - Material type selector
   - Description
   - Optional link to source (plant, harvest, extract)
   - Quantity in grams
   - Disposal method selector
   - Disposal company (if applicable)
   - Witness name
   - Notes

5. Add "Record Waste" quick action to plant and harvest detail screens.
```

---

### 6.4 Export & Reporting System

```
Create export functionality for compliance reporting:

1. Create a new utility file: utils/exportData.ts with functions:
   - exportToCSV(data: any[], filename: string): void
   - exportToJSON(data: any, filename: string): void
   - generatePlantReport(userId, dateRange): Promise<PlantReportData>
   - generateHarvestReport(userId, dateRange): Promise<HarvestReportData>
   - generateDistributionReport(userId, dateRange): Promise<DistributionReportData>
   - generateComplianceReport(userId, dateRange): Promise<FullComplianceReport>

2. Create app/(tabs)/admin/reports.tsx:
   - Report type selector: Plants, Harvests, Distributions, Patients, Full Compliance
   - Date range picker
   - "Generate Report" button
   - Preview of report data in table format
   - "Export CSV" and "Export JSON" buttons
   - "Share" button to share the file

3. Report contents should include:
   
   Plants Report:
   - All plants with: control number, strain, genetics, start date, stage, harvest status
   
   Harvests Report:
   - All harvests with: control number, source plant, date, weights, purpose, distribution status
   
   Distributions Report:
   - All distributions with: date, patient (anonymized option), product type, quantity, batch number
   
   Full Compliance Report:
   - Summary statistics
   - Complete plant inventory
   - Harvest records
   - Distribution records with traceability
   - Lab analysis summary
   - Waste disposal records
   - Audit log summary

4. Use react-native-share or expo-sharing for export functionality.
5. Consider expo-file-system for file creation.
```

---

## Quick Reference: Complete Prompt List

| Phase | Task | Prompt ID |
|-------|------|-----------|
| 1.1 | Expand Plant Type | `1.1` |
| 1.2 | Update Plant Creation | `1.2` |
| 1.3 | Update Plant Detail | `1.3` |
| 2.1 | Harvest Data Model | `2.1` |
| 2.2 | Harvest Recording Screen | `2.2` |
| 2.3 | Harvests Management Tab | `2.3` |
| 3.1 | Patient Data Model | `3.1` |
| 3.2 | Patients Management | `3.2` |
| 3.3 | Distribution Tracking | `3.3` |
| 4.1 | Extract Data Model | `4.1` |
| 4.2 | Extracts Management | `4.2` |
| 5.1 | Lab Analysis Model | `5.1` |
| 5.2 | Lab Analysis Entry | `5.2` |
| 6.1 | Audit Log System | `6.1` |
| 6.2 | Protocols & Docs | `6.2` |
| 6.3 | Waste Disposal | `6.3` |
| 6.4 | Export & Reports | `6.4` |

---

## Recommended Execution Order

```
Week 1:
├── 1.1 Expand Plant Type ✓
├── 1.2 Update Plant Creation ✓
├── 1.3 Update Plant Detail ✓
└── 2.1 Harvest Data Model ✓

Week 2:
├── 2.2 Harvest Recording Screen ✓
├── 2.3 Harvests Management Tab ✓
├── 3.1 Patient Data Model ✓
└── 3.2 Patients Management ✓

Week 3:
├── 3.3 Distribution Tracking ✓
├── 4.1 Extract Data Model ✓
└── 4.2 Extracts Management ✓

Week 4:
├── 5.1 Lab Analysis Model ✓
├── 5.2 Lab Analysis Entry ✓
├── 6.1 Audit Log System ✓
└── 6.2 Protocols & Docs ✓

Week 5:
├── 6.3 Waste Disposal ✓
└── 6.4 Export & Reports ✓
```

---

**To execute**: Switch to **Agent Mode**, copy a prompt, and paste it. I recommend starting with **Prompt 1.1** and working through sequentially since later features depend on earlier ones.

