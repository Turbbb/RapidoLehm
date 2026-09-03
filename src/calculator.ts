import type { CartItem, WallState, PigmentRecipe } from './types';
import { getProduct, getGrain, getSwatch } from './data';
import { interpolateColor } from './colorEngine';

export function calculateArea(height: number, width: number): number {
  return Math.round(height * width * 100) / 100;
}

export function formatGerman(value: number, decimals = 2): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// Format pigment grams: 0 decimals if >2000g, 2 decimals if <=2000g
export function formatGrams(value: number): string {
  if (value > 2000) return formatGerman(Math.round(value), 0);
  return formatGerman(value, 2);
}

export interface PigmentBreakdown {
  totalGrams: number;
  perBag: PigmentRecipe;
  total: PigmentRecipe;
  components: { name: string; perBag: number; total: number; key: keyof PigmentRecipe }[];
}

const PIGMENT_NAMES: { key: keyof PigmentRecipe; name: string }[] = [
  { key: 'weiss', name: 'Weiß' },
  { key: 'gelb', name: 'Gelb' },
  { key: 'orange', name: 'Orange' },
  { key: 'rot', name: 'Rot' },
  { key: 'blau', name: 'Blau' },
  { key: 'gruen', name: 'Grün' },
  { key: 'rehbraun', name: 'Rehbraun' },
  { key: 'moccabraun', name: 'Moccabraun' },
  { key: 'schwarz', name: 'Schwarz' },
];

// Simplified pigment math:
// Bags_Needed = Math.ceil(Area / Coverage_Per_Bag)
// Pigment_Per_Bag_g = Base_Recipe_g * Product_Multiplier
// Total_Pigment_g = Pigment_Per_Bag_g * Bags_Needed
export function calculatePigments(state: WallState): PigmentBreakdown | null {
  const product = getProduct(state.product);
  const grain = getGrain(state.grain);
  if (!product || !grain) return null;

  const area = state.area > 0 ? state.area : calculateArea(state.height, state.width);
  const bagsNeeded = Math.ceil(area / product.yieldPerBag);

  let recipe: PigmentRecipe;
  if (state.customHex) {
    const result = interpolateColor(state.customHex);
    recipe = result.recipe;
  } else {
    const swatch = getSwatch(state.color, state.colorRow);
    if (!swatch) return null;
    recipe = swatch.recipe;
  }

  const perBag: PigmentRecipe = { weiss: 0, gelb: 0, orange: 0, rot: 0, blau: 0, gruen: 0, rehbraun: 0, moccabraun: 0, schwarz: 0 };
  const total: PigmentRecipe = { weiss: 0, gelb: 0, orange: 0, rot: 0, blau: 0, gruen: 0, rehbraun: 0, moccabraun: 0, schwarz: 0 };

  for (const { key } of PIGMENT_NAMES) {
    perBag[key] = Math.round(recipe[key] * product.multiplier * 100) / 100;
    total[key] = Math.round(perBag[key] * bagsNeeded * 100) / 100;
  }

  const totalGrams = Math.round(
    PIGMENT_NAMES.reduce((sum, { key }) => sum + total[key], 0) * 100
  ) / 100;

  // Iterate ALL keys in recipe — every component appears as separate line item
  const components = PIGMENT_NAMES.map(({ key, name }) => ({
    name,
    key,
    perBag: perBag[key],
    total: total[key],
  })).filter((c) => c.perBag > 0.01);

  return { totalGrams, perBag, total, components };
}

export function calculateMaterials(state: WallState): CartItem[] {
  const product = getProduct(state.product);
  if (!product) return [];

  const area = state.area > 0 ? state.area : calculateArea(state.height, state.width);
  const bagsNeeded = Math.ceil(area / product.yieldPerBag);

  const grain = getGrain(state.grain);
  const grainLabel = grain?.label ?? '';

  const items: CartItem[] = [];

  items.push({
    label: `${bagsNeeded}× Sack ${product.shortName} (${product.refWeightKg} kg)`,
    quantity: bagsNeeded,
    unit: 'Sack',
    detail: `${product.name}, Korngröße ${grainLabel}`,
  });

  const pigments = calculatePigments(state);
  if (pigments && pigments.totalGrams > 0.01) {
    for (const comp of pigments.components) {
      items.push({
        label: `${formatGrams(comp.total)} g Pigment ${comp.name}`,
        quantity: comp.total,
        unit: 'g',
        detail: `${formatGrams(comp.perBag)} g je Sack × ${bagsNeeded} Sack`,
      });
    }
  }

  for (const additiveId of state.additives) {
    const additive = additiveId === 'strohhaecksel' ? 'Strohhäcksel' : 'Glimmer';
    items.push({
      label: `${bagsNeeded}× Packung ${additive}`,
      quantity: bagsNeeded,
      unit: 'Packung',
      detail: additive,
    });
  }

  return items;
}

