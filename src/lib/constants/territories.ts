export const TERRITORIES = [
  "West Coast",
  "East Coast", 
  "Midwest",
  "South",
  "Southwest",
  "Mountain West",
  "Northeast",
  "Southeast"
] as const;

export type Territory = typeof TERRITORIES[number];