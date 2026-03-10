export type RAGSignal = "green" | "amber" | "red" | "grey";

export interface InputDef {
  id: string;
  name: string;
  unit: string;
  category: "feed" | "fertiliser";
}

export interface OutputDef {
  id: string;
  name: string;
  unit: string;
}

export interface FarmInputMapping {
  inputId: string;
  outputId: string;
  conversionFactor: number;
  conversionNote: string;
  feedGapStartMonth?: number; // 1-12, undefined = year-round
  feedGapEndMonth?: number;
  applicationWindowStart?: number; // for fertiliser
  applicationWindowEnd?: number;
}

export interface FarmProfile {
  id: string;
  name: string;
  type: string;
  location: string;
  size: string;
  enterprise: string;
  primaryOutput: string;
  msoContext: string;
  inputMappings: FarmInputMapping[];
}

export interface PricePoint {
  weekStart: string; // ISO date string
  price: number;
}

export interface PriceSeries {
  id: string; // matches InputDef.id or OutputDef.id
  prices: PricePoint[];
}

export interface WeeklySignal {
  farmId: string;
  inputId: string;
  outputId: string;
  weekStart: string;
  ratioValue: number;
  percentileRank: number;
  ragSignal: RAGSignal;
  inSeasonGate: boolean;
  currentInputPrice: number;
  currentOutputPrice: number;
}

export interface FarmWeeklySummary {
  farmId: string;
  farmName: string;
  weekStart: string;
  signals: WeeklySignal[];
  summary: string;
}
