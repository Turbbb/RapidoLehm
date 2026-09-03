import type {
  Product,
  Grain,
  Additive,
  Technique,
  LightingPreset,
  ColorSwatch,
  ColorColumn,
  PigmentRecipe,
} from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'lehmedelputz',
    name: 'Lehmedelputz',
    shortName: 'Edelputz',
    description: 'Naturweißer Feinputz für hochwertige Oberflächen — cellulosefrei, Sorptionsklasse 5.',
    multiplier: 1.0,
    refWeightKg: 25,
    yieldPerBag: 60,
  },
  {
    id: 'lehmstreichputz_rustikal',
    name: 'Lehmstreichputz rustikal',
    shortName: 'Streichputz rustikal',
    description: 'Robuster Streichputz mit matter Oberfläche, sichtbare Kornstruktur.',
    multiplier: 1.5,
    refWeightKg: 25,
    yieldPerBag: 60,
  },
  {
    id: 'lehmstreichputz_extrafein',
    name: 'Lehmstreichputz extrafein',
    shortName: 'Streichputz extrafein',
    description: 'Sehr feiner Streichputz für glatte Oberflächen, Wand und Decke.',
    multiplier: 4.0,
    refWeightKg: 15,
    yieldPerBag: 100,
  },
  {
    id: 'lehmstreichputz_fein',
    name: 'Lehmstreichputz fein',
    shortName: 'Streichputz fein',
    description: 'Feiner Streichputz, universell einsetzbar.',
    multiplier: 5.5,
    refWeightKg: 20,
    yieldPerBag: 100,
  },
  {
    id: 'lehmfarbe_glaette',
    name: 'Lehmfarbe & Lehmglätte',
    shortName: 'Lehmfarbe/Glätte',
    description: 'Feinste Glätte und Lehmfarbe für elegante Designoberflächen.',
    multiplier: 6.0,
    refWeightKg: 15,
    yieldPerBag: 80,
  },
];

export const GRAINS: Grain[] = [
  {
    id: 'extrafein',
    name: 'Extrafein',
    label: 'Extrafein (0–0,3 mm)',
    description: 'Sehr glatte, feine Oberfläche',
    hasGrainTexture: false,
  },
  {
    id: 'fein',
    name: 'Fein',
    label: 'Fein (Universal)',
    description: 'Universeller Allround-Putz',
    hasGrainTexture: false,
  },
  {
    id: 'rustikal',
    name: 'Rustikal',
    label: 'Rustikal (0–0,5 mm)',
    description: 'Sichtbare Kornstruktur',
    hasGrainTexture: true,
  },
];

export const ADDITIVES: Additive[] = [
  {
    id: 'strohhaecksel',
    name: 'Strohhäcksel',
    description: 'Subtile Strohfaser-Struktur',
    textureClass: 'straw-overlay',
  },
  {
    id: 'glimmer',
    name: 'Glimmer',
    description: 'Dezent schimmernder Effekt',
    textureClass: 'mica-overlay',
  },
];

export const TECHNIQUES: Technique[] = [
  {
    id: 'gerollt',
    name: 'Gerollt (Malerwalze)',
    description: 'Walzenstruktur — gleichmäßige, leicht geriffelte Oberfläche',
  },
  {
    id: 'gestrichen',
    name: 'Gestrichen (Quast)',
    description: 'Quaststrich — weiche, organische Streichspuren',
  },
  {
    id: 'gespachtelt',
    name: 'Gespachtelt (Glättkelle)',
    description: 'Kellenspachtel — glatt, mit dezenten Kanten',
  },
];

export const LIGHTING_PRESETS: LightingPreset[] = [
  {
    id: 'morgensonne',
    name: 'Morgensonne',
    description: 'Kühles, sanftes Morgenlicht',
    filter: 'brightness(1.05) saturate(1.1) hue-rotate(-5deg)',
  },
  {
    id: 'mittagsonne',
    name: 'Mittagssonne',
    description: 'Helles, neutrales Tageslicht',
    filter: 'brightness(1.1) saturate(1.0)',
  },
  {
    id: 'abendsonne',
    name: 'Abendsonne',
    description: 'Warme, goldene Abendstimmung',
    filter: 'brightness(0.95) saturate(1.2) sepia(0.15) hue-rotate(-10deg)',
  },
  {
    id: 'abendbeleuchtung',
    name: 'Abendbeleuchtung',
    description: 'Warme Raumbeleuchtung (~2700K)',
    filter: 'brightness(0.8) saturate(1.1) sepia(0.25) hue-rotate(-15deg)',
  },
];

