// Realistic UK commodity price generator for 156 weeks (3 years)
// Prices based on AHDB published data 2023-2026

import { PriceSeries } from "@/app/lib/types";

function generateWeekDates(weeks: number): string[] {
  const dates: string[] = [];
  const end = new Date("2026-03-09"); // current week
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i * 7);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Seeded random for reproducibility
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generatePriceSeries(
  basePrice: number,
  volatility: number, // fraction, e.g. 0.15 = ±15%
  trend: number, // annual drift, e.g. 0.05 = +5%/yr
  seasonalAmplitude: number, // fraction
  seasonalPeakMonth: number, // 0-11
  seed: number,
  weeks: string[],
  spike?: { startWeek: number; peakWeek: number; endWeek: number; magnitude: number }
): { weekStart: string; price: number }[] {
  const rng = seededRandom(seed);
  let price = basePrice;
  return weeks.map((weekStart, i) => {
    const date = new Date(weekStart);
    const month = date.getMonth();
    const yearFrac = i / 52;

    // Trend
    const trendFactor = 1 + trend * yearFrac;

    // Seasonal
    const seasonAngle = ((month - seasonalPeakMonth) / 12) * 2 * Math.PI;
    const seasonFactor = 1 + seasonalAmplitude * Math.cos(seasonAngle);

    // Random walk
    const shock = (rng() - 0.5) * 2 * volatility * basePrice * 0.05;
    price = price + shock;

    // Spike overlay (e.g. 2022-style fertiliser spike)
    let spikeFactor = 1;
    if (spike && i >= spike.startWeek && i <= spike.endWeek) {
      const peak = spike.peakWeek;
      if (i <= peak) {
        spikeFactor = 1 + spike.magnitude * ((i - spike.startWeek) / (peak - spike.startWeek));
      } else {
        spikeFactor = 1 + spike.magnitude * ((spike.endWeek - i) / (spike.endWeek - peak));
      }
    }

    const finalPrice = Math.max(
      basePrice * 0.5,
      price * trendFactor * seasonFactor * spikeFactor / basePrice
    );

    return { weekStart, price: Math.round(finalPrice * 100) / 100 };
  });
}

const weeks = generateWeekDates(156);

export const priceData: PriceSeries[] = [
  // INPUTS
  {
    id: "an_fertiliser",
    prices: generatePriceSeries(320, 0.2, 0.03, 0.08, 2, 101, weeks,
      { startWeek: 10, peakWeek: 30, endWeek: 55, magnitude: 1.2 }), // echo of 2022 spike tail
  },
  {
    id: "urea",
    prices: generatePriceSeries(380, 0.2, 0.02, 0.07, 2, 202, weeks,
      { startWeek: 10, peakWeek: 28, endWeek: 50, magnitude: 1.0 }),
  },
  {
    id: "feed_wheat",
    prices: generatePriceSeries(195, 0.12, -0.02, 0.1, 6, 303, weeks), // harvest dip July
  },
  {
    id: "feed_barley",
    prices: generatePriceSeries(170, 0.12, -0.02, 0.1, 6, 404, weeks),
  },
  {
    id: "soya_hp",
    prices: generatePriceSeries(480, 0.15, 0.01, 0.05, 1, 505, weeks),
  },
  {
    id: "rapeseed_meal",
    prices: generatePriceSeries(260, 0.12, 0.0, 0.06, 7, 606, weeks),
  },
  {
    id: "hay_bale",
    prices: generatePriceSeries(28, 0.18, 0.04, 0.15, 1, 707, weeks), // peak in winter
  },
  {
    id: "straw_bale",
    prices: generatePriceSeries(22, 0.15, 0.03, 0.12, 1, 808, weeks),
  },
  // OUTPUTS
  {
    id: "cattle_dw",
    prices: generatePriceSeries(450, 0.08, 0.04, 0.06, 4, 909, weeks), // p/kg DW
  },
  {
    id: "store_cattle",
    prices: generatePriceSeries(1100, 0.1, 0.03, 0.08, 3, 1010, weeks), // £/head
  },
  {
    id: "lamb_dw",
    prices: generatePriceSeries(580, 0.1, 0.02, 0.12, 3, 1111, weeks), // p/kg DW, peak spring
  },
  {
    id: "milk_litre",
    prices: generatePriceSeries(36, 0.1, 0.02, 0.08, 4, 1212, weeks), // p/litre
  },
  {
    id: "wheat_exfarm",
    prices: generatePriceSeries(190, 0.12, -0.02, 0.1, 6, 1313, weeks),
  },
  {
    id: "osr_exfarm",
    prices: generatePriceSeries(380, 0.12, -0.01, 0.08, 7, 1414, weeks),
  },
];
