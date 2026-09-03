import { useState, useCallback, useMemo } from 'react';
import { Package, Droplet, Layers, FileText, Loader2, Minus, Plus, AlertTriangle, Euro } from 'lucide-react';
import type { Room, CartItem, PigmentRecipe } from '@/types';
import { getProduct, getGrain, getSwatch, PIGMENT_PRICES, calculateGebinde, type GebindeResult } from '@/data';
import { aggregateRooms, formatGrams, formatGerman, type AggregatedGroup } from '@/calculator';

interface AggregatedMaterialsProps {
  rooms: Room[];
  onAddToCart: (items: CartItem[]) => void;
}

export default function AggregatedMaterials({ rooms, onAddToCart }: AggregatedMaterialsProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);
  const [generatedInstructions, setGeneratedInstructions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = aggregateRooms(rooms);
  const hasSmallArea = rooms.some((r) => r.area > 0 && r.area < 2);
  const totalProjectPigment = groups.reduce((sum, g) => sum + g.totalPigmentGrams, 0);

  // Calculate total pigment cost across all groups
  const totalPigmentCost = useMemo(() => {
    let sum = 0;
    for (const group of groups) {
      for (const comp of group.components) {
        const pricing = PIGMENT_PRICES[comp.key];
        const gebinde = calculateGebinde(comp.total, pricing);
        sum += gebinde.totalPrice;
      }
    }
    return sum;
  }, [groups]);

  const getQuantity = useCallback((key: string, defaultQty: number) => {
    return quantities[key] ?? defaultQty;
  }, [quantities]);

  const adjustQuantity = useCallback((key: string, defaultQty: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[key] ?? defaultQty;
      const next = Math.max(0, current + delta);
      return { ...prev, [key]: next };
    });
  }, []);

  const handleAddToCart = useCallback(() => {
    const cartItems: CartItem[] = [];
    for (const group of groups) {
      const bagQty = getQuantity(`${group.key}-bags`, group.bagsNeeded);
      cartItems.push({
        label: `${bagQty}× Sack ${group.productLabel}`,
        quantity: bagQty,
        unit: 'Sack',
        detail: `${group.swatchCode} · ${group.rooms.map((r) => `${r.title}: ${formatGerman(r.area, 0)} m²`).join(', ')}`,
      });
      for (const comp of group.components) {
        const pigQty = getQuantity(`${group.key}-pig-${comp.key}`, comp.total);
        cartItems.push({
          label: `${formatGrams(pigQty)} g Pigment ${comp.name}`,
          quantity: pigQty,
          unit: 'g',
          detail: `${formatGrams(comp.perBag)} g/Sack × ${bagQty} Sack`,
        });
      }
      for (const additive of group.additives) {
        const addQty = getQuantity(`${group.key}-add-${additive.id}`, additive.quantity);
        cartItems.push({
          label: `${addQty}× Packung ${additive.name}`,
          quantity: addQty,
          unit: 'Packung',
          detail: additive.name,
        });
      }
    }
    onAddToCart(cartItems);
  }, [groups, quantities, onAddToCart]);

  const handleGenerateInstructions = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setGeneratedInstructions(null);

    const roomsData = rooms.map((r) => {
      const product = getProduct(r.product);
      const grain = getGrain(r.grain);
      const swatch = getSwatch(r.color, r.color_row);
      const recipe = swatch?.recipe;
      return {
        title: r.title,
        area: r.area,
        product: product?.name ?? r.product,
        grain: grain?.name ?? r.grain,
        color_label: r.custom_hex ? 'Custom' : `${r.color}${r.color_row}`,
        color: r.custom_hex ?? swatch?.hex ?? '#E8E4D8',
        recipe,
        technique: r.technique,
        additives: r.additives,
      };
    });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co'}/functions/v1/wall-inpaint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ mode: 'generate-instructions', roomsData }),
        }
      );
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else if (data.instructions) {
        setGeneratedInstructions(data.instructions);
      }
    } catch {
      setError('Netzwerkfehler beim Erstellen der Farbanleitung');
    } finally {
      setGenerating(false);
    }
  }, [rooms]);

  const handleDownloadPDF = useCallback(() => {
    if (!generatedInstructions) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Farbanleitung — RapidoLehm</title>
<style>
body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;color:#333;line-height:1.6}
h1{color:#5B7553;border-bottom:2px solid #5B7553;padding-bottom:10px}
pre{white-space:pre-wrap;font-family:Georgia,serif;font-size:14px}
</style></head><body>
<h1>Farbanleitung für Ihr Projekt</h1>
<pre>${generatedInstructions.replace(/</g, '&lt;')}</pre>
<p style="margin-top:40px;font-size:12px;color:#999">Erstellt von RapidoLehm Farbrechner — ${new Date().toLocaleDateString('de-DE')}</p>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.onload = () => { setTimeout(() => w.print(), 500); };
    }
  }, [generatedInstructions]);

  if (rooms.length === 0 || groups.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h3 className="text-base font-bold text-stone-800">Materialliste</h3>
        <p className="mt-2 text-sm text-stone-400">Speichern Sie Räume, um den aggregierten Materialbedarf zu sehen.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-stone-800">Materialliste</h3>
        <span className="rounded-full bg-rapid-100 px-2.5 py-0.5 text-xs font-semibold text-rapid-700">
          {rooms.length} {rooms.length === 1 ? 'Raum' : 'Räume'}
        </span>
      </div>

      {/* Grouped items */}
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <GroupCard
            key={group.key}
            group={group}
            getQuantity={getQuantity}
            adjustQuantity={adjustQuantity}
          />
        ))}
      </div>

      {/* Small area warning */}
      {hasSmallArea && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-xs text-amber-700">
            Für kleine Flächen empfehlen wir Musterdosen statt eines vollen Sacks.
          </p>
        </div>
      )}

      {/* Total pigment cost */}
      {totalPigmentCost > 0 && (
        <div className="flex items-center justify-between rounded-xl border-2 border-rapid-200 bg-rapid-50 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-rapid-700">
            <Euro className="h-4 w-4" />
            Pigmentkosten gesamt
          </span>
          <span className="text-lg font-bold text-rapid-800">
            {totalPigmentCost.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </span>
        </div>
      )}

      {/* Add to cart */}
      <button
        onClick={handleAddToCart}
        className="flex items-center justify-center gap-2 rounded-xl bg-rapid-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-rapid-700 active:scale-[0.98]"
      >
        In den Warenkorb
      </button>

      {/* Generate instructions */}
      <div className="mt-2 border-t border-stone-200 pt-3">
        <button
          onClick={handleGenerateInstructions}
          disabled={generating}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-rapid-300 bg-rapid-50 px-4 py-2.5 text-sm font-semibold text-rapid-700 transition-all hover:bg-rapid-100 active:scale-[0.98] disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Farbanleitung für Dein Projekt erstellen
        </button>

        {error && (
          <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        {generatedInstructions && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="max-h-64 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-3">
              <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-stone-700">
                {generatedInstructions}
              </pre>
            </div>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-2 rounded-lg bg-stone-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
            >
              <FileText className="h-4 w-4" />
              Als PDF herunterladen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupCard({
  group,
  getQuantity,
  adjustQuantity,
}: {
  group: AggregatedGroup;
  getQuantity: (key: string, defaultQty: number) => number;
  adjustQuantity: (key: string, defaultQty: number, delta: number) => void;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      {/* Group header */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-stone-700">{group.swatchCode}</span>
        <span className="text-xs text-stone-500">
          {formatGerman(group.totalArea, 2)} m² ges.
        </span>
      </div>

      {/* Bags */}
      <div className="flex items-start gap-2.5 rounded-lg border border-stone-100 bg-white p-2.5">
        <Package className="mt-0.5 h-4 w-4 flex-shrink-0 text-rapid-600" />
        <div className="flex-1">
          <div className="text-sm font-medium text-stone-700">
            {group.bagsNeeded}× {group.productLabel}
          </div>
          <div className="text-xs text-stone-500">
            {group.rooms.map((r) => `${r.title}: ${formatGerman(r.area, 0)} m²`).join(' · ')}
          </div>
        </div>
        <QtyAdjustor
          itemKey={`${group.key}-bags`}
          defaultQty={group.bagsNeeded}
          getQuantity={getQuantity}
          adjustQuantity={adjustQuantity}
        />
      </div>

      {/* Pigment components — ALL keys iterated with gebinde + pricing */}
      {group.components.map((comp) => {
        const pigQty = getQuantity(`${group.key}-pig-${comp.key}`, comp.total);
        const pricing = PIGMENT_PRICES[comp.key];
        const gebinde = calculateGebinde(pigQty, pricing);
        const gebindeLabel = gebinde.packages.map((p) => `${p.count}× ${p.size}g`).join(' + ');
        return (
          <div key={comp.key} className="mt-1.5 flex items-start gap-2.5 rounded-lg border border-stone-100 bg-white p-2.5">
            <Droplet className="mt-0.5 h-4 w-4 flex-shrink-0 text-rapid-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-stone-700">
                {formatGrams(comp.total)} g Pigment {comp.name}
              </div>
              <div className="text-xs text-stone-500">
                {formatGrams(comp.perBag)} g/Sack × {group.bagsNeeded} Sack
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
                  {gebindeLabel || '—'}
                </span>
                <span className="text-xs font-semibold text-rapid-700">
                  {gebinde.totalPrice.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                </span>
              </div>
            </div>
            <QtyAdjustor
              itemKey={`${group.key}-pig-${comp.key}`}
              defaultQty={comp.total}
              getQuantity={getQuantity}
              adjustQuantity={adjustQuantity}
              isGrams
            />
          </div>
        );
      })}

      {/* Additives */}
      {group.additives.map((additive) => {
        const addQty = getQuantity(`${group.key}-add-${additive.id}`, additive.quantity);
        return (
          <div key={additive.id} className="mt-1.5 flex items-start gap-2.5 rounded-lg border border-stone-100 bg-white p-2.5">
            <Layers className="mt-0.5 h-4 w-4 flex-shrink-0 text-rapid-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-stone-700">
                {additive.quantity}× Packung {additive.name}
              </div>
            </div>
            <QtyAdjustor
              itemKey={`${group.key}-add-${additive.id}`}
              defaultQty={additive.quantity}
              getQuantity={getQuantity}
              adjustQuantity={adjustQuantity}
            />
          </div>
        );
      })}
    </div>
  );
}

function QtyAdjustor({
  itemKey,
  defaultQty,
  getQuantity,
  adjustQuantity,
  isGrams,
}: {
  itemKey: string;
  defaultQty: number;
  getQuantity: (key: string, defaultQty: number) => number;
  adjustQuantity: (key: string, defaultQty: number, delta: number) => void;
  isGrams?: boolean;
}) {
  const qty = getQuantity(itemKey, defaultQty);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => adjustQuantity(itemKey, defaultQty, -1)}
        className="rounded-md bg-stone-200 p-1 text-stone-600 transition-colors hover:bg-stone-300"
      >
        <Minus className="h-3 w-3" />
      </button>
      <span className="w-12 text-center text-sm font-semibold text-stone-700">
        {isGrams ? formatGrams(qty) : qty}
      </span>
      <button
        onClick={() => adjustQuantity(itemKey, defaultQty, 1)}
        className="rounded-md bg-stone-200 p-1 text-stone-600 transition-colors hover:bg-stone-300"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
