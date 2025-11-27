export interface User {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: number;
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
}

// Plant Types
export type StageName = "Seedling" | "Veg" | "Flower" | "Drying" | "Curing";

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
}

export interface Stage {
  id: string;
  plantId: string;
  name: StageName;
  startDate: number;
}

// Log Types
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
