import { InputDef, OutputDef } from "@/app/lib/types";

export const inputs: InputDef[] = [
  { id: "an_fertiliser", name: "Ammonium Nitrate (34.5%)", unit: "£/tonne", category: "fertiliser" },
  { id: "urea", name: "Urea (46%)", unit: "£/tonne", category: "fertiliser" },
  { id: "feed_wheat", name: "Feed Wheat", unit: "£/tonne", category: "feed" },
  { id: "feed_barley", name: "Feed Barley", unit: "£/tonne", category: "feed" },
  { id: "soya_hp", name: "Protected Soya (HP)", unit: "£/tonne", category: "feed" },
  { id: "rapeseed_meal", name: "Rapeseed Meal", unit: "£/tonne", category: "feed" },
  { id: "hay_bale", name: "Hay (big bale)", unit: "£/bale", category: "feed" },
  { id: "straw_bale", name: "Straw (wheat)", unit: "£/bale", category: "feed" },
];

export const outputs: OutputDef[] = [
  { id: "cattle_dw", name: "Clean Cattle (R4L)", unit: "p/kg DW" },
  { id: "store_cattle", name: "Store Cattle (12-18m)", unit: "£/head" },
  { id: "lamb_dw", name: "Finished Lamb (R3L)", unit: "p/kg DW" },
  { id: "milk_litre", name: "Milk (standard litre)", unit: "p/litre" },
  { id: "wheat_exfarm", name: "Feed Wheat (ex-farm)", unit: "£/tonne" },
  { id: "osr_exfarm", name: "OSR (ex-farm)", unit: "£/tonne" },
];
