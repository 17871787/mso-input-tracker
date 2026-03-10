import {
  FarmProfile,
  FarmInputMapping,
  PriceSeries,
  WeeklySignal,
  RAGSignal,
  AbsoluteVerdict,
  ShockScenario,
  ShockedSignal,
} from "./types";
import { inputs } from "@/app/data/inputs-outputs";

// ── Price helpers ──

function getPrice(series: PriceSeries[], id: string, weekStart: string): number | null {
  const s = series.find((s) => s.id === id);
  if (!s) return null;
  const p = s.prices.find((p) => p.weekStart === weekStart);
  return p ? p.price : null;
}

function getAllPricesUpTo(
  series: PriceSeries[],
  id: string,
  weekStart: string,
  windowWeeks: number
): number[] {
  const s = series.find((s) => s.id === id);
  if (!s) return [];
  const weekIdx = s.prices.findIndex((p) => p.weekStart === weekStart);
  if (weekIdx < 0) return [];
  const start = Math.max(0, weekIdx - windowWeeks + 1);
  return s.prices.slice(start, weekIdx + 1).map((p) => p.price);
}

// ── Core calculations ──

function calculateRatio(
  mapping: FarmInputMapping,
  inputPrice: number,
  outputPrice: number
): number {
  return (inputPrice * mapping.conversionFactor) / outputPrice;
}

function percentileRank(value: number, distribution: number[]): number {
  if (distribution.length === 0) return 50;
  const sorted = [...distribution].sort((a, b) => a - b);
  let count = 0;
  for (const v of sorted) {
    if (v < value) count++;
    else if (v === value) count += 0.5;
  }
  return (count / sorted.length) * 100;
}

function assignRAG(percentile: number): RAGSignal {
  if (percentile <= 33) return "green";
  if (percentile <= 66) return "amber";
  return "red";
}

function assignAbsoluteVerdict(ratio: number): AbsoluteVerdict {
  if (ratio < 1.0) return "profitable";
  if (ratio <= 1.2) return "marginal";
  return "uneconomic";
}

function isInSeason(mapping: FarmInputMapping, weekStart: string): boolean {
  const month = new Date(weekStart).getMonth() + 1;

  const inputDef = inputs.find((i) => i.id === mapping.inputId);
  const isFertiliser = inputDef?.category === "fertiliser";

  if (isFertiliser) {
    const start = mapping.applicationWindowStart;
    const end = mapping.applicationWindowEnd;
    if (!start || !end) return true;
    if (start <= end) return month >= start && month <= end;
    return month >= start || month <= end;
  } else {
    const start = mapping.feedGapStartMonth;
    const end = mapping.feedGapEndMonth;
    if (!start || !end) return true;
    if (start <= end) return month >= start && month <= end;
    return month >= start || month <= end;
  }
}

// ── Stability & trend ──

function getWeeksBefore(
  series: PriceSeries[],
  weekStart: string,
  count: number
): string[] {
  const anySeries = series[0];
  if (!anySeries) return [];
  const idx = anySeries.prices.findIndex((p) => p.weekStart === weekStart);
  if (idx < 0) return [];
  const result: string[] = [];
  for (let i = Math.max(0, idx - count); i < idx; i++) {
    result.push(anySeries.prices[i].weekStart);
  }
  return result;
}

