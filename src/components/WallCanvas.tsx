import { useRef, useState, useCallback, useEffect, type MouseEvent } from 'react';
import { Upload, Eye, RotateCcw, Maximize2, X, AlertCircle, EyeOff, ZoomIn, Camera, Heart, Plus, Loader2, ChevronDown } from 'lucide-react';
import type { WallState, AIActionType, PigmentRecipe, ProductId } from '@/types';
import { getGrain, getAdditive, getSwatch, getTechnique, getProduct, PRODUCTS } from '@/data';
import MaterialDisplay from '@/components/MaterialDisplay';

interface WallCanvasProps {
  state: WallState;
  onUpload: (url: string) => void;
  onReset: () => void;
  uploadedImage: string | null;
  defaultImage: string;
  generatedImage: string | null;
  onGeneratedImageChange: (image: string | null) => void;
  onAIActionChange: (action: AIActionType) => void;
  onSaveFavorite: () => void;
  onAddColorToCart: () => void;
  isFavorite: boolean;
  roomTitle: string;
  onRoomTitleChange: (title: string) => void;
  onProductChange: (product: ProductId) => void;
  onAreaChange: (area: number) => void;
}

interface ClickPoint {
  x: number;
  y: number;
}

type AIStatus = 'idle' | 'loading' | 'success' | 'error';
type ZoomLevel = 0 | 1.5 | 3 | 5;

const ZOOM_LABELS: Record<Exclude<ZoomLevel, 0>, string> = {
  1.5: '1.5× Übersicht',
  3: '3.0× Körnungs-Details',
  5: '5.0× Makro-Haptik',
};

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

function formatRecipe(recipe: PigmentRecipe | undefined): string {
  if (!recipe) return '';
  const parts = PIGMENT_NAMES
    .filter(({ key }) => recipe[key] > 0.01)
    .map(({ key, name }) => `${name} ${recipe[key]}%`);
  return parts.join(' · ');
}

async function resolveImageInput(sourceImage: string): Promise<{ imageData?: string; imageUrl?: string }> {
  if (sourceImage.startsWith('data:')) return { imageData: sourceImage };
  if (sourceImage.startsWith('/')) {
    const response = await fetch(new URL(sourceImage, window.location.origin));
    if (!response.ok) throw new Error('Bild konnte nicht geladen werden');
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden'));
      reader.readAsDataURL(blob);
    });
    return { imageData: dataUrl };
  }
  return { imageUrl: sourceImage };
}

function getStatusMessage(action: AIActionType, state: WallState): string {
  switch (action) {
    case 'inpaint':
      return 'Farbe wird aufgetragen...';
    case 'texture-grain':
      return 'Struktur wird angepasst...';
    case 'texture-technique': {
      const t = state.technique;
      if (t === 'gestrichen') return 'Es wird gestrichen...';
      if (t === 'gespachtelt') return 'Es wird gespachtelt...';
      return 'Es wird gerollt...';
    }
    case 'texture-additive':
      return 'Effekte werden umgesetzt...';
    case 'lighting': {
      const l = state.lighting;
      if (l === 'morgensonne') return 'Es wird Morgen...';
      if (l === 'mittagsonne') return 'Es wird Mittag...';
      if (l === 'abendsonne') return 'Es wird Abend...';
      return 'Lampen werden eingeschaltet...';
    }
    default:
      return '';
  }
}

