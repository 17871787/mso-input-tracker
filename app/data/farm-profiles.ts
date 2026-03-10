import { FarmProfile } from "@/app/lib/types";

export const farmProfiles: FarmProfile[] = [
  {
    id: "thornside",
    name: "Thornside Farm",
    type: "Upland Sheep",
    location: "North Pennines, ~300m ASL",
    size: "450 acres",
    enterprise: "600 Swaledale ewes, 200 hoggs, small number of store cattle outwintered",
    primaryOutput: "Store and finished lambs (deadweight), cull ewes",
    msoContext: "Operates near MSO by nature — rough grazing limits intensification. Buy-zone analysis most relevant for winter forage purchasing decisions.",
    inputMappings: [
      {
        inputId: "hay_bale",
        outputId: "lamb_dw",
        conversionFactor: 0.25, // 1 bale supports 4 ewes for 1 week; cost relative to lamb value
        conversionNote: "1 bale (25kg DM) ≈ 4 ewes/week at maintenance. 150 bales per 100 ewes per winter.",
        feedGapStartMonth: 11,
        feedGapEndMonth: 4,
      },
      {
        inputId: "straw_bale",
        outputId: "lamb_dw",
        conversionFactor: 0.15,
        conversionNote: "Bedding + supplementary roughage. Lower conversion value than hay.",
        feedGapStartMonth: 11,
        feedGapEndMonth: 4,
      },
      {
        inputId: "an_fertiliser",
        outputId: "lamb_dw",
        conversionFactor: 0.08,
        conversionNote: "Minimal AN use — enclosed fields only. Low conversion to lamb output.",
        applicationWindowStart: 3,
        applicationWindowEnd: 8,
      },
    ],
  },
  {
    id: "lowfield",
    name: "Lowfield Farm",
    type: "Lowland Suckler Beef",
    location: "Lincolnshire, lowland mixed grassland",
    size: "320 acres",
    enterprise: "120 Limousin × suckler cows, finishing progeny to deadweight",
    primaryOutput: "Finished cattle (R4L/U3L grades), deadweight at £4.00–£5.00/kg DW",
    msoContext: "Closest to the classical MSO tension: barley feeding in the finishing period is the marginal corrective cost decision.",
    inputMappings: [
      {
        inputId: "feed_barley",
        outputId: "cattle_dw",
        conversionFactor: 7.0, // FCR 7:1 — 7kg barley per kg DW gain
        conversionNote: "FCR 7:1 in finishing. 1 tonne barley ≈ 100kg DW gain. Break-even: barley < 100 × DW price.",
        feedGapStartMonth: 12,
        feedGapEndMonth: 3,
      },
      {
        inputId: "straw_bale",
        outputId: "cattle_dw",
        conversionFactor: 0.3,
        conversionNote: "Bedding + roughage for housed cattle.",
        feedGapStartMonth: 10,
        feedGapEndMonth: 4,
      },
      {
        inputId: "an_fertiliser",
        outputId: "cattle_dw",
        conversionFactor: 0.12,
        conversionNote: "Grass growth for silage and grazing. Moderate use on permanent and temporary grass.",
        applicationWindowStart: 2,
        applicationWindowEnd: 9,
      },
      {
        inputId: "urea",
        outputId: "cattle_dw",
        conversionFactor: 0.1,
        conversionNote: "Alternative N source for grass. Cheaper per unit N but volatilisation risk.",
        applicationWindowStart: 3,
        applicationWindowEnd: 8,
      },
    ],
  },
  {
    id: "moorgate",
    name: "Moorgate Dairy",
    type: "Dairy",
    location: "Cheshire plain, high-rainfall dairy country",
    size: "500 acres",
    enterprise: "280-cow Holstein-Friesian herd, 9,000 litre average, year-round calving",
    primaryOutput: "Milk (p/litre, standard litre at 4.0% fat / 3.3% protein)",
    msoContext: "Most input-intensive livestock system. Tracker focuses on concentrate cost-per-litre ratio — models when bought-in protein moves from marginal to clearly uneconomic.",
    inputMappings: [
      {
        inputId: "feed_wheat",
        outputId: "milk_litre",
        conversionFactor: 0.56, // 1kg compound ≈ 1.8L milk response; wheat component
        conversionNote: "Energy component of TMR. 1kg high-energy cake (£350/t) produces ~1.8L milk at peak. Net cost includes forage substitution credit.",
        feedGapStartMonth: 11,
        feedGapEndMonth: 4,
        substitutionFactor: 0.6, // 0.6 kg DM forage displaced per kg concentrate eaten
        substitutionValuePerUnit: 0.16, // £0.16/kg DM (£160/t DM pasture transfer price)
      },
      {
        inputId: "soya_hp",
        outputId: "milk_litre",
        conversionFactor: 0.4, // protein concentrate, lower volume but critical
        conversionNote: "0.25kg soya DCP ≈ 0.1L milk protein response. Highly variable by forage quality. Net cost includes forage substitution credit.",
        feedGapStartMonth: 11,
        feedGapEndMonth: 4,
        substitutionFactor: 0.4, // lower substitution for protein — less forage displacement
        substitutionValuePerUnit: 0.16,
      },
      {
        inputId: "rapeseed_meal",
        outputId: "milk_litre",
        conversionFactor: 0.45,
        conversionNote: "Alternative protein to soya. Lower protein content but UK-sourced. Net cost includes forage substitution credit.",
        feedGapStartMonth: 11,
        feedGapEndMonth: 4,
        substitutionFactor: 0.45,
        substitutionValuePerUnit: 0.16,
      },
      {
        inputId: "an_fertiliser",
        outputId: "milk_litre",
        conversionFactor: 0.15,
        conversionNote: "Grass and maize silage production. High use on permanent grass for grazing platform.",
        applicationWindowStart: 2,
        applicationWindowEnd: 9,
      },
    ],
  },
  {
    id: "bridgefoot",
    name: "Bridgefoot Farm",
    type: "Mixed Arable/Livestock",
    location: "East Midlands, Grade 2/3 land",
    size: "800 acres",
    enterprise: "Wheat, OSR, winter barley; 200-ewe Suffolk cross flock",
    primaryOutput: "Feed wheat (£/tonne ex-farm), OSR (£/tonne), finished lambs",
    msoContext: "Arable inputs are the hardest case for MSO — nitrogen is directly yield-limiting. Tracker models fertiliser rationality using N:grain price ratio.",
    inputMappings: [
      {
        inputId: "an_fertiliser",
        outputId: "wheat_exfarm",
        conversionFactor: 0.083, // 1kg N → 12kg grain. AN is 34.5% N. Break-even calc.
        conversionNote: "10-14kg grain per kg N at optimal rates (~180kg N/ha). Break-even AN ≈ £263/t at £200/t wheat.",
        applicationWindowStart: 2,
        applicationWindowEnd: 9,
      },
      {
        inputId: "urea",
        outputId: "wheat_exfarm",
        conversionFactor: 0.065,
        conversionNote: "Higher N content (46%) but volatilisation losses. Effective rate ~10kg grain per kg N applied.",
        applicationWindowStart: 3,
        applicationWindowEnd: 7,
      },
      {
        inputId: "feed_barley",
        outputId: "lamb_dw",
        conversionFactor: 5.0, // farm-grown barley as sheep supplement, better FCR than beef
        conversionNote: "Farm-grown barley as sheep supplement. Opportunity cost vs sale price. FCR ~5:1 for lambs.",
        feedGapStartMonth: 11,
        feedGapEndMonth: 3,
      },
      {
        inputId: "hay_bale",
        outputId: "lamb_dw",
        conversionFactor: 0.2,
        conversionNote: "Winter roughage for ewes. 200 ewes, 5-month feed gap.",
        feedGapStartMonth: 11,
        feedGapEndMonth: 3,
      },
    ],
  },
];