function computeStabilityAndTrend(
  farm: FarmProfile,
  mapping: FarmInputMapping,
  prices: PriceSeries[],
  weekStart: string,
  currentRag: RAGSignal,
  windowWeeks: number = 156
): { stabilityWeeks: number; trendDirection: "improving" | "worsening" | "stable" } {
  const prevWeeks = getWeeksBefore(prices, weekStart, 52);

  // Stability: count consecutive weeks with same RAG going backwards
  let stabilityWeeks = 1;
  for (let i = prevWeeks.length - 1; i >= 0; i--) {
    const wk = prevWeeks[i];
    const ip = getPrice(prices, mapping.inputId, wk);
    const op = getPrice(prices, mapping.outputId, wk);
    if (!ip || !op) break;

    const ratio = calculateRatio(mapping, ip, op);
    const histInput = getAllPricesUpTo(prices, mapping.inputId, wk, windowWeeks);
    const histOutput = getAllPricesUpTo(prices, mapping.outputId, wk, windowWeeks);
    const minLen = Math.min(histInput.length, histOutput.length);
    const histRatios: number[] = [];
    for (let j = 0; j < minLen; j++) {
      histRatios.push(calculateRatio(mapping, histInput[j], histOutput[j]));
    }
    const pct = percentileRank(ratio, histRatios);
    const inSeason = isInSeason(mapping, wk);
    const rag = inSeason ? assignRAG(pct) : "grey";

    if (rag === currentRag) {
      stabilityWeeks++;
    } else {
      break;
    }
  }

  // Trend: compare current percentile to 4 weeks ago
  let trendDirection: "improving" | "worsening" | "stable" = "stable";
  if (prevWeeks.length >= 4) {
    const fourWeeksAgo = prevWeeks[prevWeeks.length - 4];
    const ip4 = getPrice(prices, mapping.inputId, fourWeeksAgo);
    const op4 = getPrice(prices, mapping.outputId, fourWeeksAgo);
    const ipNow = getPrice(prices, mapping.inputId, weekStart);
    const opNow = getPrice(prices, mapping.outputId, weekStart);
    if (ip4 && op4 && ipNow && opNow) {
      const ratioNow = calculateRatio(mapping, ipNow, opNow);
      const ratio4 = calculateRatio(mapping, ip4, op4);
      const diff = ratioNow - ratio4;
      const threshold = ratio4 * 0.03; // 3% change = meaningful
      if (diff < -threshold) trendDirection = "improving";
      else if (diff > threshold) trendDirection = "worsening";
    }
  }

  return { stabilityWeeks, trendDirection };
}

// ── Main signal calculation ──

export function calculateWeeklySignals(
  farm: FarmProfile,
  prices: PriceSeries[],
  weekStart: string,
  windowWeeks: number = 156
): WeeklySignal[] {
  return farm.inputMappings.map((mapping) => {
    const inputPrice = getPrice(prices, mapping.inputId, weekStart);
    const outputPrice = getPrice(prices, mapping.outputId, weekStart);
    const inSeason = isInSeason(mapping, weekStart);

    if (!inputPrice || !outputPrice) {
      return {
        farmId: farm.id,
        inputId: mapping.inputId,
        outputId: mapping.outputId,
        weekStart,
        ratioValue: 0,
        percentileRank: 50,
        ragSignal: "grey" as RAGSignal,
        absoluteVerdict: "uneconomic" as AbsoluteVerdict,
        inSeasonGate: inSeason,
        currentInputPrice: inputPrice ?? 0,
        currentOutputPrice: outputPrice ?? 0,
        stabilityWeeks: 0,
        trendDirection: "stable" as const,
      };
    }

    const currentRatio = calculateRatio(mapping, inputPrice, outputPrice);

    const historicalInputPrices = getAllPricesUpTo(prices, mapping.inputId, weekStart, windowWeeks);
    const historicalOutputPrices = getAllPricesUpTo(prices, mapping.outputId, weekStart, windowWeeks);
    const minLen = Math.min(historicalInputPrices.length, historicalOutputPrices.length);
    const historicalRatios: number[] = [];
    for (let i = 0; i < minLen; i++) {
      historicalRatios.push(calculateRatio(mapping, historicalInputPrices[i], historicalOutputPrices[i]));
    }

    const pctRank = percentileRank(currentRatio, historicalRatios);
    const rag: RAGSignal = inSeason ? assignRAG(pctRank) : "grey";
    const absVerdict = assignAbsoluteVerdict(currentRatio);

    const { stabilityWeeks, trendDirection } = computeStabilityAndTrend(
      farm,
      mapping,
      prices,
      weekStart,
      rag,
      windowWeeks
    );

    return {
      farmId: farm.id,
      inputId: mapping.inputId,
      outputId: mapping.outputId,
      weekStart,
      ratioValue: Math.round(currentRatio * 1000) / 1000,
      percentileRank: Math.round(pctRank),
      ragSignal: rag,
      absoluteVerdict: absVerdict,
      inSeasonGate: inSeason,
      currentInputPrice: inputPrice,
      currentOutputPrice: outputPrice,
      stabilityWeeks,
      trendDirection,
    };
  });
}

