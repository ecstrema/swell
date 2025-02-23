export function positiveModulo(x: number, mod: number) {
  return ((x % mod) + mod) % mod;
}

export function bound(x: number, min: number, max: number) {
  return Math.min(Math.max(x, min), max);
}

export function normalizedLinearInterpolation(
  v: number,
  min: number,
  max: number
) {
  return v * (max - min) + min;
}