// --- 180-swatch color database (20 columns × 9 rows) ---
// Columns A–T, Rows 1–9.
// Row anchor data: exact gram values per column per row.
// Rows 1–6 are whole numbers from the official RapidoLehm Farbfächer PDF.
// Rows 7–9 include fractional corrections as specified.

// Helper to create a recipe
function r(weiss = 0, gelb = 0, orange = 0, rot = 0, blau = 0, gruen = 0, rehbraun = 0, moccabraun = 0, schwarz = 0): PigmentRecipe {
  return { weiss, gelb, orange, rot, blau, gruen, rehbraun, moccabraun, schwarz };
}

// Row anchor table: 9 rows × 20 columns
// Each entry is the exact PigmentRecipe (in grams) for that swatch.
const ROW_ANCHORS: Record<ColorColumn, PigmentRecipe[]> = {
  NW: [
    r(0, 0), r(0, 0), r(0, 0), r(0, 0), r(0, 0), r(0, 0), r(0, 0), r(0, 0), r(0, 0),
  ],
  A: [
    r(250, 250), r(163, 162), r(83, 83), r(55, 55), r(28, 27), r(18, 18), r(9, 9), r(6, 6), r(3, 3),
  ],
  B: [
    r(0, 100), r(0, 78), r(0, 61), r(0, 47), r(0, 37), r(0, 29), r(0, 23), r(0, 18), r(0, 14),
  ],
  C: [
    r(0, 90, 10), r(0, 70, 8), r(0, 55, 6), r(0, 42, 5), r(0, 33, 4), r(0, 26, 3), r(0, 20, 2), r(0, 16, 1.5), r(0, 8, 1),
  ],
  D: [
    r(0, 75, 25), r(0, 59, 19), r(0, 46, 15), r(0, 35, 12), r(0, 28, 9), r(0, 22, 7), r(0, 13.5, 4.5), r(0, 11, 3.5), r(0, 4.5, 1.5),
  ],
  E: [
    r(0, 0, 100), r(0, 0, 78), r(0, 0, 61), r(0, 0, 47), r(0, 0, 37), r(0, 0, 29), r(0, 0, 23), r(0, 0, 18), r(0, 0, 14),
  ],
  F: [
    r(0, 0, 0, 100), r(0, 0, 0, 78), r(0, 0, 0, 61), r(0, 0, 0, 47), r(0, 0, 0, 37), r(0, 0, 0, 29), r(0, 0, 0, 23), r(0, 0, 0, 18), r(0, 0, 0, 14),
  ],
  G: [
    r(0, 0, 0, 90, 10), r(0, 0, 0, 70, 8), r(0, 0, 0, 55, 6), r(0, 0, 0, 42, 5), r(0, 0, 0, 33, 4), r(0, 0, 0, 26, 3), r(0, 0, 0, 20, 2), r(0, 0, 0, 16, 1.5), r(0, 0, 0, 8, 1),
  ],
  H: [
    r(0, 0, 0, 75, 25), r(0, 0, 0, 59, 19), r(0, 0, 0, 46, 15), r(0, 0, 0, 35, 12), r(0, 0, 0, 28, 9), r(0, 0, 0, 22, 7), r(0, 0, 0, 17, 5.5), r(0, 0, 0, 13.5, 4.5), r(0, 0, 0, 10.5, 3.5),
  ],
  I: [
    r(0, 0, 0, 0, 100), r(0, 0, 0, 0, 78), r(0, 0, 0, 0, 61), r(0, 0, 0, 0, 47), r(0, 0, 0, 0, 37), r(0, 0, 0, 0, 29), r(0, 0, 0, 4.5, 13.5), r(0, 0, 0, 3.5, 10.5), r(0, 0, 0, 1.5, 4.5),
  ],
  J: [
    r(0, 0, 0, 0, 75, 25), r(0, 0, 0, 0, 59, 19), r(0, 0, 0, 0, 46, 15), r(0, 0, 0, 0, 35, 12), r(0, 0, 0, 0, 28, 9), r(0, 0, 0, 0, 22, 7), r(0, 0, 0, 0, 17, 5.5), r(0, 0, 0, 0, 13.5, 4.5), r(0, 0, 0, 0, 10.5, 3.5),
  ],
  K: [
    r(0, 0, 0, 0, 50, 50), r(0, 0, 0, 0, 39, 39), r(0, 0, 0, 0, 30, 30), r(0, 0, 0, 0, 24, 24), r(0, 0, 0, 0, 18, 18), r(0, 0, 0, 0, 14, 14), r(0, 0, 0, 0, 11.5, 11.5), r(0, 0, 0, 0, 9, 9), r(0, 0, 0, 0, 7, 7),
  ],
  L: [
    r(0, 0, 0, 0, 25, 75), r(0, 0, 0, 0, 19, 59), r(0, 0, 0, 0, 15, 46), r(0, 0, 0, 0, 12, 35), r(0, 0, 0, 0, 9, 28), r(0, 0, 0, 0, 7, 22), r(0, 0, 0, 0, 5.5, 17), r(0, 0, 0, 0, 4.5, 13.5), r(0, 0, 0, 0, 3.5, 10.5),
  ],
  M: [
    r(0, 0, 0, 0, 0, 100), r(0, 0, 0, 0, 0, 78), r(0, 0, 0, 0, 0, 61), r(0, 0, 0, 0, 0, 47), r(0, 0, 0, 0, 0, 37), r(0, 0, 0, 0, 0, 29), r(0, 0, 0, 0, 0, 23), r(0, 0, 0, 0, 0, 18), r(0, 0, 0, 0, 0, 14),
  ],
  N: [
    r(0, 50, 0, 0, 0, 50), r(0, 39, 0, 0, 0, 39), r(0, 30, 0, 0, 0, 30), r(0, 24, 0, 0, 0, 24), r(0, 18, 0, 0, 0, 18), r(0, 14, 0, 0, 0, 14), r(0, 11.5, 0, 0, 0, 11.5), r(0, 9, 0, 0, 0, 9), r(0, 7, 0, 0, 0, 7),
  ],
  O: [
    r(0, 75, 0, 0, 0, 25), r(0, 59, 0, 0, 0, 19), r(0, 46, 0, 0, 0, 15), r(0, 35, 0, 0, 0, 12), r(0, 28, 0, 0, 0, 9), r(0, 22, 0, 0, 0, 7), r(0, 17, 0, 0, 0, 5.5), r(0, 13.5, 0, 0, 0, 4.5), r(0, 10.5, 0, 0, 0, 3.5),
  ],
  P: [
    r(0, 90, 0, 0, 0, 10), r(0, 70, 0, 0, 0, 8), r(0, 55, 0, 0, 0, 6), r(0, 42, 0, 0, 0, 5), r(0, 33, 0, 0, 0, 4), r(0, 26, 0, 0, 0, 3), r(0, 20, 0, 0, 0, 2.5), r(0, 8.6, 0, 0, 0, 3.4), r(0, 4.3, 0, 0, 0, 1.7),
  ],
  Q: [
    r(0, 417, 0, 0, 0, 83), r(0, 325, 0, 0, 0, 65), r(0, 254, 0, 0, 0, 51), r(0, 198, 0, 0, 0, 40), r(0, 154, 0, 0, 0, 31), r(0, 120, 0, 0, 0, 24), r(0, 94, 0, 0, 0, 19), r(0, 73, 0, 0, 0, 15), r(0, 57, 0, 0, 0, 11),
  ],
  R: [
    r(0, 0, 0, 0, 0, 0, 100), r(0, 0, 0, 0, 0, 0, 78), r(0, 0, 0, 0, 0, 0, 61), r(0, 0, 0, 0, 0, 0, 47), r(0, 0, 0, 0, 0, 0, 37), r(0, 0, 0, 0, 0, 0, 29), r(0, 0, 0, 0, 0, 0, 23), r(0, 0, 0, 0, 0, 0, 18), r(0, 0, 0, 0, 0, 0, 14),
  ],
  S: [
    r(0, 0, 0, 0, 0, 0, 0, 100), r(0, 0, 0, 0, 0, 0, 0, 78), r(0, 0, 0, 0, 0, 0, 0, 61), r(0, 0, 0, 0, 0, 0, 0, 47), r(0, 0, 0, 0, 0, 0, 0, 37), r(0, 0, 0, 0, 0, 0, 0, 29), r(0, 0, 0, 0, 0, 0, 0, 23), r(0, 0, 0, 0, 0, 0, 0, 18), r(0, 0, 0, 0, 0, 0, 0, 14),
  ],
  T: [
    r(0, 0, 0, 0, 0, 0, 0, 0, 100), r(0, 0, 0, 0, 0, 0, 0, 0, 78), r(0, 0, 0, 0, 0, 0, 0, 0, 61), r(0, 0, 0, 0, 0, 0, 0, 0, 47), r(0, 0, 0, 0, 0, 0, 0, 0, 37), r(0, 0, 0, 0, 0, 0, 0, 0, 29), r(0, 0, 0, 0, 0, 0, 0, 0, 23), r(0, 0, 0, 0, 0, 0, 0, 0, 18), r(0, 0, 0, 0, 0, 0, 0, 0, 14),
  ],
};