// Multi-room aggregation: group by (ProductLine, SwatchCode), sum area, ceil bags ONCE per group
export interface AggregatedGroup {
  key: string;
  productLabel: string;
  swatchCode: string;
  totalArea: number;
  bagsNeeded: number;
  coveragePerBag: number;
  refWeightKg: number;
  multiplier: number;
  recipe: PigmentRecipe | null;
  components: { name: string; perBag: number; total: number; key: keyof PigmentRecipe }[];
  totalPigmentGrams: number;
  additives: { id: string; name: string; quantity: number }[];
  rooms: { title: string; area: number }[];
}

export function aggregateRooms(rooms: Room[]): AggregatedGroup[] {
  const groups = new Map<string, AggregatedGroup>();

  for (const room of rooms) {
    if (room.area <= 0) continue;
    const product = getProduct(room.product);
    if (!product) continue;

    const swatchCode = room.custom_hex ? 'Custom' : `${room.color}${room.color_row}`;
    const groupKey = `${room.product}-${swatchCode}`;

    let group = groups.get(groupKey);
    if (!group) {
      // Get recipe for this swatch
      let recipe: PigmentRecipe | null = null;
      if (room.custom_hex) {
        const result = interpolateColor(room.custom_hex);
        recipe = result.recipe;
      } else {
        const swatch = getSwatch(room.color, room.color_row);
        recipe = swatch?.recipe ?? null;
      }

      // Compute per-bag pigment
      const perBag: PigmentRecipe = { weiss: 0, gelb: 0, orange: 0, rot: 0, blau: 0, gruen: 0, rehbraun: 0, moccabraun: 0, schwarz: 0 };
      if (recipe) {
        for (const { key } of PIGMENT_NAMES) {
          perBag[key] = Math.round(recipe[key] * product.multiplier * 100) / 100;
        }
      }

      group = {
        key: groupKey,
        productLabel: `${product.shortName} (${product.refWeightKg} kg)`,
        swatchCode,
        totalArea: 0,
        bagsNeeded: 0,
        coveragePerBag: product.yieldPerBag,
        refWeightKg: product.refWeightKg,
        multiplier: product.multiplier,
        recipe,
        components: [],
        totalPigmentGrams: 0,
        additives: [],
        rooms: [],
      };
      groups.set(groupKey, group);
    }

    // Sum area first
    group.totalArea += room.area;
    group.rooms.push({ title: room.title, area: room.area });

    // Add additives
    for (const additiveId of room.additives) {
      const additiveName = additiveId === 'strohhaecksel' ? 'Strohhäcksel' : 'Glimmer';
      const existing = group.additives.find((a) => a.id === additiveId);
      if (existing) {
        existing.quantity += Math.ceil(room.area / product.yieldPerBag);
      } else {
        group.additives.push({ id: additiveId, name: additiveName, quantity: Math.ceil(room.area / product.yieldPerBag) });
      }
    }
  }

  // Calculate bags ONCE per group after summing all areas
  for (const group of groups.values()) {
    group.bagsNeeded = Math.ceil(group.totalArea / group.coveragePerBag);

    // Derive total pigment amounts using grouped bags
    if (group.recipe) {
      const total: PigmentRecipe = { weiss: 0, gelb: 0, orange: 0, rot: 0, blau: 0, gruen: 0, rehbraun: 0, moccabraun: 0, schwarz: 0 };
      for (const { key } of PIGMENT_NAMES) {
        const perBagVal = Math.round(group.recipe[key] * group.multiplier * 100) / 100;
        total[key] = Math.round(perBagVal * group.bagsNeeded * 100) / 100;
      }

      group.components = PIGMENT_NAMES.map(({ key, name }) => ({
        name,
        key,
        perBag: Math.round(group.recipe![key] * group.multiplier * 100) / 100,
        total: total[key],
      })).filter((c) => c.perBag > 0.01);

      group.totalPigmentGrams = Math.round(
        PIGMENT_NAMES.reduce((sum, { key }) => sum + total[key], 0) * 100
      ) / 100;
    }
  }

  return Array.from(groups.values());
}

// Type import for Room
import type { Room } from './types';
