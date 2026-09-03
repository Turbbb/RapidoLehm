import { Package, Droplet, Layers, CheckCircle2, Ruler } from 'lucide-react';
import type { CartItem, WallState } from '@/types';
import { calculateMaterials, calculatePigments, calculateArea, formatGerman } from '@/calculator';
import { getProduct, getGrain } from '@/data';

interface CalculatorPanelProps {
  state: WallState;
  onAreaChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onWidthChange: (value: number) => void;
  onAddToCart: () => void;
  cartItems: CartItem[];
}

export default function CalculatorPanel({
  state,
  onAreaChange,
  onHeightChange,
  onWidthChange,
  onAddToCart,
  cartItems,
}: CalculatorPanelProps) {
  const product = getProduct(state.product);
  const grain = getGrain(state.grain);
  const items = calculateMaterials(state);
  const pigments = calculatePigments(state);

  const computedArea = calculateArea(state.height, state.width);
  const displayArea = state.area > 0 ? state.area : computedArea;
  const bagsNeeded = Math.ceil(displayArea / (product?.yieldPerBag ?? 60));

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-stone-800">Materialberechnung</h3>
        <span className="rounded-full bg-rapid-100 px-2.5 py-0.5 text-xs font-semibold text-rapid-700">
          Live
        </span>
      </div>

      {/* Height × Width inputs */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
          <Ruler className="h-3.5 w-3.5" />
          Wandmaße (Höhe × Breite)
        </label>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="99"
              step="0.01"
              value={state.height || ''}
              onChange={(e) => onHeightChange(parseFloat(e.target.value) || 0)}
              placeholder="2.50"
              className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-center text-sm font-semibold text-stone-700 focus:border-rapid-600 focus:outline-none focus:ring-2 focus:ring-rapid-200"
            />
            <span className="text-xs text-stone-400">m</span>
          </div>
          <span className="text-stone-400">×</span>
          <div className="flex flex-1 items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="999"
              step="0.01"
              value={state.width || ''}
              onChange={(e) => onWidthChange(parseFloat(e.target.value) || 0)}
              placeholder="10.00"
              className="w-full rounded-lg border border-stone-300 px-2.5 py-1.5 text-center text-sm font-semibold text-stone-700 focus:border-rapid-600 focus:outline-none focus:ring-2 focus:ring-rapid-200"
            />
            <span className="text-xs text-stone-400">m</span>
          </div>
        </div>
      </div>

      {/* Manual area override */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-stone-500">
          Fläche manuell überschreiben (m²)
        </label>
        <div className="flex items-center gap-2.5">
          <input
            type="range"
            min="0"
            max="200"
            value={state.area}
            onChange={(e) => onAreaChange(parseInt(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-rapid-600"
          />
          <input
            type="number"
            min="0"
            max="999"
            value={state.area || ''}
            onChange={(e) => onAreaChange(parseFloat(e.target.value) || 0)}
            placeholder={computedArea.toFixed(2)}
            className="w-20 rounded-lg border border-stone-300 px-2.5 py-1.5 text-center text-sm font-semibold text-stone-700 focus:border-rapid-600 focus:outline-none focus:ring-2 focus:ring-rapid-200"
          />
          <span className="text-sm font-medium text-stone-500">m²</span>
        </div>
      </div>

      {/* Area display */}
      <div className="rounded-xl bg-rapid-50 px-4 py-2.5">
        <div className="text-xs font-medium uppercase tracking-wide text-rapid-600">
          Zu bearbeitende Fläche
        </div>
        <div className="text-2xl font-bold text-rapid-800">
          {formatGerman(displayArea, 2)} m²
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-stone-50 px-2 py-2 text-center">
          <div className="text-lg font-bold text-rapid-700">{bagsNeeded}</div>
          <div className="text-xs text-stone-500">Säcke</div>
        </div>
        <div className="rounded-lg bg-stone-50 px-2 py-2 text-center">
          <div className="text-lg font-bold text-rapid-700">
            {pigments && pigments.totalGrams > 0.01 ? formatGerman(pigments.totalGrams, 0) : '—'}
          </div>
          <div className="text-xs text-stone-500">Pigment (g)</div>
        </div>
        <div className="rounded-lg bg-stone-50 px-2 py-2 text-center">
          <div className="text-lg font-bold text-rapid-700">
            {state.additives.length > 0 ? state.additives.length : '—'}
          </div>
          <div className="text-xs text-stone-500">Zuschläge</div>
        </div>
      </div>

      {/* Pigment breakdown */}
      {pigments && pigments.components.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Pigment-Aufschlüsselung (0,01 g genau)
          </h4>
          <div className="rounded-xl border border-stone-100 bg-stone-50 p-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {pigments.components.map((comp) => (
                <div key={comp.key} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-stone-600">{comp.name}</span>
                  <span className="font-mono text-stone-700">
                    {formatGerman(comp.perBag)} g/Sack
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 border-t border-stone-200 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">Gesamtbedarf</span>
                <span className="font-mono font-bold text-rapid-700">
                  {formatGerman(pigments.totalGrams)} g
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Material list */}
      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          Materialliste
        </h4>
        {items.length === 0 ? (
          <p className="text-sm text-stone-400">Maße eingeben für Berechnung.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {items.map((item, idx) => {
              const icon =
                idx === 0 ? (
                  <Package className="h-4 w-4 text-rapid-600" />
                ) : item.unit === 'g' ? (
                  <Droplet className="h-4 w-4 text-rapid-600" />
                ) : (
                  <Layers className="h-4 w-4 text-rapid-600" />
                );
              return (
                <div
                  key={idx}
                  className="animate-slide-in flex items-start gap-2.5 rounded-lg border border-stone-100 bg-stone-50 p-2.5"
                >
                  <div className="mt-0.5 flex-shrink-0">{icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-stone-700">
                      {item.label}
                    </div>
                    <div className="text-xs text-stone-500">{item.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={onAddToCart}
        className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-rapid-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-rapid-700 hover:shadow-lg active:scale-[0.98] sm:text-base"
      >
        <CheckCircle2 className="h-5 w-5" />
        In den Warenkorb
      </button>

      {cartItems.length > 0 && (
        <div className="animate-fade-in-up rounded-xl border-2 border-rapid-200 bg-rapid-50 p-3">
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rapid-700">
            Im Warenkorb ({cartItems.length} Positionen)
          </div>
          <div className="flex flex-col gap-0.5">
            {cartItems.map((item, idx) => (
              <div key={idx} className="text-xs text-stone-600">
                {item.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
