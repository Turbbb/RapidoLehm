export type ProductId =
  | 'lehmedelputz'
  | 'lehmstreichputz_rustikal'
  | 'lehmstreichputz_extrafein'
  | 'lehmstreichputz_fein'
  | 'lehmfarbe_glaette';

export type GrainId = 'extrafein' | 'fein' | 'rustikal';

export type AdditiveId = 'strohhaecksel' | 'glimmer';

export type TechniqueId = 'gerollt' | 'gestrichen' | 'gespachtelt';

export type LightingId = 'morgensonne' | 'mittagsonne' | 'abendsonne' | 'abendbeleuchtung';

export type ColorColumn = 'NW' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T';

export interface Product {
  id: ProductId;
  name: string;
  shortName: string;
  description: string;
  multiplier: number;
  refWeightKg: number;
  yieldPerBag: number;
}

export interface Grain {
  id: GrainId;
  name: string;
  label: string;
  description: string;
  hasGrainTexture: boolean;
}

export interface Additive {
  id: AdditiveId;
  name: string;
  description: string;
  textureClass: string;
}

export interface Technique {
  id: TechniqueId;
  name: string;
  description: string;
}

export interface LightingPreset {
  id: LightingId;
  name: string;
  description: string;
  filter: string;
}

export interface ColorSwatch {
  column: ColorColumn;
  row: number;
  hex: string;
  recipe: PigmentRecipe;
}

export interface PigmentRecipe {
  weiss: number;
  gelb: number;
  orange: number;
  rot: number;
  blau: number;
  gruen: number;
  rehbraun: number;
  moccabraun: number;
  schwarz: number;
}

export interface CartItem {
  label: string;
  quantity: number;
  unit: string;
  detail: string;
}

export interface WallState {
  product: ProductId;
  grain: GrainId;
  color: ColorColumn;
  colorRow: number;
  customHex: string | null;
  additives: AdditiveId[];
  technique: TechniqueId;
  lighting: LightingId;
  rohbau: boolean;
  area: number;
  height: number;
  width: number;
}

export interface Favorite {
  id: string;
  name: string;
  color_label: string;
  color_hex: string;
  recipe: PigmentRecipe;
  grain: string;
  technique: string;
  additives: string[];
  lighting: string;
  image_data: string | null;
  created_at: string;
}

export interface Room {
  id: string;
  title: string;
  area: number;
  product: ProductId;
  grain: GrainId;
  color: ColorColumn;
  color_row: number;
  custom_hex: string | null;
  additives: AdditiveId[];
  technique: TechniqueId;
  lighting: LightingId;
  image_data: string | null;
  created_at: string;
  updated_at: string;
}

export type AIActionType = 'idle' | 'inpaint' | 'texture-grain' | 'texture-technique' | 'texture-additive' | 'lighting' | 'suggest-name';
