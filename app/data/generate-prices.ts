// Realistic UK commodity price generator for 156 weeks (3 years)
// v2: mean reversion, cross-correlation, harvest-year structure, 2022 spike echo

import { PriceSeries } from "@/app/lib/types";

function generateWeekDates(weeks: number): string[] {
  const dates: string[] = [];
  const end = new Date("2026-03-09");
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i * 7);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Seeded PRNG for reproducibility
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// Generate correlated random values (shared market factor + idiosyncratic)
function correlatedShock(
  rng: () => number,
  marketFactor: number,  // shared component
  correlation: number    // 0-1, how much market factor influences this series
): number {
  const idiosyncratic = (rng() - 0.5) * 2;
  return correlation * marketFactor + (1 - correlation) * idiosyncratic;
}

interface SeriesConfig {
  id: string;
  basePrice: number;
  volatility: number;        // weekly vol as fraction
  annualDrift: number;        // trend per year
  seasonalAmplitude: number;  // fraction
  seasonalPeakMonth: number;  // 0-11
  meanReversionSpeed: number; // 0-1, how fast price pulls back to trend
  marketCorrelation: number;  // 0-1, correlation with grain market factor
  seed: number;
  spike?: { startWeek: number; peakWeek: number; endWeek: number; magnitude: number };
}

function generateSeries(
  config: SeriesConfig,
  weeks: string[],
  marketFactors: number[]
): { weekStart: string; price: number }[] {
  const rng = seededRandom(config.seed);
  let price = config.basePrice;

  return weeks.map((weekStart, i) => {
    const date = new Date(weekStart);
    const month = date.getMonth();
    const yearFrac = i / 52;

    // Long-run equilibrium price (trend + seasonal)
    const trendPrice = config.basePrice * (1 + config.annualDrift * yearFrac);
    const seasonAngle = ((month - config.seasonalPeakMonth) / 12) * 2 * Math.PI;
    const equilibrium = trendPrice * (1 + config.seasonalAmplitude * Math.cos(seasonAngle));

    // Mean-reverting random walk
    const shock = correlatedShock(rng, marketFactors[i], config.marketCorrelation);
    const weeklyVol = config.volatility * config.basePrice * 0.1;
    const drift = config.meanReversionSpeed * (equilibrium - price);
    price = price + drift + shock * weeklyVol;

    // Spike overlay
    let spikeFactor = 1;
    if (config.spike && i >= config.spike.startWeek && i <= config.spike.endWeek) {
      const { startWeek, peakWeek, endWeek, magnitude } = config.spike;
      if (i <= peakWeek) {
        // Sharp rise
        spikeFactor = 1 + magnitude * Math.pow((i - startWeek) / (peakWeek - startWeek), 0.7);
      } else {
        // Slow decline
        spikeFactor = 1 + magnitude * Math.pow((endWeek - i) / (endWeek - peakWeek), 1.5);
      }
    }

    const finalPrice = Math.max(config.basePrice * 0.4, price * spikeFactor);
    return { weekStart, price: Math.round(finalPrice * 100) / 100 };
  });
}

const weeks = generateWeekDates(156);

// Generate shared market factor (grain market sentiment)
const marketRng = seededRandom(9999);
const marketFactors = weeks.map(() => (marketRng() - 0.5) * 2);

