export type RAGSignal = "green" | "amber" | "red" | "grey";

export type AbsoluteVerdict = "profitable" | "marginal" | "uneconomic";

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
  breakEvenNote?: string;
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
  absoluteVerdict: AbsoluteVerdict;
  inSeasonGate: boolean;
  currentInputPrice: number;
  currentOutputPrice: number;
  stabilityWeeks: number;
  trendDirection: "improving" | "worsening" | "stable";
}

export interface FarmWeeklySummary {
  farmId: string;
  farmName: string;
  weekStart: string;
  signals: WeeklySignal[];
  summary: string;
}

export interface ShockScenario {
  id: string;
  name: string;
  description: string;
  shocks: Record<string, number>; // price series id → multiplier
}

export interface ShockedSignal {
  scenarioId: string;
  scenarioName: string;
  inputId: string;
  baselineRag: RAGSignal;
  shockedRag: RAGSignal;
  baselineRatio: number;
  shockedRatio: number;
  ragChanged: boolean;
  worsened: boolean;
}
