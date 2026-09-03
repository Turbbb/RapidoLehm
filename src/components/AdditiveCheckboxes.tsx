import type { AdditiveId } from '@/types';
import { ADDITIVES } from '@/data';

interface AdditiveCheckboxesProps {
  selected: AdditiveId[];
  onToggle: (id: AdditiveId) => void;
}

export default function AdditiveCheckboxes({
  selected,
  onToggle,
}: AdditiveCheckboxesProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-stone-700">
        Effekt-Zuschläge
      </h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        {ADDITIVES.map((additive) => {
          const isChecked = selected.includes(additive.id);
          return (
            <button
              key={additive.id}
              onClick={() => onToggle(additive.id)}
              className={`flex flex-1 items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all active:scale-[0.98] ${
                isChecked
                  ? 'border-rapid-600 bg-rapid-50'
                  : 'border-stone-200 bg-white hover:border-rapid-300'
              }`}
            >
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                  isChecked
                    ? 'border-rapid-600 bg-rapid-600'
                    : 'border-stone-300 bg-white'
                }`}
              >
                {isChecked && (
                  <svg
                    className="h-3 w-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <div className={`text-sm font-medium ${isChecked ? 'text-rapid-700' : 'text-stone-700'}`}>
                  {additive.name}
                </div>
                <div className="text-xs text-stone-500">{additive.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
