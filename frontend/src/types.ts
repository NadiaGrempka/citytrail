export type Category = "food" | "store" | "event" | "landmark";

export type Transit = {
  mode: "tram" | "rail" | "bus";
  stop: string;
  walkMin: number;
};

export type UpcomingEvent = {
  title: string;
  dayOffset: number;
  time: string;
  genre: string;
};

export type Place = {
  id: string;
  name: string;
  category: Category;
  subcategory: string;
  district: string;
  address: string | null;
  lat: number;
  lng: number;
  coordsAccuracy: "landmark" | "approx";
  tags: string[];
  description: string;
  visitMinutes: number;
  priceLevel: 1 | 2 | 3;
  hoursNote: string | null;
  transit: Transit;
  upcomingEvents?: UpcomingEvent[];
};

export type District = {
  id: string;
  name: string;
  center: [number, number]; // [lat, lng]
  radiusM: number;
};

export type Slot = { category: Category; tags: string[] };
export type Intent = { slots: Slot[]; returnHome: boolean };

export type Leg = {
  mode: "walk" | "transit";
  minutes: number;
  distanceM: number;
  via: string;
};

export type Stop = {
  place: Place;
  arrive: string; // "HH:mm"
  depart: string; // "HH:mm"
  legFromPrevious: Leg;
  event: UpcomingEvent | null;
  notes: string[];
};

export type Plan = {
  parsedBy: "llm" | "keyword";
  intent: Intent;
  dayOffset: number;
  date: string; // ISO date
  startTime: string;
  endTime: string;
  totalMinutes: number;
  stops: Stop[];
  returnLeg: Leg | null;
  warnings: string[];
};
