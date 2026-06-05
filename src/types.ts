/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameStatus = 'waiting' | 'active' | 'paused' | 'ended';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface GameSettings {
  roundDuration: number; // in seconds
  difficulty: Difficulty;
  totalRounds: number;
  capacity: number;
  parameters?: SimulationParameters;
}

export type EventType = 'material_shortage' | 'demand_surge' | 'machine_breakdown';

export interface GameEvent {
  type: EventType;
  severity: 'low' | 'medium' | 'high';
  message: string;
}

export interface Session {
  id: string;
  instructorId: string;
  code: string;
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  settings: GameSettings;
  activeEvent?: GameEvent | null;
  roundStartedAt?: string | null;
  createdAt: string;
  gameName?: string;
  scenarioName?: string;
  scoreThresholds?: number[];
  allowedInstructors?: string[];
  allowedStudents?: string[];
  startDate?: string;
  endDate?: string;
}

export interface StationConfig {
  owned: number;
  active: number;
  capacityPerMachine: number;
  purchasePrice: number;
}

export interface Contract {
  id: string;
  name: string;
  appearsAtDay: number;
  beginsAtDay: number;
  endsAtDay: number;
  dailyDemand: number;
  pricePerUnit: number;
  fillRateRequired: number; // e.g. 70
  fillRatePenalty: number;
  exitPenalty: number;
  status: 'pending' | 'offered' | 'accepted' | 'aborted' | 'finished';
  deliveredCount: number;
  demandedCount: number;
}

export interface Delivery {
  roundArriving: number;
  quantity: number;
  item?: 'flour' | 'sugar' | 'cocoa'; // Specific raw material item
}

export interface Team {
  id: string;
  sessionId: string;
  name: string;
  balance: number;
  inventory: Record<string, number>; // standard -> Muffin quantity
  rawMaterials: number;
  satisfaction: number;
  ready: boolean;
  joinedAt: string;
  orderQuantity?: number;
  reorderPoint?: number;
  flourStock?: number;
  sugarStock?: number;
  eggsStock?: number;
  cocoaStock?: number;
  flourOrderQty?: number;
  flourROP?: number;
  sugarOrderQty?: number;
  sugarROP?: number;
  eggsOrderQty?: number;
  eggsROP?: number;
  cocoaOrderQty?: number;
  cocoaROP?: number;
  stations?: {
    mixing: StationConfig;
    bottling: StationConfig;
    packaging: StationConfig;
    icing?: StationConfig;
  };
  deliveries?: Delivery[];
  contracts?: Contract[];
  currentDecision?: {
    productionQty: Record<string, number>;
    rawMaterialOrder: number;
    marketingSpend: number;
    submittedAt: string;
    stations?: {
      mixing: { active: number };
      bottling: { active: number };
      packaging: { active: number };
      icing?: { active: number };
    };
  };
}

export interface Decision {
  id: string; // usually round number
  sessionId: string;
  teamId: string;
  round: number;
  productionQty: Record<string, number>; // productId -> quantity
  rawMaterialOrder: number;
  marketingSpend: number;
  submittedAt: string;
}

export interface RoundResult {
  id: string;
  sessionId: string;
  teamId: string;
  round: number;
  revenue: number;
  profit: number;
  soldQty: Record<string, number>;
  missedDemand: Record<string, number>;
  productionCost: number;
  inventoryCost: number;
  rawMaterialCost: number;
  marketingCost: number;
  penalties: number;
  balanceAfter: number;
}

export interface Product {
  id: string;
  name: string;
  materialCost: number;
  productionCost: number;
  sellingPrice: number;
  capacityRequirement: number; // units of capacity per unit of product
}

export const PRODUCTS: Product[] = [
  {
    id: 'standard',
    name: 'Muffin Premium',
    materialCost: 1,
    productionCost: 2,
    sellingPrice: 20,
    capacityRequirement: 1,
  },
];

export interface SimulationParameters {
  products: Product[];
  storageCost: number;
  rawMaterialUnitPrice: number;
  backorderPenalty: number;
  initialBalance: number;
  initialRawMaterials: number;
  initialCapacity: number;
  baseLeadTime: number;
}

export const DEFAULT_PARAMETERS: SimulationParameters = {
  products: PRODUCTS,
  storageCost: 1,
  rawMaterialUnitPrice: 8,
  backorderPenalty: 2,
  initialBalance: 2000000,
  initialRawMaterials: 12000,
  initialCapacity: 72,
  baseLeadTime: 1, // Default to 1 day
};

export const INITIAL_VALUES = {
  BALANCE: 2000000,
  RAW_MATERIALS: 12000,
  CAPACITY: 72, // per round
  STORAGE_COST: 1, // per unit in inventory
  RAW_MATERIAL_UNIT_PRICE: 8,
};

export const DEFAULT_STATIONS = {
  mixing: { owned: 2, active: 2, capacityPerMachine: 54, purchasePrice: 50000 },
  bottling: { owned: 3, active: 3, capacityPerMachine: 24, purchasePrice: 75000 },
  icing: { owned: 2, active: 1, capacityPerMachine: 55, purchasePrice: 60000 },
  packaging: { owned: 1, active: 1, capacityPerMachine: 216, purchasePrice: 40000 }
};

export interface License {
  id: string; // The License Code itself
  customerName: string;
  email: string;
  maxSeats: number; // Seat limit, e.g., 20 or 40
  type: 'academic' | 'corporate';
  status: 'active' | 'expired' | 'suspended';
  expiresAt: string;
  createdAt: string;
  notes?: string;
  instructorId?: string;
  instructorPassword?: string;
  studentId?: string;
  studentPassword?: string;
  studentAccounts?: { studentId: string; studentPassword: string; }[];
}

export interface SystemLog {
  id: string;
  timestamp: string;
  errorMessage: string;
  severity: 'warning' | 'error' | 'fatal';
  component: string;
  userEmail?: string;
  sessionId?: string;
}

