import { useState, useCallback, useEffect } from 'react';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import type { Favorite, PigmentRecipe } from '@/types';
import { getGrain, getTechnique, getAdditive } from '@/data';

interface FavoritesListProps {
  favorites: Favorite[];
  onDelete: (id: string) => void;
  onUpdateName: (id: string, name: string) => void;
  onAddColorToCart: (fav: Favorite) => void;
}

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

export default function FavoritesList({
  favorites,
  onDelete,
  onUpdateName,
  onAddColorToCart,
}: FavoritesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = useCallback((fav: Favorite) => {
    setEditingId(fav.id);
    setEditName(fav.name);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingId && editName.trim()) {
      onUpdateName(editingId, editName.trim());
    }
    setEditingId(null);
  }, [editingId, editName, onUpdateName]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <p className="text-sm text-stone-400">Noch keine Favoriten gespeichert.</p>
        <p className="text-xs text-stone-400">
          Wählen Sie eine Farbe, wenden Sie sie an und tippen Sie auf das Herz-Symbol.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {favorites.map((fav) => {
        const grain = getGrain(fav.grain);
        const technique = getTechnique(fav.technique);
        const additiveNames = (fav.additives as string[])
          .map((id) => getAdditive(id)?.name)
          .filter(Boolean) as string[];

        return (
          <div key={fav.id} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
            {/* Image thumbnail */}
            <div className="relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-stone-100">
              {fav.image_data ? (
                <img src={fav.image_data} alt={fav.name} className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ backgroundColor: fav.color_hex }}
                >
                  <span className="text-xs font-medium text-stone-600">{fav.color_label}</span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                {editingId === fav.id ? (
                  <div className="flex flex-1 items-center gap-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                      className="flex-1 rounded border border-rapid-300 px-2 py-0.5 text-sm font-medium text-stone-800 focus:border-rapid-500 focus:outline-none"
                    />
                    <button onClick={handleSaveEdit} className="rounded p-1 text-green-600 hover:bg-green-50">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={handleCancelEdit} className="rounded p-1 text-stone-400 hover:bg-stone-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-stone-800">{fav.name}</span>
                    <button onClick={() => handleStartEdit(fav)} className="rounded p-1 text-stone-400 hover:bg-stone-100">
                      <Edit2 className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>

              {/* Color + recipe */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 flex-shrink-0 rounded border border-stone-300" style={{ backgroundColor: fav.color_hex }} />
                <span className="text-xs font-medium text-stone-600">{fav.color_label}</span>
              </div>
              <p className="text-[11px] text-stone-500">{formatRecipe(fav.recipe)}</p>

              {/* Settings summary */}
              <div className="flex flex-wrap gap-1">
                {grain && (
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                    {grain.name}
                  </span>
                )}
                {technique && (
                  <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                    {technique.name.split(' ')[0]}
                  </span>
                )}
                {additiveNames.map((name) => (
                  <span key={name} className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600">
                    {name}
                  </span>
                ))}
              </div>

              {/* Actions */}
              <div className="mt-1 flex items-center gap-2">
                <button
                  onClick={() => onAddColorToCart(fav)}
                  className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                >
                  <Plus className="h-3 w-3" />
                  Farbe hinzufügen
                </button>
                <button
                  onClick={() => onDelete(fav.id)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                  Löschen
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