const seriesConfigs: SeriesConfig[] = [
  // ── INPUTS ──
  {
    id: "an_fertiliser",
    basePrice: 310,
    volatility: 0.18,
    annualDrift: 0.02,
    seasonalAmplitude: 0.08,
    seasonalPeakMonth: 2,  // peak in spring (application season)
    meanReversionSpeed: 0.06,
    marketCorrelation: 0.3,  // loosely tracks energy/grain
    seed: 101,
    spike: { startWeek: 8, peakWeek: 25, endWeek: 55, magnitude: 1.1 },
  },
  {
    id: "urea",
    basePrice: 370,
    volatility: 0.2,
    annualDrift: 0.015,
    seasonalAmplitude: 0.07,
    seasonalPeakMonth: 2,
    meanReversionSpeed: 0.06,
    marketCorrelation: 0.35,
    seed: 202,
    spike: { startWeek: 8, peakWeek: 23, endWeek: 50, magnitude: 0.95 },
  },
  {
    id: "feed_wheat",
    basePrice: 195,
    volatility: 0.1,
    annualDrift: -0.015,
    seasonalAmplitude: 0.12,
    seasonalPeakMonth: 1,  // expensive in winter, dip at harvest (Jul/Aug)
    meanReversionSpeed: 0.08,
    marketCorrelation: 0.8,  // heavily correlated with grain market
    seed: 303,
  },
  {
    id: "feed_barley",
    basePrice: 168,
    volatility: 0.1,
    annualDrift: -0.015,
    seasonalAmplitude: 0.12,
    seasonalPeakMonth: 1,
    meanReversionSpeed: 0.08,
    marketCorrelation: 0.85, // tracks wheat closely
    seed: 404,
  },
  {
    id: "soya_hp",
    basePrice: 475,
    volatility: 0.12,
    annualDrift: 0.01,
    seasonalAmplitude: 0.04,
    seasonalPeakMonth: 0,
    meanReversionSpeed: 0.05,
    marketCorrelation: 0.4,  // partly commodity, partly protein-specific
    seed: 505,
  },
  {
    id: "rapeseed_meal",
    basePrice: 255,
    volatility: 0.1,
    annualDrift: 0.0,
    seasonalAmplitude: 0.06,
    seasonalPeakMonth: 0,
    meanReversionSpeed: 0.07,
    marketCorrelation: 0.5,  // tracks OSR market
    seed: 606,
  },
  {
    id: "hay_bale",
    basePrice: 28,
    volatility: 0.15,
    annualDrift: 0.03,
    seasonalAmplitude: 0.18,
    seasonalPeakMonth: 1,   // expensive in winter, cheap after hay time (Jun/Jul)
    meanReversionSpeed: 0.04, // slow reversion — hyperlocal, sticky
    marketCorrelation: 0.1,  // barely correlated with grains
    seed: 707,
  },
  {
    id: "straw_bale",
    basePrice: 22,
    volatility: 0.12,
    annualDrift: 0.02,
    seasonalAmplitude: 0.15,
    seasonalPeakMonth: 1,
    meanReversionSpeed: 0.04,
    marketCorrelation: 0.15,
    seed: 808,
  },
  // ── OUTPUTS ──
  {
    id: "cattle_dw",
    basePrice: 445,
    volatility: 0.06,
    annualDrift: 0.035,
    seasonalAmplitude: 0.05,
    seasonalPeakMonth: 4,   // spring peak
    meanReversionSpeed: 0.1,
    marketCorrelation: 0.15, // livestock largely independent of grains
    seed: 909,
  },
  {
    id: "store_cattle",
    basePrice: 1080,
    volatility: 0.08,
    annualDrift: 0.03,
    seasonalAmplitude: 0.08,
    seasonalPeakMonth: 3,   // spring store sales
    meanReversionSpeed: 0.08,
    marketCorrelation: 0.1,
    seed: 1010,
  },
  {
    id: "lamb_dw",
    basePrice: 570,
    volatility: 0.08,
    annualDrift: 0.02,
    seasonalAmplitude: 0.15,
    seasonalPeakMonth: 3,   // Easter/spring peak, autumn glut dip
    meanReversionSpeed: 0.1,
    marketCorrelation: 0.05,
    seed: 1111,
  },
  {
    id: "milk_litre",
    basePrice: 35.5,
    volatility: 0.07,
    annualDrift: 0.02,
    seasonalAmplitude: 0.06,
    seasonalPeakMonth: 4,
    meanReversionSpeed: 0.12, // milk contracts = strong reversion
    marketCorrelation: 0.1,
    seed: 1212,
  },
  {
    id: "wheat_exfarm",
    basePrice: 188,
    volatility: 0.1,
    annualDrift: -0.015,
    seasonalAmplitude: 0.12,
    seasonalPeakMonth: 1,
    meanReversionSpeed: 0.08,
    marketCorrelation: 0.85,
    seed: 1313,
  },
  {
    id: "osr_exfarm",
    basePrice: 375,
    volatility: 0.1,
    annualDrift: -0.01,
    seasonalAmplitude: 0.08,
    seasonalPeakMonth: 0,
    meanReversionSpeed: 0.07,
    marketCorrelation: 0.6,
    seed: 1414,
  },
];

export const priceData: PriceSeries[] = seriesConfigs.map((config) => ({
  id: config.id,
  prices: generateSeries(config, weeks, marketFactors),
}));
