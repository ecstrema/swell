export function positiveModulo(x: number, mod: number) {
  return ((x % mod) + mod) % mod;
}
