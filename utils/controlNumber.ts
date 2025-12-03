/**
 * Control Number Generation Utilities
 * 
 * This module contains all the logic for generating control numbers
 * for different entity types in the application.
 * 
 * Control Number Formats (with random prefix letter and datetime):
 * - Plants: {RANDOM_LETTERS}A{YYYYMMDDHHMM}{SEQUENCE} (e.g., XA20251202143500001)
 * - Clones: {RANDOM_LETTERS}CL{YYYYMMDDHHMM}{SEQUENCE} (e.g., RCL20251202143500001)
 * - Harvests: {RANDOM_LETTERS}H{YYYYMMDDHHMM}{SEQUENCE} (e.g., BH20251202143500001)
 * - Extracts: {RANDOM_LETTERS}EX{YYYYMMDDHHMM}{SEQUENCE} (e.g., MEX20251202143500001)
 * - Distributions: {RANDOM_LETTERS}D{YYYYMMDDHHMM}{SEQUENCE} (e.g., KD20251202143500001)
 * - Orders: {RANDOM_LETTERS}O{YYYYMMDDHHMM}{SEQUENCE} (e.g., FO20251202143500001)
 */

/**
 * Generates a random uppercase letter (A-Z)
 * @returns A single random uppercase letter
 */
export const getRandomLetters = (): string => {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: 3 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
};

/**
 * Formats a sequence number with leading zeros (5 digits)
 * @param sequence - The sequence number
 * @returns The formatted sequence string (e.g., "00001")
 */
export const formatSequence = (sequence: number): string => {
  return String(sequence).padStart(5, '0');
};

/**
 * Gets the current year
 * @returns The current year as a number
 */
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Gets the current month (1-12)
 * @returns The current month as a number
 */
export const getCurrentMonth = (): number => {
  return new Date().getMonth() + 1;
};

/**
 * Gets the current day of the month (1-31)
 * @returns The current day as a number
 */
export const getCurrentDay = (): number => {
  return new Date().getDate();
};

/**
 * Gets the current datetime formatted for control numbers
 * Format: YYYYMMDDHHMM
 * @returns The formatted datetime string
 */
