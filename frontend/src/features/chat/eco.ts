import type { Plan } from "../../types";

// Rough emission factors in grams of CO2 per passenger-kilometre. They are estimates for a demo:
// an average petrol car versus a mix of Gdańsk trams, buses and city trains. Walking counts as zero.
const CAR_G_PER_KM = 170;
const TRANSIT_G_PER_KM = 60;

export type Eco = { carGrams: number; tripGrams: number; savedGrams: number };

/** CO2 of this plan compared with driving the same legs; null when there is nothing to compare. */
export function ecoSummary(plan: Plan): Eco | null {
  const legs = [...plan.stops.map((s) => s.legFromPrevious), ...(plan.returnLeg ? [plan.returnLeg] : [])];
  const totalKm = legs.reduce((sum, leg) => sum + leg.distanceM, 0) / 1000;
  const transitKm = legs.filter((l) => l.mode === "transit").reduce((sum, l) => sum + l.distanceM, 0) / 1000;
  const carGrams = Math.round(totalKm * CAR_G_PER_KM);
  if (carGrams <= 0) return null;
  const tripGrams = Math.round(transitKm * TRANSIT_G_PER_KM);
  return { carGrams, tripGrams, savedGrams: Math.max(0, carGrams - tripGrams) };
}