// Base hex for each column at row 1 (full saturation)
const BASE_HEX: Record<ColorColumn, string> = {
  NW: '#F2EFE9',
  A: '#F3E2B5',
  B: '#C89B3C',
  C: '#C4892E',
  D: '#BE7320',
  E: '#B56042',
  F: '#9E3B2E',
  G: '#8B3530',
  H: '#7B3535',
  I: '#3B5E78',
  J: '#3F6B6B',
  K: '#4A7050',
  L: '#4F6B3D',
  M: '#5A7530',
  N: '#7A7F4A',
  O: '#9D8B3D',
  P: '#B89B3C',
  Q: '#C5A420',
  R: '#8A6B4A',
  S: '#6B4E30',
  T: '#2B2B2B',
};

const WHITE_HEX = '#E8E4D8';

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

// Compute total pigment weight for a recipe
function totalPigmentWeight(recipe: PigmentRecipe): number {
  return (recipe.weiss + recipe.gelb + recipe.orange + recipe.rot +
    recipe.blau + recipe.gruen + recipe.rehbraun + recipe.moccabraun + recipe.schwarz);
}

// Compute hex by interpolating from the column's BASE_HEX (row 1) toward white
// based on the pigment weight ratio: row 1 = full color, row 9 = lightest
// Exact hex overrides for Column A (from official PDF)
const COLUMN_A_HEX: string[] = [
  '#F3E2B5', '#F5E7C5', '#F8EDD6', '#FAF2E3', '#FCF7ED', '#FDF9F2', '#FEFCF8', '#FEFEFA', '#FFFFFF',
];

