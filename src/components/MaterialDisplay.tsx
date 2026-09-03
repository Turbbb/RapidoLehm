import type { WallState } from '@/types';
import { calculatePigments, calculateArea, formatGerman } from '@/calculator';
import { getProduct, getGrain } from '@/data';
import { Package, Droplet, Layers } from 'lucide-react';

interface MaterialDisplayProps {
  state: WallState;
}

export default function MaterialDisplay({ state }: MaterialDisplayProps) {
  const product = getProduct(state.product);
  const grain = getGrain(state.grain);
  const pigments = calculatePigments(state);

  const computedArea = calculateArea(state.height, state.width);
  const displayArea = state.area > 0 ? state.area : computedArea;
  const bagsNeeded = displayArea > 0 ? Math.ceil(displayArea / (product?.yieldPerBag ?? 60)) : 0;

  if (displayArea <= 0) {
    return (
      <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-center">
        <p className="text-xs text-stone-400">Bitte Wandfläche eingeben für Materialberechnung</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-rapid-700">
          Materialbedarf
        </span>
        <span className="text-xs text-stone-400">
          für {formatGerman(displayArea, 2)} m²
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {/* Product / bags */}
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 flex-shrink-0 text-rapid-600" />
          <div className="flex-1">
            <span className="text-xs font-semibold text-stone-700">
              {bagsNeeded}× {product?.shortName ?? 'Produkt'}
            </span>
            <span className="ml-1.5 text-[11px] text-stone-500">
              {product?.refWeightKg ?? 0} kg/Sack · {grain?.label ?? ''}
            </span>
          </div>
        </div>

        {/* Pigments per bag */}
        {pigments && pigments.components.length > 0 && (
          <div className="flex items-start gap-2">
            <Droplet className="mt-0.5 h-4 w-4 flex-shrink-0 text-rapid-600" />
            <div className="flex-1">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {pigments.components.map((comp) => (
                  <span key={comp.key} className="text-[11px] text-stone-600">
                    <span className="font-medium">{comp.name}</span>{' '}
                    {formatGerman(comp.perBag)} g/Sack
                    <span className="text-stone-400"> ({formatGerman(comp.total)} g ges.)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Additives */}
        {state.additives.length > 0 && (
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 flex-shrink-0 text-rapid-600" />
            <div className="flex-1">
              <span className="text-xs font-semibold text-stone-700">
                {bagsNeeded}× Packung {state.additives.map((a) => a === 'strohhaecksel' ? 'Strohhäcksel' : 'Glimmer').join(', ')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
