/**
 * Audited Firestore Operations
 * 
 * This module wraps the standard Firestore CRUD operations with automatic audit logging.
 * Use these functions instead of the direct firestore.ts functions when you need audit trails.
 */

import {
  // Plant operations
  createPlant as _createPlant,
  getPlant,
  updatePlant as _updatePlant,
  deletePlant as _deletePlant,
  // Harvest operations
  createHarvest as _createHarvest,
  getHarvest,
  updateHarvest as _updateHarvest,
  deleteHarvest as _deleteHarvest,
  // Patient operations
  createPatient as _createPatient,
  getPatient,
  updatePatient as _updatePatient,
  deletePatient as _deletePatient,
  // Distribution operations
  createDistribution as _createDistribution,
  getDistribution,
  updateDistribution as _updateDistribution,
  deleteDistribution as _deleteDistribution,
  // Extract operations
  createExtract as _createExtract,
  getExtract,
  updateExtract as _updateExtract,
  deleteExtract as _deleteExtract,
  // Environment operations
  createEnvironment as _createEnvironment,
  getEnvironment,
  updateEnvironment as _updateEnvironment,
  deleteEnvironment as _deleteEnvironment,
} from './firestore';

import { logCreate, logUpdate, logDelete } from './auditLog';

import {
  Plant,
  Harvest,
  Patient,
  Distribution,
  Extract,
  Environment,
} from '../types';

// ==================== PLANT OPERATIONS WITH AUDIT ====================

export const createPlantWithAudit = async (
  plantData: Omit<Plant, 'id' | 'controlNumber'>,
  userEmail: string
): Promise<string> => {
  const id = await _createPlant(plantData);
  
  // Fetch the created plant to get the control number for the audit log
  const createdPlant = await getPlant(id);
  
  await logCreate(
    plantData.userId,
    userEmail,
    'plant',
    id,
    createdPlant?.name || plantData.name,
    { ...plantData, id, controlNumber: createdPlant?.controlNumber }
  );
  
  return id;
};

export const updatePlantWithAudit = async (
  plantId: string,
  data: Partial<Plant>,
  userId: string,
  userEmail: string
): Promise<void> => {
  // Get previous state
  const previousPlant = await getPlant(plantId);
  
  // Perform update
  await _updatePlant(plantId, data);
  
  // Get new state
  const updatedPlant = await getPlant(plantId);
  
  await logUpdate(
    userId,
    userEmail,
    'plant',
    plantId,
    updatedPlant?.name || previousPlant?.name,
    previousPlant,
    updatedPlant
  );
};

export const deletePlantWithAudit = async (
  plantId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  // Get state before deletion
  const plant = await getPlant(plantId);
  
  // Perform delete
  await _deletePlant(plantId);
  
  await logDelete(
    userId,
    userEmail,
    'plant',
    plantId,
    plant?.name,
    plant
  );
};

// ==================== HARVEST OPERATIONS WITH AUDIT ====================

export const createHarvestWithAudit = async (
  harvestData: Omit<Harvest, 'id' | 'controlNumber'>,
  userEmail: string
): Promise<string> => {
  const id = await _createHarvest(harvestData);
  
  // Fetch the created harvest to get the control number
  const createdHarvest = await getHarvest(id);
  
  await logCreate(
    harvestData.userId,
    userEmail,
    'harvest',
    id,
    createdHarvest?.controlNumber,
    { ...harvestData, id, controlNumber: createdHarvest?.controlNumber }
  );
  
  return id;
};

export const updateHarvestWithAudit = async (
  harvestId: string,
  data: Partial<Harvest>,
  userId: string,
  userEmail: string
): Promise<void> => {
  const previousHarvest = await getHarvest(harvestId);
  
  await _updateHarvest(harvestId, data);
  
  const updatedHarvest = await getHarvest(harvestId);
  
  await logUpdate(
    userId,
    userEmail,
    'harvest',
    harvestId,
    updatedHarvest?.controlNumber || previousHarvest?.controlNumber,
    previousHarvest,
    updatedHarvest
  );
};

export const deleteHarvestWithAudit = async (
  harvestId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  const harvest = await getHarvest(harvestId);
  
  await _deleteHarvest(harvestId);
  
  await logDelete(
    userId,
    userEmail,
    'harvest',
    harvestId,
    harvest?.controlNumber,
    harvest
  );
};

// ==================== PATIENT OPERATIONS WITH AUDIT ====================

export const createPatientWithAudit = async (
  patientData: Omit<Patient, 'id'>,
  userEmail: string
): Promise<string> => {
  const id = await _createPatient(patientData);
  
  await logCreate(
    patientData.userId,
    userEmail,
    'patient',
    id,
    patientData.name,
    { ...patientData, id }
  );
  
  return id;
};

