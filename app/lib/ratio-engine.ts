import { FarmProfile, FarmInputMapping, PriceSeries, WeeklySignal, RAGSignal, FarmWeeklySummary } from "./types";
import { inputs } from "@/app/data/inputs-outputs";

function getPrice(series: PriceSeries[], id: string, weekStart: string): number | null {
  const s = series.find((s) => s.id === id);
  if (!s) return null;
  const p = s.prices.find((p) => p.weekStart === weekStart);
  return p ? p.price : null;
}

function getAllPricesUpTo(series: PriceSeries[], id: string, weekStart: string, windowWeeks: number): number[] {
  const s = series.find((s) => s.id === id);
  if (!s) return [];
  const weekIdx = s.prices.findIndex((p) => p.weekStart === weekStart);
  if (weekIdx < 0) return [];
  const start = Math.max(0, weekIdx - windowWeeks + 1);
  return s.prices.slice(start, weekIdx + 1).map((p) => p.price);
}

function calculateRatio(
  mapping: FarmInputMapping,
  inputPrice: number,
  outputPrice: number
): number {
  // Ratio = (input cost to produce one unit of output) / (output price per unit)
  // Higher ratio = input is more expensive relative to output = worse deal
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

function isInSeason(mapping: FarmInputMapping, weekStart: string): boolean {
  const month = new Date(weekStart).getMonth() + 1; // 1-12

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
    if (!start || !end) return true; // year-round
    if (start <= end) return month >= start && month <= end;
    return month >= start || month <= end; // wraps around year
  }
}

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
        inSeasonGate: inSeason,
        currentInputPrice: inputPrice ?? 0,
        currentOutputPrice: outputPrice ?? 0,
      };
    }

    const currentRatio = calculateRatio(mapping, inputPrice, outputPrice);

    // Build historical ratios
    const historicalInputPrices = getAllPricesUpTo(prices, mapping.inputId, weekStart, windowWeeks);
    const historicalOutputPrices = getAllPricesUpTo(prices, mapping.outputId, weekStart, windowWeeks);
    const minLen = Math.min(historicalInputPrices.length, historicalOutputPrices.length);
    const historicalRatios: number[] = [];
    for (let i = 0; i < minLen; i++) {
      historicalRatios.push(calculateRatio(mapping, historicalInputPrices[i], historicalOutputPrices[i]));
    }

    const pctRank = percentileRank(currentRatio, historicalRatios);
    const rag: RAGSignal = inSeason ? assignRAG(pctRank) : "grey";

    return {
      farmId: farm.id,
      inputId: mapping.inputId,
      outputId: mapping.outputId,
      weekStart,
      ratioValue: Math.round(currentRatio * 1000) / 1000,
      percentileRank: Math.round(pctRank),
      ragSignal: rag,
      inSeasonGate: inSeason,
      currentInputPrice: inputPrice,
      currentOutputPrice: outputPrice,
    };
  });
}

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

  if (parts.length === 0) return `${farm.name}: all inputs are out of season.`;
  return `${farm.name}: ${parts.join(". ")}.`;
}

export function getHistoricalRatios(
  farm: FarmProfile,
  mapping: FarmInputMapping,
  prices: PriceSeries[],
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

    // Historical window up to this point
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
