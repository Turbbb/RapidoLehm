import type { ProductId } from '@/types';
import { PRODUCTS } from '@/data';

interface ProductTabsProps {
  selected: ProductId;
  onSelect: (id: ProductId) => void;
}

export default function ProductTabs({ selected, onSelect }: ProductTabsProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-stone-700">Produktlinie</h3>
      <div className="flex flex-col gap-2 sm:flex-row">
        {PRODUCTS.map((product) => {
          const isActive = product.id === selected;
          return (
            <button
              key={product.id}
              onClick={() => onSelect(product.id)}
              className={`flex-1 rounded-xl border-2 p-3 text-left transition-all active:scale-[0.98] ${
                isActive
                  ? 'border-rapid-600 bg-rapid-50 shadow-sm'
                  : 'border-stone-200 bg-white hover:border-rapid-300 hover:bg-rapid-50/50'
              }`}
            >
              <div className={`text-sm font-semibold ${isActive ? 'text-rapid-700' : 'text-stone-700'}`}>
                {product.name}
              </div>
              <div className="mt-0.5 text-xs leading-snug text-stone-500">
                {product.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
