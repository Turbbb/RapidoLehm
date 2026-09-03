import { useState, useCallback } from 'react';
import { Sunrise, Sun, Sunset, Lightbulb } from 'lucide-react';
import type { LightingId, AIActionType } from '@/types';
import { LIGHTING_PRESETS, getLighting } from '@/data';

interface LightingPresetsProps {
  selected: LightingId;
  onSelect: (id: LightingId) => void;
  generatedImage: string | null;
  baseImage: string;
  onGeneratedImageChange: (image: string) => void;
  onAIActionChange: (action: AIActionType) => void;
}

const ICONS: Record<LightingId, typeof Sunrise> = {
  morgensonne: Sunrise,
  mittagsonne: Sun,
  abendsonne: Sunset,
  abendbeleuchtung: Lightbulb,
};

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

const STATUS_MESSAGES: Record<LightingId, string> = {
  morgensonne: 'Es wird Morgen...',
  mittagsonne: 'Es wird Mittag...',
  abendsonne: 'Es wird Abend...',
  abendbeleuchtung: 'Lampen werden eingeschaltet...',
};

export default function LightingPresets({
  selected,
  onSelect,
  generatedImage,
  baseImage,
  onGeneratedImageChange,
  onAIActionChange,
}: LightingPresetsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLighting, setCurrentLighting] = useState<LightingId | null>(null);
  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co'}/functions/v1/wall-inpaint`;

  const handleLightingSelect = useCallback(async (id: LightingId) => {
    onSelect(id);
    if (loading) return;

    setLoading(true);
    setError(null);
    setCurrentLighting(id);
    onAIActionChange('lighting');

    try {
      const sourceImage = generatedImage ?? baseImage;
      const requestBody: Record<string, unknown> = {
        mode: 'lighting',
        lightingId: id,
        lightingName: getLighting(id)?.name ?? id,
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
      });

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
        onGeneratedImageChange(data.image);
      } else {
        throw new Error('Kein Bild erhalten');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
      setCurrentLighting(null);
      onAIActionChange('idle');
    }
  }, [loading, generatedImage, baseImage, onSelect, onGeneratedImageChange, onAIActionChange, functionUrl]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-stone-700">Lichtstimmung</h3>
        {loading && currentLighting && (
          <span className="text-xs text-rapid-600">
            {STATUS_MESSAGES[currentLighting]}
          </span>
        )}
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LIGHTING_PRESETS.map((light) => {
          const isActive = light.id === selected;
          const Icon = ICONS[light.id];
          return (
            <button
              key={light.id}
              onClick={() => handleLightingSelect(light.id)}
              disabled={loading}
              className={`flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 transition-all active:scale-[0.98] ${
                isActive
                  ? 'border-rapid-600 bg-rapid-50'
                  : 'border-stone-200 bg-white hover:border-rapid-300'
              } ${loading ? 'opacity-50' : ''}`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-rapid-700' : 'text-stone-500'}`} />
              <div className={`text-xs font-medium ${isActive ? 'text-rapid-700' : 'text-stone-700'}`}>
                {light.name}
              </div>
              <div className="text-[10px] leading-tight text-stone-400">{light.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