function recipeToHex(col: ColorColumn, recipe: PigmentRecipe): string {
  // Naturweiß: always the same base color
  if (col === 'NW') return BASE_HEX.NW;

  // Column A: use exact hex values from official PDF
  if (col === 'A') {
    const rowIdx = ROW_ANCHORS.A.indexOf(recipe);
    if (rowIdx >= 0 && rowIdx < COLUMN_A_HEX.length) return COLUMN_A_HEX[rowIdx];
  }

  const baseHex = BASE_HEX[col];
  const [baseR, baseG, baseB] = hexToRgb(baseHex);
  const [whiteR, whiteG, whiteB] = hexToRgb(WHITE_HEX);

  const weight = totalPigmentWeight(recipe);
  const row1Weight = totalPigmentWeight(ROW_ANCHORS[col][0]);

  if (row1Weight === 0 || weight === 0) return WHITE_HEX;

  // Saturation = ratio of this row's pigment to row 1's pigment
  // Row 1 = 1.0 (full color), row 9 ~0.14 (mostly white)
  const saturation = Math.min(1, weight / row1Weight);

  const r = whiteR + (baseR - whiteR) * saturation;
  const g = whiteG + (baseG - whiteG) * saturation;
  const b = whiteB + (baseB - whiteB) * saturation;

  return rgbToHex(r, g, b);
}

