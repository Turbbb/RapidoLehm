import type { ColorColumn, PigmentRecipe } from './types';
import { COLOR_DATABASE, getSwatch, getColumnAnchors, interpolateRow } from './data';

// --- CIELAB conversion ---

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToXyz(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  return [
    0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb,
    0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb,
    0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb,
  ];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / xn), fy = f(y / yn), fz = f(z / zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToLab(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const [x, y, z] = linearToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function labToXyz(l: number, a: number, b: number): [number, number, number] {
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const fy = (l + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const fInv = (t: number) => (t > 0.008856 ? Math.pow(t, 3) : (t - 16 / 116) / 7.787);
  return [xn * fInv(fx), yn * fInv(fy), zn * fInv(fz)];
}

function xyzToLinear(x: number, y: number, z: number): [number, number, number] {
  return [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ];
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

export function labToHex(l: number, a: number, b: number): string {
  const [x, y, z] = labToXyz(l, a, b);
  let [r, g, bl] = xyzToLinear(x, y, z);
  r = linearToSrgb(r);
  g = linearToSrgb(g);
  bl = linearToSrgb(bl);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
  return '#' + [clamp(r), clamp(g), clamp(bl)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

// --- Hue ring and earth-tone axes ---
// Columns B→Q form the hue ring (yellow→orange→red→blue→green→gold)
// R, S, T are independent earth-tone axes (Rehbraun/Moccabraun/Schwarz)
const HUE_RING: ColorColumn[] = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q'];
const EARTH_TONES: ColorColumn[] = ['R', 'S', 'T'];

// Precompute LAB for all swatches
const SWATCH_LAB = new Map<string, [number, number, number]>();
for (const s of COLOR_DATABASE) {
  SWATCH_LAB.set(`${s.column}-${s.row}`, hexToLab(s.hex));
}

function getSwatchLab(col: ColorColumn, row: number): [number, number, number] {
  return SWATCH_LAB.get(`${col}-${row}`) ?? hexToLab('#E8E4D8');
}

// --- Interpolation ---

export interface InterpolationResult {
  hex: string;
  recipe: PigmentRecipe;
  adjusted: boolean;
  nearestSwatch: { column: ColorColumn; row: number };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRecipe(a: PigmentRecipe, b: PigmentRecipe, t: number): PigmentRecipe {
  const result: PigmentRecipe = { weiss: 0, gelb: 0, orange: 0, rot: 0, blau: 0, gruen: 0, rehbraun: 0, moccabraun: 0, schwarz: 0 };
  for (const key of Object.keys(result) as (keyof PigmentRecipe)[]) {
    result[key] = lerp(a[key], b[key], t);
  }
  return result;
}

function labDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(a[0] - b[0], 2) +
    Math.pow(a[1] - b[1], 2) +
    Math.pow(a[2] - b[2], 2)
  );
}

// Find nearest swatch in LAB space across the full database
function findNearestSwatch(targetLab: [number, number, number]): { column: ColorColumn; row: number; dist: number } {
  let best = { column: 'A' as ColorColumn, row: 1, dist: Infinity };
  for (const s of COLOR_DATABASE) {
    const lab = getSwatchLab(s.column, s.row);
    const dist = labDistance(targetLab, lab);
    if (dist < best.dist) {
      best = { column: s.column, row: s.row, dist };
    }
  }
  return best;
}

// Bilinear interpolation between two adjacent columns at a fractional row
// Uses the piecewise-linear row anchor data for each column
function bilinearInterpolateRecipe(
  col1: ColorColumn, col2: ColorColumn, row: number, colWeight: number
): PigmentRecipe {
  const anchors1 = getColumnAnchors(col1);
  const anchors2 = getColumnAnchors(col2);
  const recipe1 = interpolateRow(anchors1, row);
  const recipe2 = interpolateRow(anchors2, row);
  return lerpRecipe(recipe1, recipe2, colWeight);
}

export function interpolateColor(targetHex: string): InterpolationResult {
  const targetLab = hexToLab(targetHex);
  const nearest = findNearestSwatch(targetLab);
  const nearestLab = getSwatchLab(nearest.column, nearest.row);

  // Check if within gamut (small distance = within gamut)
  const adjusted = nearest.dist > 5.0;

  // Get the nearest swatch's recipe
  const nearestSwatchData = getSwatch(nearest.column, nearest.row);
  if (!nearestSwatchData) {
    return {
      hex: targetHex,
      recipe: { weiss: 0, gelb: 0, orange: 0, rot: 0, blau: 0, gruen: 0, rehbraun: 0, moccabraun: 0, schwarz: 0 },
      adjusted: false,
      nearestSwatch: { column: 'A', row: 1 },
    };
  }

  // Find second-nearest for bilinear interpolation
  let secondNearest = { column: 'A' as ColorColumn, row: 1, dist: Infinity };
  for (const s of COLOR_DATABASE) {
    if (s.column === nearest.column && s.row === nearest.row) continue;
    const lab = getSwatchLab(s.column, s.row);
    const dist = labDistance(targetLab, lab);
    if (dist < secondNearest.dist) {
      secondNearest = { column: s.column, row: s.row, dist };
    }
  }

  // Compute interpolation weight between the two nearest swatches
  const totalDist = nearest.dist + secondNearest.dist;
  const t = totalDist > 0 ? secondNearest.dist / totalDist : 0;

  // Use bilinear interpolation with piecewise-linear row anchors
  // If both nearest swatches are in the same column, interpolate along the row axis
  // If they're in adjacent columns, do bilinear across both
  let recipe: PigmentRecipe;

  if (nearest.column === secondNearest.column) {
    // Same column — interpolate along row axis using anchor table
    const anchors = getColumnAnchors(nearest.column);
    const fractionalRow = lerp(nearest.row, secondNearest.row, t);
    recipe = interpolateRow(anchors, fractionalRow);
  } else {
    // Different columns — bilinear interpolation
    // Determine fractional row from the nearest swatch
    const row = nearest.row;
    recipe = bilinearInterpolateRecipe(nearest.column, secondNearest.column, row, t);
  }

  return {
    hex: adjusted ? nearestSwatchData.hex : targetHex,
    recipe,
    adjusted,
    nearestSwatch: { column: nearest.column, row: nearest.row },
  };
}

// --- Gamut boundary check ---
export function isWithinGamut(hex: string): boolean {
  const targetLab = hexToLab(hex);
  const nearest = findNearestSwatch(targetLab);
  return nearest.dist <= 5.0;
}

// Get display name for a swatch
export function getSwatchName(column: ColorColumn, row: number): string {
  return `${column}${row}`;
}

// Get column display name
export function getColumnName(col: ColorColumn): string {
  const names: Record<ColorColumn, string> = {
    NW: 'Naturweiß',
    A: 'Ockergelb', B: 'Ochsengelb', C: 'Gelb-Orange', D: 'Orange-Gelb',
    E: 'Ziegelorange', F: 'Ziegelrot', G: 'Rot-Blau', H: 'Bordeaux',
    I: 'Blau', J: 'Blau-Grün', K: 'Türkis', L: 'Grün-Blau',
    M: 'Olivegrün', N: 'Sandgelb', O: 'Gelb-Grün', P: 'Honiggelb',
    Q: 'Goldgelb', R: 'Rehbraun', S: 'Moccabraun', T: 'Schwarzton',
  };
  return names[col] ?? col;
}
