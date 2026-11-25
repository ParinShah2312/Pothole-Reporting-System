/** Parses a number and checks it is within [min, max]; returns null if missing. */
export function parseCoord(value, min, max) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : NaN;
}

export const parseLat = (v) => parseCoord(v, -90, 90);
export const parseLng = (v) => parseCoord(v, -180, 180);