export const updatePatientWithAudit = async (
  patientId: string,
  data: Partial<Patient>,
  userId: string,
  userEmail: string
): Promise<void> => {
  const previousPatient = await getPatient(patientId);
  
  await _updatePatient(patientId, data);
  
  const updatedPatient = await getPatient(patientId);
  
  await logUpdate(
    userId,
    userEmail,
    'patient',
    patientId,
    updatedPatient?.name || previousPatient?.name,
    previousPatient,
    updatedPatient
  );
};

export const deletePatientWithAudit = async (
  patientId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  const patient = await getPatient(patientId);
  
  await _deletePatient(patientId);
  
  await logDelete(
    userId,
    userEmail,
    'patient',
    patientId,
    patient?.name,
    patient
  );
};

// ==================== DISTRIBUTION OPERATIONS WITH AUDIT ====================

export const createDistributionWithAudit = async (
  distributionData: Omit<Distribution, 'id' | 'distributionNumber'>,
  userEmail: string
): Promise<string> => {
  const id = await _createDistribution(distributionData);
  
  const createdDistribution = await getDistribution(id);
  
  await logCreate(
    distributionData.userId,
    userEmail,
    'distribution',
    id,
    createdDistribution?.distributionNumber,
    { ...distributionData, id, distributionNumber: createdDistribution?.distributionNumber }
  );
  
  return id;
};

export const updateDistributionWithAudit = async (
  distributionId: string,
  data: Partial<Distribution>,
  userId: string,
  userEmail: string
): Promise<void> => {
  const previousDistribution = await getDistribution(distributionId);
  
  await _updateDistribution(distributionId, data);
  
  const updatedDistribution = await getDistribution(distributionId);
  
  await logUpdate(
    userId,
    userEmail,
    'distribution',
    distributionId,
    updatedDistribution?.distributionNumber || previousDistribution?.distributionNumber,
    previousDistribution,
    updatedDistribution
  );
};

export const deleteDistributionWithAudit = async (
  distributionId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  const distribution = await getDistribution(distributionId);
  
  await _deleteDistribution(distributionId);
  
  await logDelete(
    userId,
    userEmail,
    'distribution',
    distributionId,
    distribution?.distributionNumber,
    distribution
  );
};

// ==================== EXTRACT OPERATIONS WITH AUDIT ====================

export const createExtractWithAudit = async (
  extractData: Omit<Extract, 'id' | 'controlNumber'>,
  userEmail: string
): Promise<string> => {
  const id = await _createExtract(extractData);
  
  const createdExtract = await getExtract(id);
  
  await logCreate(
    extractData.userId,
    userEmail,
    'extract',
    id,
    createdExtract?.controlNumber || createdExtract?.name,
    { ...extractData, id, controlNumber: createdExtract?.controlNumber }
  );
  
  return id;
};

export const updateExtractWithAudit = async (
  extractId: string,
  data: Partial<Extract>,
  userId: string,
  userEmail: string
): Promise<void> => {
  const previousExtract = await getExtract(extractId);
  
  await _updateExtract(extractId, data);
  
  const updatedExtract = await getExtract(extractId);
  
  await logUpdate(
    userId,
    userEmail,
    'extract',
    extractId,
    updatedExtract?.controlNumber || updatedExtract?.name || previousExtract?.name,
    previousExtract,
    updatedExtract
  );
};

export const deleteExtractWithAudit = async (
  extractId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  const extract = await getExtract(extractId);
  
  await _deleteExtract(extractId);
  
  await logDelete(
    userId,
    userEmail,
    'extract',
    extractId,
    extract?.controlNumber || extract?.name,
    extract
  );
};

// ==================== ENVIRONMENT OPERATIONS WITH AUDIT ====================

export const createEnvironmentWithAudit = async (
  envData: Omit<Environment, 'id'>,
  userEmail: string
): Promise<string> => {
  const id = await _createEnvironment(envData);
  
  await logCreate(
    envData.userId,
    userEmail,
    'environment',
    id,
    envData.name,
    { ...envData, id }
  );
  
  return id;
};

export const updateEnvironmentWithAudit = async (
  environmentId: string,
  data: Partial<Environment>,
  userId: string,
  userEmail: string
): Promise<void> => {
  const previousEnv = await getEnvironment(environmentId);
  
  await _updateEnvironment(environmentId, data);
  
  const updatedEnv = await getEnvironment(environmentId);
  
  await logUpdate(
    userId,
    userEmail,
    'environment',
    environmentId,
    updatedEnv?.name || previousEnv?.name,
    previousEnv,
    updatedEnv
  );
};

export const deleteEnvironmentWithAudit = async (
  environmentId: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  const env = await getEnvironment(environmentId);
  
  await _deleteEnvironment(environmentId);
  
  await logDelete(
    userId,
    userEmail,
    'environment',
    environmentId,
    env?.name,
    env
  );
};

