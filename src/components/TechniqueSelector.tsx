import type { TechniqueId } from '@/types';
import { TECHNIQUES } from '@/data';
import { PaintRoller, Brush, Square } from 'lucide-react';

interface TechniqueSelectorProps {
  selected: TechniqueId;
  onSelect: (id: TechniqueId) => void;
}

const ICONS: Record<TechniqueId, typeof PaintRoller> = {
  gerollt: PaintRoller,
  gestrichen: Brush,
  gespachtelt: Square,
};

export default function TechniqueSelector({ selected, onSelect }: TechniqueSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-stone-700">Verarbeitungstechnik</h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        {TECHNIQUES.map((tech) => {
          const isActive = tech.id === selected;
          const Icon = ICONS[tech.id];
          return (
            <button
              key={tech.id}
              onClick={() => onSelect(tech.id)}
              className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                isActive
                  ? 'border-rapid-600 bg-rapid-50'
                  : 'border-stone-200 bg-white hover:border-rapid-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${isActive ? 'text-rapid-700' : 'text-stone-500'}`} />
                <div className={`text-sm font-medium ${isActive ? 'text-rapid-700' : 'text-stone-700'}`}>
                  {tech.name}
                </div>
              </div>
              <div className="mt-1 text-xs text-stone-500">{tech.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