// ── Summary ──

export function generateFarmSummary(
  farm: FarmProfile,
  signals: WeeklySignal[]
): string {
  const greens = signals.filter((s) => s.ragSignal === "green");
  const reds = signals.filter((s) => s.ragSignal === "red");
  const ambers = signals.filter((s) => s.ragSignal === "amber");
  const greys = signals.filter((s) => s.ragSignal === "grey");

  const getName = (id: string) => inputs.find((i) => i.id === id)?.name ?? id;
  const parts: string[] = [];

  if (greens.length > 0) {
    const names = greens.map((s) => getName(s.inputId)).join(" and ");
    parts.push(`${names} ${greens.length === 1 ? "is" : "are"} in the buy zone this week`);
  }
  if (ambers.length > 0) {
    const names = ambers.map((s) => getName(s.inputId)).join(", ");
    parts.push(`${names} ${ambers.length === 1 ? "is" : "are"} amber`);
  }
  if (reds.length > 0) {
    const names = reds.map((s) => getName(s.inputId)).join(", ");
    parts.push(`${names} ${reds.length === 1 ? "is" : "are"} red — avoid if possible`);
  }
  if (greys.length > 0 && greens.length + ambers.length + reds.length > 0) {
    parts.push(`${greys.length} input${greys.length > 1 ? "s" : ""} out of season`);
  }

  // Add warnings for green-but-uneconomic
  const greenButBad = greens.filter((s) => s.absoluteVerdict === "uneconomic");
  if (greenButBad.length > 0) {
    const names = greenButBad.map((s) => getName(s.inputId)).join(", ");
    parts.push(`Note: ${names} ${greenButBad.length === 1 ? "is" : "are"} historically cheap but still above break-even`);
  }

  if (parts.length === 0) return `${farm.name}: all inputs are out of season.`;
  return `${farm.name}: ${parts.join(". ")}.`;
}

// ── Historical ratios ──

export function getHistoricalRatios(
  farm: FarmProfile,
  mapping: FarmInputMapping,
  prices: PriceSeries[]
): { weekStart: string; ratio: number; percentile: number; rag: RAGSignal }[] {
  const inputSeries = prices.find((s) => s.id === mapping.inputId);
  const outputSeries = prices.find((s) => s.id === mapping.outputId);
  if (!inputSeries || !outputSeries) return [];

  const weeks = inputSeries.prices.map((p) => p.weekStart);
  const result: { weekStart: string; ratio: number; percentile: number; rag: RAGSignal }[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const weekStart = weeks[i];
    const inputPrice = inputSeries.prices[i]?.price;
    const outputPrice = outputSeries.prices.find((p) => p.weekStart === weekStart)?.price;
    if (!inputPrice || !outputPrice) continue;

    const ratio = calculateRatio(mapping, inputPrice, outputPrice);

    const windowStart = Math.max(0, i - 155);
    const historicalRatios: number[] = [];
    for (let j = windowStart; j <= i; j++) {
      const ip = inputSeries.prices[j]?.price;
      const op = outputSeries.prices.find((p) => p.weekStart === inputSeries.prices[j]?.weekStart)?.price;
      if (ip && op) historicalRatios.push(calculateRatio(mapping, ip, op));
    }

    const pct = percentileRank(ratio, historicalRatios);
    const inSeason = isInSeason(mapping, weekStart);

    result.push({
      weekStart,
      ratio: Math.round(ratio * 1000) / 1000,
      percentile: Math.round(pct),
      rag: inSeason ? assignRAG(pct) : "grey",
    });
  }

  return result;
}

