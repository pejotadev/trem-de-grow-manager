/**
 * Control Number Generation Utilities
 * 
 * This module contains all the logic for generating control numbers
 * for different entity types in the application.
 * 
 * Control Number Formats:
 * - Plants: A-{ENV_INITIALS}-{YEAR}-{SEQUENCE} (e.g., A-MT-2025-00001)
 * - Clones: CL-{ENV_INITIALS}-{YEAR}-{SEQUENCE} (e.g., CL-MT-2025-00001)
 * - Harvests: H-{ENV_INITIALS}-{YEAR}-{SEQUENCE} (e.g., H-MT-2025-00001)
 * - Extracts: EX-{YEAR}-{SEQUENCE} (e.g., EX-2025-00001)
 */

/**
 * Extracts initials from environment name (first letter of each word)
 * @param environmentName - The environment name (e.g., "Main Tent")
 * @returns The initials (e.g., "MT")
 */
export const getEnvironmentInitials = (environmentName: string): string => {
  return environmentName
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
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
 * Generates a control number for plants
 * Format: A-{ENV_INITIALS}-{YEAR}-{SEQUENCE}
 * Example: A-MT-2025-00001 for "Main Tent" environment
 * 
 * @param environmentName - The name of the environment
 * @param sequence - The sequence number for this plant
 * @returns The generated control number
 */
export const generateControlNumber = (environmentName: string, sequence: number): string => {
  const initials = getEnvironmentInitials(environmentName);
  const year = getCurrentYear();
  const sequenceStr = formatSequence(sequence);
  
  return `A-${initials}-${year}-${sequenceStr}`;
};

/**
 * Generates a control number for clones
 * Format: CL-{ENV_INITIALS}-{YEAR}-{SEQUENCE}
 * Example: CL-MT-2025-00001 for a clone in "Main Tent" environment
 * 
 * @param environmentName - The name of the environment
 * @param sequence - The sequence number for this clone
 * @returns The generated control number
 */
export const generateCloneControlNumber = (environmentName: string, sequence: number): string => {
  const initials = getEnvironmentInitials(environmentName);
  const year = getCurrentYear();
  const sequenceStr = formatSequence(sequence);
  
  return `CL-${initials}-${year}-${sequenceStr}`;
};

/**
 * Generates a control number for harvests
 * Format: H-{ENV_INITIALS}-{YEAR}-{SEQUENCE}
 * Example: H-MT-2025-00001 for a harvest in "Main Tent" environment
 * 
 * @param environmentName - The name of the environment
 * @param sequence - The sequence number for this harvest
 * @returns The generated control number
 */
export const generateHarvestControlNumber = (environmentName: string, sequence: number): string => {
  const initials = getEnvironmentInitials(environmentName);
  const year = getCurrentYear();
  const sequenceStr = formatSequence(sequence);
  
  return `H-${initials}-${year}-${sequenceStr}`;
};

/**
 * Generates a control number for extracts
 * Format: EX-{YEAR}-{SEQUENCE}
 * Example: EX-2025-00001
 * 
 * @param sequence - The sequence number for this extract
 * @returns The generated control number
 */
export const generateExtractControlNumber = (sequence: number): string => {
  const year = getCurrentYear();
  const sequenceStr = formatSequence(sequence);
  
  return `EX-${year}-${sequenceStr}`;
};

/**
 * Control number prefixes for different entity types
 */
export const CONTROL_NUMBER_PREFIXES = {
  PLANT: 'A',
  CLONE: 'CL',
  HARVEST: 'H',
  EXTRACT: 'EX',
} as const;

/**
 * Parses a control number and extracts its components
 * @param controlNumber - The control number to parse
 * @returns The parsed components or null if invalid format
 */
export const parseControlNumber = (controlNumber: string): {
  type: 'plant' | 'clone' | 'harvest' | 'extract';
  initials?: string;
  year: number;
  sequence: number;
} | null => {
  // Extract format: EX-YYYY-SEQUENCE
  const extractMatch = controlNumber.match(/^EX-(\d{4})-(\d{5})$/);
  if (extractMatch) {
    return {
      type: 'extract',
      year: parseInt(extractMatch[1], 10),
      sequence: parseInt(extractMatch[2], 10),
    };
  }

  // Other formats: PREFIX-INITIALS-YEAR-SEQUENCE
  const match = controlNumber.match(/^(A|CL|H)-([A-Z]+)-(\d{4})-(\d{5})$/);
  if (match) {
    const prefix = match[1];
    const type = prefix === 'A' ? 'plant' : prefix === 'CL' ? 'clone' : 'harvest';
    
    return {
      type,
      initials: match[2],
      year: parseInt(match[3], 10),
      sequence: parseInt(match[4], 10),
    };
  }

  return null;
};