export default function WallCanvas({
  state,
  onUpload,
  onReset,
  uploadedImage,
  defaultImage,
  generatedImage,
  onGeneratedImageChange,
  onAIActionChange,
  onSaveFavorite,
  onAddColorToCart,
  isFavorite,
  roomTitle,
  onRoomTitleChange,
  onProductChange,
  onAreaChange,
}: WallCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [clickPoint, setClickPoint] = useState<ClickPoint | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoverPos, setHoverPos] = useState<ClickPoint | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentAction, setCurrentAction] = useState<AIActionType>('idle');

  // Magnifier state
  const [zoom, setZoom] = useState<ZoomLevel>(0);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50 });
  const [mouseIn, setMouseIn] = useState(false);
  const rafRef = useRef<number | null>(null);
  const [showZoomPicker, setShowZoomPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const selectedProduct = getProduct(state.product);

  const swatch = getSwatch(state.color, state.colorRow);
  const colorHex = state.customHex ?? swatch?.hex ?? '#E8E4D8';
  const colorName = swatch ? `${state.color}${state.colorRow}` : 'Custom';
  const grain = getGrain(state.grain);
  const technique = getTechnique(state.technique);
  const recipe = swatch?.recipe;

  const baseImage = uploadedImage ?? defaultImage;
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co'}/functions/v1/wall-inpaint`;
  const displayImage = (showOriginal && originalImage) ? originalImage : (generatedImage ?? baseImage);

  const additiveNames = state.additives
    .map((id) => getAdditive(id)?.name)
    .filter(Boolean) as string[];

  // Notify parent of AI status
  useEffect(() => {
    if (aiStatus === 'loading') {
      onAIActionChange(currentAction);
    } else {
      onAIActionChange('idle');
    }
  }, [aiStatus, currentAction, onAIActionChange]);

  const getRelativePos = useCallback((e: MouseEvent<HTMLDivElement>, target: 'normal' | 'fullscreen') => {
    const el = target === 'fullscreen' ? fullscreenRef.current : containerRef.current;
    const rect = el?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * 100),
      y: Math.round(((e.clientY - rect.top) / rect.height) * 100),
    };
  }, []);

  const callGemini = useCallback(async (payload: Record<string, unknown>, action: AIActionType) => {
    setAiStatus('loading');
    setAiError(null);
    setCurrentAction(action);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const sourceImage = generatedImage ?? baseImage;
      const requestBody: Record<string, unknown> = {
        ...payload,
        ...(await resolveImageInput(sourceImage)),
      };

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errBody = await response.text();
        let msg = `Serverfehler (${response.status})`;
        try {
          const parsed = JSON.parse(errBody);
          if (parsed.error) msg = parsed.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.image) {
        if (!originalImage) setOriginalImage(baseImage);
        onGeneratedImageChange(data.image);
        setAiStatus('success');
        setTimeout(() => setAiStatus('idle'), 1500);
      } else {
        throw new Error('Kein Bild erhalten');
      }
    } catch (err) {
      let message: string;
      if (err instanceof DOMException && err.name === 'AbortError') {
        message = 'Zeitüberschreitung — bitte erneut versuchen';
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        message = `Netzwerkfehler — ${err.message}`;
      } else {
        message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      }
      setAiError(message);
      setAiStatus('error');
      setTimeout(() => setAiStatus('idle'), 5000);
    }
  }, [generatedImage, baseImage, originalImage, onGeneratedImageChange, functionUrl]);

  const handleClick = useCallback(async (e: MouseEvent<HTMLDivElement>, target: 'normal' | 'fullscreen') => {
    if (aiStatus === 'loading' || zoom > 0) return;
    const pos = getRelativePos(e, target);
    setClickPoint(pos);

    await callGemini({
      mode: 'inpaint',
      colorName,
      colorHex,
      grainName: grain?.name ?? 'Extrafein',
      grainDescription: grain?.description ?? 'Glatte Oberfläche',
      additives: additiveNames,
      clickX: pos.x,
      clickY: pos.y,
    }, 'inpaint');
  }, [aiStatus, zoom, getRelativePos, callGemini, colorName, colorHex, grain, additiveNames]);

  // Trigger AI texture change when technique changes
  const prevTechniqueRef = useRef(state.technique);
  useEffect(() => {
    if (prevTechniqueRef.current === state.technique || aiStatus === 'loading') return;
    prevTechniqueRef.current = state.technique;

    callGemini({
      mode: 'texture',
      techniqueName: technique?.name ?? 'Gerollt',
      techniqueDescription: technique?.description ?? '',
      grainName: grain?.name ?? 'Extrafein',
      grainDescription: grain?.description ?? 'Glatte Oberfläche',
      additives: additiveNames,
    }, 'texture-technique');
  }, [state.technique]);

  // Trigger AI texture change when grain changes
  const prevGrainRef = useRef(state.grain);
  useEffect(() => {
    if (prevGrainRef.current === state.grain || aiStatus === 'loading') return;
    prevGrainRef.current = state.grain;

    callGemini({
      mode: 'texture',
      techniqueName: technique?.name ?? 'Gerollt',
      techniqueDescription: technique?.description ?? '',
      grainName: grain?.name ?? 'Extrafein',
      grainDescription: grain?.description ?? 'Glatte Oberfläche',
      additives: additiveNames,
    }, 'texture-grain');
  }, [state.grain]);

  // Trigger AI texture change when additives change
  const prevAdditivesRef = useRef(state.additives.join(','));
  useEffect(() => {
    const currentAdd = state.additives.join(',');
    if (prevAdditivesRef.current === currentAdd || aiStatus === 'loading') return;
    prevAdditivesRef.current = currentAdd;

    callGemini({
      mode: 'texture',
      techniqueName: technique?.name ?? 'Gerollt',
      techniqueDescription: technique?.description ?? '',
      grainName: grain?.name ?? 'Extrafein',
      grainDescription: grain?.description ?? 'Glatte Oberfläche',
      additives: additiveNames,
    }, 'texture-additive');
  }, [state.additives]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>, target: 'normal' | 'fullscreen') => {
    if (aiStatus === 'loading') return;
    const pos = getRelativePos(e, target);

    if (zoom > 0) {
      const el = target === 'fullscreen' ? fullscreenRef.current : containerRef.current;
      const rect = el?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          setLensPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
        });
      }
    } else {
      setHoverPos(pos);
    }
  }, [getRelativePos, aiStatus, zoom]);

  // Downscale uploaded images to max 2048px before sending to AI
  const downscaleImage = useCallback((dataUrl: string, maxSize = 2048): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxSize && height <= maxSize) { resolve(dataUrl); return; }
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const url = ev.target?.result as string;
        if (url) {
          const downscaled = await downscaleImage(url);
          onGeneratedImageChange(null);
          setOriginalImage(null);
          setClickPoint(null);
          setAiStatus('idle');
          onUpload(downscaled);
        }
      };
      reader.readAsDataURL(file);
    },
    [onUpload, onGeneratedImageChange, downscaleImage],
  );

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target?.result as string;
      if (url) {
        const downscaled = await downscaleImage(url);
        onGeneratedImageChange(null);
        setOriginalImage(null);
        setClickPoint(null);
        setAiStatus('idle');
        onUpload(downscaled);
      }
    };
    reader.readAsDataURL(file);
  }, [onUpload, onGeneratedImageChange, downscaleImage]);

  const handleResetAI = useCallback(() => {
    onGeneratedImageChange(null);
    setOriginalImage(null);
    setClickPoint(null);
    setAiStatus('idle');
    setAiError(null);
  }, [onGeneratedImageChange]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const lensSize = 140;
  const zoomFactor = zoom || 1;
  const statusMessage = aiStatus === 'loading' ? getStatusMessage(currentAction, state) : '';

  const renderCanvas = (target: 'normal' | 'fullscreen') => {
    const ref = target === 'fullscreen' ? fullscreenRef : containerRef;
    const aspectClass = target === 'fullscreen' ? 'h-full' : 'aspect-[16/10] w-full';
    return (
      <div
        ref={ref}
        onClick={(e) => handleClick(e, target)}
        onMouseMove={(e) => handleMouseMove(e, target)}
        onMouseEnter={() => setMouseIn(true)}
        onMouseLeave={() => { setMouseIn(false); setHoverPos(null); }}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        className={`relative ${aspectClass} ${
          zoom > 0 ? 'cursor-none' : aiStatus === 'loading' ? 'cursor-wait' : 'cursor-crosshair'
        } overflow-hidden bg-stone-200 rounded-xl ${target === 'normal' ? 'shadow-lg' : ''} select-none`}
        style={zoom > 0 ? { touchAction: 'none' } : undefined}
      >
        <img
          src={displayImage}
          alt="Raumfoto"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* Color tint overlay — only after AI inpainting has been triggered by a wall click */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-multiply transition-opacity duration-300"
          style={{ backgroundColor: colorHex, opacity: generatedImage ? 0 : (clickPoint ? 0.4 : 0) }}
        />

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-rapid-600/30 backdrop-blur-sm">
            <div className="rounded-xl bg-white/90 px-6 py-4 shadow-xl">
              <p className="text-sm font-semibold text-rapid-700">Foto hier ablegen</p>
            </div>
          </div>
        )}

        {/* Hover indicator */}
        {zoom === 0 && aiStatus !== 'loading' && hoverPos && (
          <div
            className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 shadow-md transition-opacity"
            style={{ left: `${hoverPos.x}%`, top: `${hoverPos.y}%`, backgroundColor: colorHex, opacity: 0.6 }}
          />
        )}

        {/* Magnifier lens */}
        {zoom > 0 && mouseIn && (
          <div
            className="pointer-events-none absolute z-20 overflow-hidden rounded-full border-2 border-white shadow-2xl"
            style={{
              width: `${lensSize}px`, height: `${lensSize}px`,
              left: `calc(${lensPos.x}% - ${lensSize / 2}px)`,
              top: `calc(${lensPos.y}% - ${lensSize / 2}px)`,
            }}
          >
            <div
              className="absolute"
              style={{
                width: `${100 * zoomFactor}%`, height: `${100 * zoomFactor}%`,
                left: `${-lensPos.x * zoomFactor + 50}%`,
                top: `${-lensPos.y * zoomFactor + 50}%`,
              }}
            >
              <img src={displayImage} alt="" className="h-full w-full object-cover" draggable={false} />
              <div className="absolute inset-0 grain-overlay" />
              {state.additives.includes('strohhaecksel') && <div className="absolute inset-0 straw-overlay" />}
              {state.additives.includes('glimmer') && <div className="absolute inset-0 mica-overlay" />}
              <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundColor: colorHex, opacity: 0.25 }} />
            </div>
          </div>
        )}

        {/* Lens info label */}
        {zoom > 0 && mouseIn && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs text-white backdrop-blur-sm">
            <ZoomIn className="mr-1 inline h-3 w-3" />
            {ZOOM_LABELS[zoom as 1.5 | 3 | 5]} — {grain?.label ?? 'Extrafein'}
          </div>
        )}

        {/* Loading indicator at click location */}
        {clickPoint && aiStatus === 'loading' && (
          <div className="pointer-events-none absolute z-10" style={{ left: `${clickPoint.x}%`, top: `${clickPoint.y}%` }}>
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div className="ai-pulse-ring absolute inset-0 rounded-full bg-rapid-600" />
              <div className="ai-pulse-ring absolute inset-0 rounded-full bg-rapid-500" style={{ animationDelay: '0.5s' }} />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-rapid-600 shadow-xl">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Success flash */}
        {clickPoint && aiStatus === 'success' && (
          <div className="pointer-events-none absolute z-10" style={{ left: `${clickPoint.x}%`, top: `${clickPoint.y}%` }}>
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 shadow-xl">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
        )}

        {/* Error indicator */}
        {clickPoint && aiStatus === 'error' && (
          <div className="pointer-events-none absolute z-10" style={{ left: `${clickPoint.x}%`, top: `${clickPoint.y}%` }}>
            <div className="relative -translate-x-1/2 -translate-y-1/2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-xl">
                <AlertCircle className="h-7 w-7 text-white" />
              </div>
              <div className="absolute left-1/2 top-full mt-3 -translate-x-1/2 max-w-[200px] whitespace-normal rounded-lg bg-red-700 px-3 py-1.5 text-center text-xs font-medium text-white shadow-lg">
                {aiError ?? 'Fehler'}
              </div>
            </div>
          </div>
        )}

        {/* Loading shimmer */}
        {aiStatus === 'loading' && <div className="shimmer-effect pointer-events-none absolute inset-0" />}

        {/* Status message overlay */}
        {aiStatus === 'loading' && statusMessage && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-rapid-700/90 px-5 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
            {statusMessage}
          </div>
        )}

        {/* Subtle gradient */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 70%, rgba(0,0,0,0.06) 100%)' }} />

        {/* Compare button */}
        {generatedImage && aiStatus === 'idle' && (
          <button
            onMouseDown={(e) => { e.stopPropagation(); setShowOriginal(true); }}
            onMouseUp={(e) => { e.stopPropagation(); setShowOriginal(false); }}
            onMouseLeave={() => setShowOriginal(false)}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            {showOriginal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            Original vergleichen
          </button>
        )}

        {/* Fullscreen button */}
        {target === 'normal' && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/60"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Vollbild
          </button>
        )}

        {/* Zoom magnifier button */}
        {target === 'normal' && (
          <div className="absolute left-3 top-3 z-30">
            <button
              onClick={(e) => { e.stopPropagation(); setShowZoomPicker((v) => !v); }}
              onMouseDown={(e) => e.stopPropagation()}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors ${
                zoom > 0 ? 'bg-rapid-600 text-white' : 'bg-black/40 text-white hover:bg-black/60'
              }`}
            >
              <ZoomIn className="h-3.5 w-3.5" />
              {zoom > 0 ? ZOOM_LABELS[zoom as 1.5 | 3 | 5] : 'Lupe'}
            </button>
            {showZoomPicker && (
              <div className="absolute left-0 top-full mt-1.5 flex flex-col gap-1 rounded-lg bg-white p-1.5 shadow-xl">
                <button
                  onClick={(e) => { e.stopPropagation(); setZoom(0); setShowZoomPicker(false); }}
                  className="rounded-md px-3 py-1.5 text-left text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                >
                  Aus
                </button>
                {([1.5, 3, 5] as Exclude<ZoomLevel, 0>[]).map((z) => (
                  <button
                    key={z}
                    onClick={(e) => { e.stopPropagation(); setZoom(z); setShowZoomPicker(false); }}
                    className={`rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors ${
                      zoom === z ? 'bg-rapid-50 text-rapid-700' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {ZOOM_LABELS[z]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Heart/Favorite button */}
        {target === 'normal' && generatedImage && (
          <button
            onClick={(e) => { e.stopPropagation(); onSaveFavorite(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`absolute right-3 top-14 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-all ${
              isFavorite
                ? 'bg-red-500 text-white'
                : 'bg-black/40 text-white hover:bg-black/60'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? 'Gespeichert' : 'Favorit'}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Room title + area + product selector above image */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={roomTitle}
            onChange={(e) => onRoomTitleChange(e.target.value)}
            className="min-w-[120px] flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-bold text-stone-800 focus:border-rapid-600 focus:outline-none focus:ring-2 focus:ring-rapid-200"
            placeholder="Raum 1"
          />
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              max="9999"
              step="0.01"
              value={state.area || ''}
              onChange={(e) => onAreaChange(parseFloat(e.target.value) || 0)}
              placeholder="m²"
              className="w-20 rounded-lg border border-stone-300 px-2.5 py-1.5 text-center text-sm font-semibold text-stone-700 focus:border-rapid-600 focus:outline-none focus:ring-2 focus:ring-rapid-200"
            />
            <span className="text-xs font-medium text-stone-500">m²</span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowProductPicker((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              <span className="hidden sm:inline">{selectedProduct?.shortName ?? 'Produkt'}</span>
              <span className="sm:hidden">{selectedProduct?.shortName?.split(' ')[0] ?? 'Produkt'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
            </button>
            {showProductPicker && (
              <div className="absolute right-0 top-full z-40 mt-1.5 flex max-h-72 w-64 flex-col gap-1 overflow-y-auto rounded-lg bg-white p-1.5 shadow-xl">
                {PRODUCTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onProductChange(p.id); setShowProductPicker(false); }}
                    className={`rounded-md px-3 py-2 text-left transition-colors ${
                      p.id === state.product ? 'bg-rapid-50' : 'hover:bg-stone-100'
                    }`}
                  >
                    <div className={`text-sm font-semibold ${p.id === state.product ? 'text-rapid-700' : 'text-stone-700'}`}>
                      {p.name}
                    </div>
                    <div className="text-[11px] leading-tight text-stone-500">{p.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {renderCanvas('normal')}

        {/* Material display below image */}
        <MaterialDisplay state={state} />

        {/* Upload + Camera + Add Color buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-rapid-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-rapid-700 active:scale-95"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Foto hochladen</span>
            <span className="sm:hidden">Hochladen</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

          <button
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-rapid-300 bg-white px-3 py-1.5 text-sm font-medium text-rapid-700 shadow-sm transition-all hover:bg-rapid-50 active:scale-95"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Fotografieren</span>
            <span className="sm:hidden">Kamera</span>
          </button>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />

          <button
            onClick={onAddColorToCart}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition-all hover:bg-red-100 active:scale-95"
          >
            <Heart className="h-4 w-4" />
            Farbe in Favoritenliste
          </button>

          {uploadedImage && (
            <button
              onClick={() => { onReset(); handleResetAI(); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-600 transition-all hover:bg-stone-100 active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Standardfoto</span>
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-white">Raumfoto — Vollbildansicht</span>
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
              Schließen
            </button>
          </div>
          <div className="flex-1 overflow-hidden">{renderCanvas('fullscreen')}</div>
        </div>
      )}
    </>
  );
}