// ── Shock testing ──

export function applyPriceShock(
  prices: PriceSeries[],
  shocks: Record<string, number>,
  weekStart: string
): PriceSeries[] {
  return prices.map((series) => {
    const multiplier = shocks[series.id];
    if (!multiplier || multiplier === 1) return series;

    return {
      ...series,
      prices: series.prices.map((p) => {
        if (p.weekStart === weekStart) {
          return { ...p, price: Math.round(p.price * multiplier * 100) / 100 };
        }
        return p;
      }),
    };
  });
}

export const shockScenarios: ShockScenario[] = [
  {
    id: "output_down",
    name: "Output −15%",
    description: "All output commodity prices drop 15%",
    shocks: {
      cattle_dw: 0.85,
      store_cattle: 0.85,
      lamb_dw: 0.85,
      milk_litre: 0.85,
      wheat_exfarm: 0.85,
      osr_exfarm: 0.85,
    },
  },
  {
    id: "inputs_up",
    name: "Inputs +25%",
    description: "All input costs rise 25%",
    shocks: {
      an_fertiliser: 1.25,
      urea: 1.25,
      feed_wheat: 1.25,
      feed_barley: 1.25,
      soya_hp: 1.25,
      rapeseed_meal: 1.25,
      hay_bale: 1.25,
      straw_bale: 1.25,
    },
  },
  {
    id: "fert_spike",
    name: "Fertiliser +50%",
    description: "AN and urea spike 50% (2022-style)",
    shocks: {
      an_fertiliser: 1.5,
      urea: 1.5,
    },
  },
  {
    id: "feed_squeeze",
    name: "Feed +30%",
    description: "All feed inputs rise 30%",
    shocks: {
      feed_wheat: 1.3,
      feed_barley: 1.3,
      soya_hp: 1.3,
      rapeseed_meal: 1.3,
      hay_bale: 1.3,
      straw_bale: 1.3,
    },
  },
  {
    id: "two_hit",
    name: "Two-hit",
    description: "Inputs +25% AND output −10%",
    shocks: {
      an_fertiliser: 1.25,
      urea: 1.25,
      feed_wheat: 1.25,
      feed_barley: 1.25,
      soya_hp: 1.25,
      rapeseed_meal: 1.25,
      hay_bale: 1.25,
      straw_bale: 1.25,
      cattle_dw: 0.9,
      store_cattle: 0.9,
      lamb_dw: 0.9,
      milk_litre: 0.9,
      wheat_exfarm: 0.9,
      osr_exfarm: 0.9,
    },
  },
];

export function runShockTest(
  farm: FarmProfile,
  prices: PriceSeries[],
  weekStart: string,
  scenario: ShockScenario,
  baselineSignals: WeeklySignal[]
): ShockedSignal[] {
  const shockedPrices = applyPriceShock(prices, scenario.shocks, weekStart);
  const shockedSignals = calculateWeeklySignals(farm, shockedPrices, weekStart);

  return shockedSignals.map((shocked) => {
    const baseline = baselineSignals.find((b) => b.inputId === shocked.inputId);
    const baseRag = baseline?.ragSignal ?? "grey";
    const ragOrder: Record<RAGSignal, number> = { green: 0, amber: 1, red: 2, grey: -1 };

    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      inputId: shocked.inputId,
      baselineRag: baseRag,
      shockedRag: shocked.ragSignal,
      baselineRatio: baseline?.ratioValue ?? 0,
      shockedRatio: shocked.ratioValue,
      ragChanged: baseRag !== shocked.ragSignal,
      worsened: ragOrder[shocked.ragSignal] > ragOrder[baseRag],
    };
  });
}

// ── Week navigation helpers ──

export function getAvailableWeeks(prices: PriceSeries[]): string[] {
  const first = prices[0];
  if (!first) return [];
  return first.prices.map((p) => p.weekStart);
}
