import { useState, useRef, useCallback, useMemo, useEffect, type MouseEvent } from 'react';
import { Palette, X, Pipette, Info, Heart } from 'lucide-react';
import type { ColorColumn, WallState, Favorite } from '@/types';
import { COLOR_DATABASE, getSwatch } from '@/data';
import { getColumnName, interpolateColor } from '@/colorEngine';

interface ColorFanProps {
  state: WallState;
  onSelect: (column: ColorColumn, row: number) => void;
  onCustomHex: (hex: string) => void;
  favorites: Favorite[];
  onDeleteFavorite: (id: string) => void;
  onUpdateFavoriteName: (id: string, name: string) => void;
  onAddColorToCart: (fav: Favorite) => void;
}

const COLUMNS: ColorColumn[] = ['NW','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];

export default function ColorFan({ state, onSelect, onCustomHex, favorites, onDeleteFavorite, onUpdateFavoriteName, onAddColorToCart }: ColorFanProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [editFavId, setEditFavId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [pickerHex, setPickerHex] = useState(state.customHex ?? '#C89B3C');
  const [adjusted, setAdjusted] = useState(false);
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const [wheelHue, setWheelHue] = useState(45);
  const [wheelSat, setWheelSat] = useState(0.6);

  const selectedSwatch = getSwatch(state.color, state.colorRow);
  const selectedHex = state.customHex ?? selectedSwatch?.hex ?? '#E8E4D8';

  const drawWheel = useCallback(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;

    for (let a = 0; a < 360; a += 1) {
      const startAngle = ((a - 0.5) * Math.PI) / 180;
      const endAngle = ((a + 1.5) * Math.PI) / 180;
      for (let r = 0; r < radius; r += 2) {
        const sat = r / radius;
        const l = 0.55;
        const c = (1 - Math.abs(2 * l - 1)) * sat;
        const x = c * (1 - Math.abs(((a / 60) % 2) - 1));
        const m = l - c / 2;
        let rr = 0, gg = 0, bb = 0;
        if (a < 60) { rr = c; gg = x; bb = 0; }
        else if (a < 120) { rr = x; gg = c; bb = 0; }
        else if (a < 180) { rr = 0; gg = c; bb = x; }
        else if (a < 240) { rr = 0; gg = x; bb = c; }
        else if (a < 300) { rr = x; gg = 0; bb = c; }
        else { rr = c; gg = 0; bb = x; }
        const to255 = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255)));
        ctx.fillStyle = `rgb(${to255(rr)},${to255(gg)},${to255(bb)})`;
        ctx.beginPath();
        ctx.arc(cx, cy, radius - r, startAngle, endAngle);
        ctx.arc(cx, cy, radius - r - 2, endAngle, startAngle, true);
        ctx.fill();
      }
    }
  }, []);

  useEffect(() => {
    if (showPicker) drawWheel();
  }, [showPicker, drawWheel]);

  const handleWheelPick = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(cx, cy);
    const sat = Math.min(1, dist / radius);
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;
    setWheelHue(angle);
    setWheelSat(sat);

    const h = angle;
    const s = sat;
    const l = 0.55;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const toHex = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255))).toString(16).padStart(2, '0');
    const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    setPickerHex(hex);

    const result = interpolateColor(hex);
    setAdjusted(result.adjusted);
    onCustomHex(result.adjusted ? result.hex : hex);
  }, [onCustomHex]);

  const handleHexInput = useCallback((hex: string) => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    setPickerHex(hex);
    const result = interpolateColor(hex);
    setAdjusted(result.adjusted);
    onCustomHex(result.adjusted ? result.hex : hex);
  }, [onCustomHex]);

  const wheelMarkerPos = useMemo(() => {
    const angle = (wheelHue * Math.PI) / 180;
    const r = wheelSat * 130;
    return {
      x: 150 + Math.cos(angle) * r - 8,
      y: 150 + Math.sin(angle) * r - 8,
    };
  }, [wheelHue, wheelSat]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-700">Farbfächer</h3>
        <div className="flex gap-1.5">
          <button
            onClick={() => { setShowPopup(true); setShowPicker(false); setShowFavorites(false); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              showPopup ? 'bg-rapid-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-rapid-100'
            }`}
          >
            <Palette className="h-3.5 w-3.5" />
            Fächer
          </button>
          <button
            onClick={() => { setShowPicker(true); setShowPopup(false); setShowFavorites(false); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              showPicker ? 'bg-rapid-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-rapid-100'
            }`}
          >
            <Pipette className="h-3.5 w-3.5" />
            Freie Wahl
          </button>
          <button
            onClick={() => { setShowFavorites(true); setShowPopup(false); setShowPicker(false); }}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              showFavorites ? 'bg-red-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${favorites.length > 0 ? 'fill-current' : ''}`} />
            {favorites.length > 0 ? favorites.length : ''}
          </button>
        </div>
      </div>

      {/* Selected color preview */}
      <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
        <div
          className="h-12 w-12 flex-shrink-0 rounded-lg border-2 border-stone-300 shadow-sm"
          style={{ backgroundColor: selectedHex }}
        />
        <div className="flex-1">
          <div className="text-sm font-semibold text-stone-700">
            {state.customHex ? 'Custom-Farbton' : `${state.color}${state.colorRow}`}
          </div>
          <div className="text-xs text-stone-500">
            {getColumnName(state.color)} · {selectedHex.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Quick swatch row */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
        {COLOR_DATABASE.filter((s) => s.row === 1).map((s) => {
          const isActive = !state.customHex && s.column === state.color && s.row === state.colorRow;
          return (
            <button
              key={s.column}
              onClick={() => onSelect(s.column, s.row)}
              className="group flex-shrink-0 transition-all active:scale-95"
            >
              <div
                className={`relative h-12 w-12 rounded-lg border-2 shadow-sm transition-all sm:h-14 sm:w-14 ${
                  isActive
                    ? 'border-rapid-700 ring-2 ring-rapid-300 ring-offset-2'
                    : 'border-stone-200 group-hover:border-rapid-300'
                }`}
                style={{ backgroundColor: s.hex }}
              />
              <div className="mt-0.5 w-12 text-center text-[10px] font-medium text-stone-600 sm:w-14 sm:text-xs">
                {s.column}
              </div>
            </button>
          );
        })}
      </div>

      {/* 20×9 Grid Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-800">Farbfächer — 180 Farbtöne</h3>
              <button
                onClick={() => setShowPopup(false)}
                className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-auto">
              <div className="flex">
                {/* Row labels */}
                <div className="flex flex-col gap-1 pr-2">
                  <div className="h-8" />
                  {[1,2,3,4,5,6,7,8,9].map((row) => (
                    <div key={row} className="flex h-8 items-center justify-center text-xs font-medium text-stone-400">
                      {row}
                    </div>
                  ))}
                </div>

                {/* Grid */}
                <div className="flex gap-1">
                  {COLUMNS.map((col) => (
                    <div key={col} className="flex flex-col gap-1">
                      <div className="flex h-8 items-center justify-center text-xs font-semibold text-stone-500">
                        {col}
                      </div>
                      {[1,2,3,4,5,6,7,8,9].map((row) => {
                        const swatch = getSwatch(col, row);
                        if (!swatch) return null;
                        const isActive = !state.customHex && col === state.color && row === state.colorRow;
                        return (
                          <button
                            key={row}
                            onClick={() => { onSelect(col, row); setShowPopup(false); }}
                            className={`h-8 w-8 rounded-md border transition-all hover:scale-110 hover:z-10 hover:shadow-md ${
                              isActive
                                ? 'border-rapid-700 ring-2 ring-rapid-300'
                                : 'border-stone-200'
                            }`}
                            style={{ backgroundColor: swatch.hex }}
                            title={`${col}${row} — ${getColumnName(col)}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-stone-400">
              20 Spalten × 9 Reihen — Klick zur Auswahl. Zeile 1 = volle Sättigung, Zeile 9 = hellste Abstufung.
            </p>
          </div>
        </div>
      )}

      {/* Continuous Color Picker */}
      {showPicker && (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-700">Stufenlose Farbauswahl</h4>
            <button
              onClick={() => setShowPicker(false)}
              className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Color wheel */}
            <div className="relative flex-shrink-0" style={{ width: 300, height: 300 }}>
              <canvas
                ref={wheelRef}
                width={300}
                height={300}
                onClick={handleWheelPick}
                onMouseMove={(e) => { if (e.buttons === 1) handleWheelPick(e); }}
                className="cursor-crosshair rounded-full"
                style={{ width: 300, height: 300 }}
              />
              <div
                className="pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white shadow-lg"
                style={{
                  left: wheelMarkerPos.x,
                  top: wheelMarkerPos.y,
                  backgroundColor: pickerHex,
                }}
              />
            </div>

            {/* Hex input + preview */}
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-16 w-16 flex-shrink-0 rounded-lg border-2 border-stone-300 shadow-sm"
                  style={{ backgroundColor: pickerHex }}
                />
                <div className="flex-1">
                  <label className="text-xs font-medium text-stone-600">Hex-Code</label>
                  <input
                    type="text"
                    value={pickerHex}
                    onChange={(e) => setPickerHex(e.target.value)}
                    onBlur={(e) => handleHexInput(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-mono text-stone-700 focus:border-rapid-600 focus:outline-none focus:ring-2 focus:ring-rapid-200"
                  />
                </div>
              </div>

              {adjusted && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                  <p className="text-xs text-amber-700">
                    Hinweis: Dein Wunschfarbton wurde auf den nächstgelegenen, echt anmischbaren Lehmfarbton angepasst.
                  </p>
                </div>
              )}

              <button
                onClick={() => { handleHexInput(pickerHex); setShowPicker(false); }}
                className="rounded-lg bg-rapid-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rapid-700 active:scale-95"
              >
                Farbton übernehmen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Favorites panel */}
      {showFavorites && (
        <div className="rounded-2xl border border-red-200 bg-red-50/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-stone-700">Farbfavoriten</h4>
            <button
              onClick={() => setShowFavorites(false)}
              className="rounded-lg p-1 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {favorites.length === 0 ? (
            <p className="py-3 text-center text-xs text-stone-400">
              Noch keine Favoriten gespeichert. Wenden Sie eine Farbe an und tippen Sie auf das Herz-Symbol.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {favorites.map((fav) => (
                <div key={fav.id} className="flex items-center gap-2.5 rounded-lg border border-stone-200 bg-white p-2">
                  <div
                    className="h-8 w-8 flex-shrink-0 rounded border border-stone-300"
                    style={{ backgroundColor: fav.color_hex }}
                  />
                  <div className="flex-1">
                    {editFavId === fav.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { onUpdateFavoriteName(fav.id, editName.trim()); setEditFavId(null); }
                            if (e.key === 'Escape') setEditFavId(null);
                          }}
                          autoFocus
                          className="flex-1 rounded border border-rapid-300 px-2 py-0.5 text-xs font-medium text-stone-800 focus:border-rapid-500 focus:outline-none"
                        />
                        <button
                          onClick={() => { onUpdateFavoriteName(fav.id, editName.trim()); setEditFavId(null); }}
                          className="rounded p-1 text-green-600 hover:bg-green-50"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-stone-700">{fav.name}</span>
                        <span className="text-[10px] text-stone-400">{fav.color_label}</span>
                        <button
                          onClick={() => { setEditFavId(fav.id); setEditName(fav.name); }}
                          className="rounded p-0.5 text-stone-300 hover:bg-stone-100 hover:text-stone-500"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onAddColorToCart(fav)}
                    className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Heart className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDeleteFavorite(fav.id)}
                    className="rounded p-1 text-stone-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
