import type { Plan } from "../../types";

const CAR_G_PER_KM = 170;
const TRANSIT_G_PER_KM = 60;

export type Eco = { carGrams: number; tripGrams: number; savedGrams: number };

export function ecoSummary(plan: Plan): Eco | null {
  const legs = [...plan.stops.map((s) => s.legFromPrevious), ...(plan.returnLeg ? [plan.returnLeg] : [])];
  const totalKm = legs.reduce((sum, leg) => sum + leg.distanceM, 0) / 1000;
  const transitKm = legs.filter((l) => l.mode === "transit").reduce((sum, l) => sum + l.distanceM, 0) / 1000;
  const carGrams = Math.round(totalKm * CAR_G_PER_KM);
  if (carGrams <= 0) return null;
  const tripGrams = Math.round(transitKm * TRANSIT_G_PER_KM);
  return { carGrams, tripGrams, savedGrams: Math.max(0, carGrams - tripGrams) };
}