const COLUMNS: ColorColumn[] = ['NW','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];

function buildColorDatabase(): ColorSwatch[] {
  const swatches: ColorSwatch[] = [];
  for (const col of COLUMNS) {
    for (let row = 1; row <= 9; row++) {
      const recipe = ROW_ANCHORS[col][row - 1];
      const hex = recipeToHex(col, recipe);
      swatches.push({ column: col, row, hex, recipe });
    }
  }
  return swatches;
}

export const COLOR_DATABASE: ColorSwatch[] = buildColorDatabase();

// Piecewise-linear row interpolation
export function interpolateRow(rowValues: PigmentRecipe[], row: number): PigmentRecipe {
  const lower = Math.floor(row);
  const upper = Math.ceil(row);
  if (lower === upper) return rowValues[lower - 1];
  const fraction = row - lower;
  const result: PigmentRecipe = { weiss: 0, gelb: 0, orange: 0, rot: 0, blau: 0, gruen: 0, rehbraun: 0, moccabraun: 0, schwarz: 0 };
  const a = rowValues[lower - 1];
  const b = rowValues[upper - 1];
  for (const key of Object.keys(result) as (keyof PigmentRecipe)[]) {
    result[key] = a[key] + (b[key] - a[key]) * fraction;
  }
  return result;
}

// Get the row anchors for a column (used by colorEngine for interpolation)
export function getColumnAnchors(col: ColorColumn): PigmentRecipe[] {
  return ROW_ANCHORS[col];
}

export const DEFAULT_ROOM_IMAGE = '/open-living-space.webp';

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getGrain(id: string): Grain | undefined {
  return GRAINS.find((g) => g.id === id);
}

export function getAdditive(id: string): Additive | undefined {
  return ADDITIVES.find((a) => a.id === id);
}

export function getTechnique(id: string): Technique | undefined {
  return TECHNIQUES.find((t) => t.id === id);
}

export function getLighting(id: string): LightingPreset | undefined {
  return LIGHTING_PRESETS.find((l) => l.id === id);
}

export function getSwatch(column: ColorColumn, row: number): ColorSwatch | undefined {
  return COLOR_DATABASE.find((s) => s.column === column && s.row === row);
}

export function getSwatchByHex(hex: string): ColorSwatch | undefined {
  return COLOR_DATABASE.find((s) => s.hex.toLowerCase() === hex.toLowerCase());
}

// --- Pigment pricing & packaging ---

export interface PigmentPricing {
  pricePer100g: number;
  pricePer500g: number;
  pricePer1000g: number;
}

export const PIGMENT_PRICES: Record<keyof PigmentRecipe, PigmentPricing> = {
  weiss:      { pricePer100g: 4.25, pricePer500g: 21.25, pricePer1000g: 42.50 },
  gelb:       { pricePer100g: 4.25, pricePer500g: 21.25, pricePer1000g: 42.50 },
  orange:     { pricePer100g: 4.25, pricePer500g: 21.25, pricePer1000g: 42.50 },
  rot:        { pricePer100g: 4.25, pricePer500g: 21.25, pricePer1000g: 42.50 },
  blau:       { pricePer100g: 8.29, pricePer500g: 41.45, pricePer1000g: 82.90 },
  gruen:      { pricePer100g: 8.29, pricePer500g: 41.45, pricePer1000g: 82.90 },
  rehbraun:   { pricePer100g: 4.26, pricePer500g: 21.30, pricePer1000g: 42.60 },
  moccabraun: { pricePer100g: 4.25, pricePer500g: 21.25, pricePer1000g: 42.50 },
  schwarz:    { pricePer100g: 4.25, pricePer500g: 21.25, pricePer1000g: 42.50 },
};

export interface GebindeResult {
  packages: { size: number; count: number }[];
  totalPrice: number;
}

export function calculateGebinde(totalGrams: number, pricing: PigmentPricing): GebindeResult {
  const sizes = [1000, 500, 100];
  let remaining = Math.ceil(totalGrams);
  const packages: { size: number; count: number }[] = [];
  let totalPrice = 0;

  for (const size of sizes) {
    const count = Math.floor(remaining / size);
    if (count > 0) {
      packages.push({ size, count });
      remaining -= count * size;
      if (size === 1000) totalPrice += count * pricing.pricePer1000g;
      else if (size === 500) totalPrice += count * pricing.pricePer500g;
      else totalPrice += count * pricing.pricePer100g;
    }
  }

  if (remaining > 0) {
    const existing100 = packages.find((p) => p.size === 100);
    if (existing100) existing100.count += 1;
    else packages.push({ size: 100, count: 1 });
    totalPrice += pricing.pricePer100g;
  }

  return { packages, totalPrice };
}
