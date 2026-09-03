import type { GrainId } from '@/types';
import { GRAINS } from '@/data';

interface GrainToggleProps {
  selected: GrainId;
  onSelect: (id: GrainId) => void;
}

export default function GrainToggle({ selected, onSelect }: GrainToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-stone-700">
        Korngröße / Struktur
      </h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        {GRAINS.map((grain) => {
          const isActive = grain.id === selected;
          return (
            <button
              key={grain.id}
              onClick={() => onSelect(grain.id)}
              className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                isActive
                  ? 'border-rapid-600 bg-rapid-50'
                  : 'border-stone-200 bg-white hover:border-rapid-300'
              }`}
            >
              <div className={`text-sm font-medium ${isActive ? 'text-rapid-700' : 'text-stone-700'}`}>
                {grain.label}
              </div>
              <div className="text-xs text-stone-500">{grain.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
