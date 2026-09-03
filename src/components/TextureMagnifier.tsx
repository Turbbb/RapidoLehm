import { useRef, useState, useCallback, type MouseEvent } from 'react';
import { ZoomIn } from 'lucide-react';

interface TextureMagnifierProps {
  imageSrc: string;
  hex: string;
  grainLabel: string;
  additives: string[];
  technique: string;
}

type ZoomLevel = 0 | 1.5 | 3 | 5;

const ZOOM_LABELS: Record<Exclude<ZoomLevel, 0>, string> = {
  1.5: '1.5× Übersicht',
  3: '3.0× Körnungs-Details',
  5: '5.0× Makro-Haptik',
};

export default function TextureMagnifier({
  imageSrc,
  hex,
  grainLabel,
  additives,
  technique,
}: TextureMagnifierProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<ZoomLevel>(0);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50 });
  const [mouseIn, setMouseIn] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLensPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);

  const lensSize = 140;
  const zoomFactor = zoom || 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-700">Struktur-Lupe</h3>
        <div className="flex gap-1">
          {([0, 1.5, 3, 5] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                zoom === z
                  ? 'bg-rapid-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-rapid-100'
              }`}
            >
              {z === 0 ? 'Aus' : ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setMouseIn(true)}
        onMouseLeave={() => setMouseIn(false)}
        className="relative aspect-[16/10] w-full cursor-crosshair overflow-hidden rounded-xl bg-stone-200 shadow-lg select-none"
      >
        <img
          src={imageSrc}
          alt="Wandtextur"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* Texture overlay based on grain/additives/technique */}
        <div className="pointer-events-none absolute inset-0 grain-overlay" />
        {additives.includes('Strohhäcksel') && (
          <div className="pointer-events-none absolute inset-0 straw-overlay" />
        )}
        {additives.includes('Glimmer') && (
          <div className="pointer-events-none absolute inset-0 mica-overlay" />
        )}

        {/* Color tint overlay */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-multiply"
          style={{ backgroundColor: hex, opacity: 0.25 }}
        />

        {/* Magnifier lens */}
        {zoom > 0 && mouseIn && (
          <div
            className="pointer-events-none absolute z-20 overflow-hidden rounded-full border-2 border-white shadow-2xl"
            style={{
              width: `${lensSize}px`,
              height: `${lensSize}px`,
              left: `calc(${lensPos.x}% - ${lensSize / 2}px)`,
              top: `calc(${lensPos.y}% - ${lensSize / 2}px)`,
            }}
          >
            <div
              className="absolute"
              style={{
                width: `${100 * zoomFactor}%`,
                height: `${100 * zoomFactor}%`,
                left: `${-lensPos.x * zoomFactor + 50}%`,
                top: `${-lensPos.y * zoomFactor + 50}%`,
              }}
            >
              <img
                src={imageSrc}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 grain-overlay" />
              {additives.includes('Strohhäcksel') && (
                <div className="absolute inset-0 straw-overlay" />
              )}
              {additives.includes('Glimmer') && (
                <div className="absolute inset-0 mica-overlay" />
              )}
              <div
                className="absolute inset-0 mix-blend-multiply"
                style={{ backgroundColor: hex, opacity: 0.25 }}
              />
            </div>
          </div>
        )}

        {/* Lens info label */}
        {zoom > 0 && mouseIn && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs text-white backdrop-blur-sm">
            <ZoomIn className="mr-1 inline h-3 w-3" />
            {ZOOM_LABELS[zoom as 1.5 | 3 | 5]} — {grainLabel} — {technique}
          </div>
        )}

        {zoom === 0 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-4 py-1.5 text-xs text-white backdrop-blur-sm">
            Struktur-Lupe aktivieren für Detailansicht
          </div>
        )}
      </div>
    </div>
  );
}