export const getFormattedDateTime = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}${hours}${minutes}`;
};

/**
 * Generates a control number for plants
 * Format: {RANDOM}A{YYYYMMDDHHMM}{SEQUENCE}
 * Example: XA20251202143500001
 * 
 * @param sequence - The sequence number for this plant
 * @returns The generated control number
 */
export const generateControlNumber = (sequence: number): string => {
  const randomLetter = getRandomLetters();
  const datetime = getFormattedDateTime();
  const sequenceStr = formatSequence(sequence);
  
  return `${randomLetter}A${datetime}${sequenceStr}`;
};

/**
 * Generates a control number for clones
 * Format: {RANDOM}CL{YYYYMMDDHHMM}{SEQUENCE}
 * Example: RCL20251202143500001
 * 
 * @param sequence - The sequence number for this clone
 * @returns The generated control number
 */
export const generateCloneControlNumber = (sequence: number): string => {
  const randomLetter = getRandomLetters();
  const datetime = getFormattedDateTime();
  const sequenceStr = formatSequence(sequence);
  
  return `${randomLetter}CL${datetime}${sequenceStr}`;
};

/**
 * Generates a control number for harvests
 * Format: {RANDOM}H{YYYYMMDDHHMM}{SEQUENCE}
 * Example: BH20251202143500001
 * 
 * @param sequence - The sequence number for this harvest
 * @returns The generated control number
 */
export const generateHarvestControlNumber = (sequence: number): string => {
  const randomLetter = getRandomLetters();
  const datetime = getFormattedDateTime();
  const sequenceStr = formatSequence(sequence);
  
  return `${randomLetter}H${datetime}${sequenceStr}`;
};

/**
 * Generates a control number for extracts
 * Format: {RANDOM}EX{YYYYMMDDHHMM}{SEQUENCE}
 * Example: MEX20251202143500001
 * 
 * @param sequence - The sequence number for this extract
 * @returns The generated control number
 */
export const generateExtractControlNumber = (sequence: number): string => {
  const randomLetter = getRandomLetters();
  const datetime = getFormattedDateTime();
  const sequenceStr = formatSequence(sequence);
  
  return `${randomLetter}EX${datetime}${sequenceStr}`;
};

/**
 * Generates a control number for distributions
 * Format: {RANDOM}D{YYYYMMDDHHMM}{SEQUENCE}
 * Example: KD20251202143500001
 * 
 * @param sequence - The sequence number for this distribution
 * @returns The generated control number
 */
export const generateDistributionNumber = (sequence: number): string => {
  const randomLetter = getRandomLetters();
  const datetime = getFormattedDateTime();
  const sequenceStr = formatSequence(sequence);
  
  return `${randomLetter}D${datetime}${sequenceStr}`;
};

/**
 * Generates a control number for orders
 * Format: {RANDOM}O{YYYYMMDDHHMM}{SEQUENCE}
 * Example: FO20251202143500001
 * 
 * @param sequence - The sequence number for this order
 * @returns The generated control number
 */
export const generateOrderNumber = (sequence: number): string => {
  const randomLetter = getRandomLetters();
  const datetime = getFormattedDateTime();
  const sequenceStr = formatSequence(sequence);
  
  return `${randomLetter}O${datetime}${sequenceStr}`;
};

/**
 * Control number prefixes for different entity types
 */
export const CONTROL_NUMBER_PREFIXES = {
  PLANT: 'A',
  CLONE: 'CL',
  HARVEST: 'H',
  EXTRACT: 'EX',
  DISTRIBUTION: 'D',
  ORDER: 'O',
} as const;

/**
 * Parses a control number and extracts its components
 * @param controlNumber - The control number to parse
 * @returns The parsed components or null if invalid format
 */
export const parseControlNumber = (controlNumber: string): {
  type: 'plant' | 'clone' | 'harvest' | 'extract' | 'distribution' | 'order';
  randomLetter: string;
  datetime: string;
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  sequence: number;
} | null => {
  // Distribution format: {RANDOM}D{YYYYMMDDHHMM}{SEQUENCE}
  const distributionMatch = controlNumber.match(/^([A-Z])D(\d{12})(\d{5})$/);
  if (distributionMatch) {
    const datetime = distributionMatch[2];
    return {
      type: 'distribution',
      randomLetter: distributionMatch[1],
      datetime,
      year: parseInt(datetime.substring(0, 4), 10),
      month: parseInt(datetime.substring(4, 6), 10),
      day: parseInt(datetime.substring(6, 8), 10),
      hours: parseInt(datetime.substring(8, 10), 10),
      minutes: parseInt(datetime.substring(10, 12), 10),
      sequence: parseInt(distributionMatch[3], 10),
    };
  }

  // Order format: {RANDOM}O{YYYYMMDDHHMM}{SEQUENCE}
  const orderMatch = controlNumber.match(/^([A-Z])O(\d{12})(\d{5})$/);
  if (orderMatch) {
    const datetime = orderMatch[2];
    return {
      type: 'order',
      randomLetter: orderMatch[1],
      datetime,
      year: parseInt(datetime.substring(0, 4), 10),
      month: parseInt(datetime.substring(4, 6), 10),
      day: parseInt(datetime.substring(6, 8), 10),
      hours: parseInt(datetime.substring(8, 10), 10),
      minutes: parseInt(datetime.substring(10, 12), 10),
      sequence: parseInt(orderMatch[3], 10),
    };
  }

  // Extract format: {RANDOM}EX{YYYYMMDDHHMM}{SEQUENCE}
  const extractMatch = controlNumber.match(/^([A-Z])EX(\d{12})(\d{5})$/);
  if (extractMatch) {
    const datetime = extractMatch[2];
    return {
      type: 'extract',
      randomLetter: extractMatch[1],
      datetime,
      year: parseInt(datetime.substring(0, 4), 10),
      month: parseInt(datetime.substring(4, 6), 10),
      day: parseInt(datetime.substring(6, 8), 10),
      hours: parseInt(datetime.substring(8, 10), 10),
      minutes: parseInt(datetime.substring(10, 12), 10),
      sequence: parseInt(extractMatch[3], 10),
    };
  }

  // Clone format: {RANDOM}CL{YYYYMMDDHHMM}{SEQUENCE}
  const cloneMatch = controlNumber.match(/^([A-Z])CL(\d{12})(\d{5})$/);
  if (cloneMatch) {
    const datetime = cloneMatch[2];
    return {
      type: 'clone',
      randomLetter: cloneMatch[1],
      datetime,
      year: parseInt(datetime.substring(0, 4), 10),
      month: parseInt(datetime.substring(4, 6), 10),
      day: parseInt(datetime.substring(6, 8), 10),
      hours: parseInt(datetime.substring(8, 10), 10),
      minutes: parseInt(datetime.substring(10, 12), 10),
      sequence: parseInt(cloneMatch[3], 10),
    };
  }

  // Plant format: {RANDOM}A{YYYYMMDDHHMM}{SEQUENCE}
  const plantMatch = controlNumber.match(/^([A-Z])A(\d{12})(\d{5})$/);
  if (plantMatch) {
    const datetime = plantMatch[2];
    return {
      type: 'plant',
      randomLetter: plantMatch[1],
      datetime,
      year: parseInt(datetime.substring(0, 4), 10),
      month: parseInt(datetime.substring(4, 6), 10),
      day: parseInt(datetime.substring(6, 8), 10),
      hours: parseInt(datetime.substring(8, 10), 10),
      minutes: parseInt(datetime.substring(10, 12), 10),
      sequence: parseInt(plantMatch[3], 10),
    };
  }

  // Harvest format: {RANDOM}H{YYYYMMDDHHMM}{SEQUENCE}
  const harvestMatch = controlNumber.match(/^([A-Z])H(\d{12})(\d{5})$/);
  if (harvestMatch) {
    const datetime = harvestMatch[2];
    return {
      type: 'harvest',
      randomLetter: harvestMatch[1],
      datetime,
      year: parseInt(datetime.substring(0, 4), 10),
      month: parseInt(datetime.substring(4, 6), 10),
      day: parseInt(datetime.substring(6, 8), 10),
      hours: parseInt(datetime.substring(8, 10), 10),
      minutes: parseInt(datetime.substring(10, 12), 10),
      sequence: parseInt(harvestMatch[3], 10),
    };
  }

  return null;
};
