import { useState, useCallback, useEffect, useRef } from 'react';
import { Leaf, ShoppingCart, Heart, Save } from 'lucide-react';
import type { GrainId, ColorColumn, AdditiveId, TechniqueId, LightingId, CartItem, WallState, Favorite, Room, AIActionType, ProductId } from '@/types';
import { DEFAULT_ROOM_IMAGE, getProduct, getGrain, getAdditive, getSwatch } from '@/data';
import { supabase } from '@/supabase';
import WallCanvas from '@/components/WallCanvas';
import CollapsibleSection from '@/components/CollapsibleSection';
import GrainToggle from '@/components/GrainToggle';
import AdditiveCheckboxes from '@/components/AdditiveCheckboxes';
import ColorFan from '@/components/ColorFan';
import TechniqueSelector from '@/components/TechniqueSelector';
import LightingPresets from '@/components/LightingPresets';
import RoomList from '@/components/RoomList';
import AggregatedMaterials from '@/components/AggregatedMaterials';

function defaultWallState(): WallState {
  return {
    product: 'lehmedelputz',
    grain: 'extrafein',
    color: 'NW',
    colorRow: 1,
    customHex: null,
    additives: [],
    technique: 'gerollt',
    lighting: 'mittagsonne',
    rohbau: false,
    area: 0,
    height: 2.5,
    width: 10,
  };
}

function App() {
  const [state, setState] = useState<WallState>(defaultWallState());
  const [roomTitle, setRoomTitle] = useState('Raum 1');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCartToast, setShowCartToast] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<AIActionType>('idle');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const updateState = useCallback(<K extends keyof WallState>(key: K, value: WallState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleAdditiveToggle = useCallback((id: AdditiveId) => {
    setState((prev) => ({
      ...prev,
      additives: prev.additives.includes(id)
        ? prev.additives.filter((a) => a !== id)
        : [...prev.additives, id],
    }));
  }, []);

  const handleColorSelect = useCallback((column: ColorColumn, row: number) => {
    setState((prev) => ({ ...prev, color: column, colorRow: row, customHex: null }));
  }, []);

  const handleCustomHex = useCallback((hex: string) => {
    setState((prev) => ({ ...prev, customHex: hex }));
  }, []);

  const handleAddToCart = useCallback((items: CartItem[]) => {
    setCartItems((prev) => [...prev, ...items]);
    setShowCartToast(true);
    setTimeout(() => setShowCartToast(false), 3000);
    window.parent.postMessage({ type: 'rapidolehm_add_to_cart', items }, '*');
  }, []);

  const handleAddColorToCart = useCallback((fav?: Favorite) => {
    const colorLabel = fav?.color_label ?? (state.customHex ? 'Custom' : `${state.color}${state.colorRow}`);
    const colorHex = fav?.color_hex ?? (state.customHex ?? getSwatch(state.color, state.colorRow)?.hex ?? '#E8E4D8');
    const recipe = fav?.recipe ?? getSwatch(state.color, state.colorRow)?.recipe;
    const items: CartItem[] = [{
      label: `Farbe ${colorLabel}`,
      quantity: 1,
      unit: 'Farbe',
      detail: recipe ? Object.entries(recipe).filter(([, v]) => v > 0.01).map(([k, v]) => `${k} ${v}g`).join(', ') : colorHex,
    }];
    setCartItems((prev) => [...prev, ...items]);
    setShowCartToast(true);
    setTimeout(() => setShowCartToast(false), 3000);
  }, [state]);

  useEffect(() => {
    const loadAll = async () => {
      const [{ data: favData }, { data: roomData }] = await Promise.all([
        supabase.from('favorites').select('*').order('created_at', { ascending: false }),
        supabase.from('rooms').select('*').order('updated_at', { ascending: false }),
      ]);
      if (favData) setFavorites(favData as Favorite[]);
      if (roomData) setRooms(roomData as Room[]);
    };
    loadAll();
  }, []);

  const handleSaveFavorite = useCallback(async () => {
    const swatch = getSwatch(state.color, state.colorRow);
    const colorLabel = state.customHex ? 'Custom' : `${state.color}${state.colorRow}`;
    const colorHex = state.customHex ?? swatch?.hex ?? '#E8E4D8';
    const recipe = swatch?.recipe ?? { weiss: 0, gelb: 0, orange: 0, rot: 0, blau: 0, gruen: 0, rehbraun: 0, moccabraun: 0, schwarz: 0 };

    let name = colorLabel;
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL || 'https://0ec90b57d6e95fcbda19832f.supabase.co'}/functions/v1/wall-inpaint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ mode: 'suggest-name', colorName: colorLabel, colorHex, recipe }),
      });
      const data = await response.json();
      if (data.suggestedName) name = data.suggestedName;
    } catch { /* use default */ }

    const { data } = await supabase.from('favorites').insert({
      name, color_label: colorLabel, color_hex: colorHex, recipe,
      grain: state.grain, technique: state.technique, additives: state.additives,
      lighting: state.lighting, image_data: generatedImage,
    }).select().single();

    if (data) {
      setFavorites((prev) => [data as Favorite, ...prev]);
      setIsFavorite(true);
    }
  }, [state, generatedImage]);

  const handleDeleteFavorite = useCallback(async (id: string) => {
    const { error } = await supabase.from('favorites').delete().eq('id', id);
    if (!error) setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleUpdateFavoriteName = useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from('favorites').update({ name }).eq('id', id);
    if (!error) setFavorites((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  }, []);

  const handleSaveRoom = useCallback(async () => {
    const imageToSave = generatedImage ?? uploadedImage;
    const roomData = {
      title: roomTitle,
      area: state.area,
      product: state.product,
      grain: state.grain,
      color: state.color,
      color_row: state.colorRow,
      custom_hex: state.customHex,
      additives: state.additives,
      technique: state.technique,
      lighting: state.lighting,
      image_data: imageToSave,
      updated_at: new Date().toISOString(),
    };

    if (activeRoomId) {
      const { data, error } = await supabase.from('rooms').update(roomData).eq('id', activeRoomId).select().single();
      if (!error && data) {
        setRooms((prev) => {
          const filtered = prev.filter((r) => r.id !== activeRoomId);
          return [data as Room, ...filtered];
        });
      }
    } else {
      const { data, error } = await supabase.from('rooms').insert(roomData).select().single();
      if (!error && data) {
        const newRoom = data as Room;
        setActiveRoomId(newRoom.id);
        setRooms((prev) => [newRoom, ...prev]);
      }
    }

    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  }, [roomTitle, state, generatedImage, uploadedImage, activeRoomId]);

  const handleSelectRoom = useCallback((room: Room) => {
    setActiveRoomId(room.id);
    setRoomTitle(room.title);
    setState({
      product: room.product,
      grain: room.grain,
      color: room.color,
      colorRow: room.color_row,
      customHex: room.custom_hex,
      additives: room.additives,
      technique: room.technique,
      lighting: room.lighting,
      rohbau: false,
      area: room.area,
      height: 2.5,
      width: 10,
    });
    setGeneratedImage(null);
    setUploadedImage(room.image_data);
    setIsFavorite(false);
  }, []);

  const handleDeleteRoom = useCallback(async (id: string) => {
    const { error } = await supabase.from('rooms').delete().eq('id', id);
    if (!error) {
      setRooms((prev) => prev.filter((r) => r.id !== id));
      if (activeRoomId === id) {
        setActiveRoomId(null);
        setRoomTitle('Raum 1');
        setState(defaultWallState());
        setGeneratedImage(null);
        setUploadedImage(null);
      }
    }
  }, [activeRoomId]);

  const handleNewRoom = useCallback(() => {
    setActiveRoomId(null);
    setRoomTitle(`Raum ${rooms.length + 1}`);
    setState(defaultWallState());
    setGeneratedImage(null);
    setUploadedImage(null);
    setIsFavorite(false);
  }, [rooms.length]);

  useEffect(() => {
    const sendHeight = () => {
      const height = rootRef.current?.scrollHeight ?? document.body.scrollHeight;
      window.parent.postMessage({ type: 'rapidolehm_height', height }, '*');
    };
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    if (rootRef.current) observer.observe(rootRef.current);
    window.addEventListener('resize', sendHeight);
    return () => { observer.disconnect(); window.removeEventListener('resize', sendHeight); };
  }, []);

  const grain = getGrain(state.grain);
  const additiveNames = state.additives.map((id) => getAdditive(id)?.name).filter(Boolean) as string[];
  const techniqueName = state.technique === 'gerollt' ? 'Gerollt (Malerwalze)' : state.technique === 'gestrichen' ? 'Gestrichen (Quast)' : 'Gespachtelt (Glättkelle)';
  const baseImageForAI = uploadedImage ?? DEFAULT_ROOM_IMAGE;

  return (
    <div ref={rootRef} className="min-h-screen bg-beige-bg">
      <header className="sticky top-0 z-50 border-b border-rapid-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rapid-600 shadow-sm">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-stone-800 sm:text-base">RapidoLehm</h1>
              <p className="hidden text-xs leading-tight text-stone-500 sm:block">Interaktiver Farbrechner &amp; Wand-Visualisierer</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5">
                <Heart className="h-4 w-4 fill-current text-red-500" />
                <span className="text-sm font-semibold text-red-600">{favorites.length}</span>
              </div>
            )}
            {cartItems.length > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-rapid-100 px-3 py-1.5">
                <ShoppingCart className="h-4 w-4 text-rapid-700" />
                <span className="text-sm font-semibold text-rapid-700">{cartItems.length}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Left: Canvas + Controls */}
          <div className="flex flex-1 flex-col gap-4">
            <section className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
              <WallCanvas
                state={state}
                onUpload={setUploadedImage}
                onReset={() => setUploadedImage(null)}
                uploadedImage={uploadedImage}
                defaultImage={DEFAULT_ROOM_IMAGE}
                generatedImage={generatedImage}
                onGeneratedImageChange={setGeneratedImage}
                onAIActionChange={setCurrentAction}
                onSaveFavorite={handleSaveFavorite}
                onAddColorToCart={() => handleAddColorToCart()}
                isFavorite={isFavorite}
                roomTitle={roomTitle}
                onRoomTitleChange={setRoomTitle}
                onProductChange={(id: ProductId) => updateState('product', id)}
                onAreaChange={(v) => updateState('area', v)}
              />
            </section>

            {/* Save room button */}
            <button
              onClick={handleSaveRoom}
              className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-stone-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-stone-800 active:scale-[0.98]"
            >
              <Save className="h-4 w-4" />
              Raum speichern
            </button>

            <CollapsibleSection title="Farbfächer" badge={state.customHex ? 'Custom' : `${state.color}${state.colorRow}`} defaultOpen={true}>
              <ColorFan
                state={state}
                onSelect={handleColorSelect}
                onCustomHex={handleCustomHex}
                favorites={favorites}
                onDeleteFavorite={handleDeleteFavorite}
                onUpdateFavoriteName={handleUpdateFavoriteName}
                onAddColorToCart={handleAddColorToCart}
              />
            </CollapsibleSection>

            <CollapsibleSection title="Lichtstimmung" badge={state.lighting === 'morgensonne' ? 'Morgen' : state.lighting === 'mittagsonne' ? 'Mittag' : state.lighting === 'abendsonne' ? 'Abend' : 'Lampen'} defaultOpen={true}>
              <LightingPresets
                selected={state.lighting}
                onSelect={(id: LightingId) => updateState('lighting', id)}
                generatedImage={generatedImage}
                baseImage={baseImageForAI}
                onGeneratedImageChange={setGeneratedImage}
                onAIActionChange={setCurrentAction}
              />
            </CollapsibleSection>

            <div className="flex flex-col gap-3">
              <CollapsibleSection title="Korngröße / Struktur" badge={grain?.name}>
                <GrainToggle selected={state.grain} onSelect={(id: GrainId) => updateState('grain', id)} />
              </CollapsibleSection>
              <CollapsibleSection title="Verarbeitungstechnik" badge={techniqueName.split(' ')[0]}>
                <TechniqueSelector selected={state.technique} onSelect={(id: TechniqueId) => updateState('technique', id)} />
              </CollapsibleSection>
              <CollapsibleSection title="Effekt-Zuschläge" badge={additiveNames.length > 0 ? `${additiveNames.length} aktiv` : undefined}>
                <AdditiveCheckboxes selected={state.additives} onToggle={handleAdditiveToggle} />
              </CollapsibleSection>
            </div>
          </div>

          {/* Right: Room list + Aggregated materials */}
          <div className="flex w-full flex-col gap-4 lg:w-[340px] lg:flex-shrink-0 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
              <RoomList
                rooms={rooms}
                activeRoomId={activeRoomId}
                onSelectRoom={handleSelectRoom}
                onDeleteRoom={handleDeleteRoom}
                onNewRoom={handleNewRoom}
              />
            </div>

            <AggregatedMaterials rooms={rooms} onAddToCart={handleAddToCart} />

            {cartItems.length > 0 && (
              <div className="rounded-2xl border-2 border-rapid-200 bg-rapid-50 p-3">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-rapid-700">
                  Im Warenkorb ({cartItems.length} Positionen)
                </div>
                <div className="flex flex-col gap-0.5">
                  {cartItems.map((item, idx) => (
                    <div key={idx} className="text-xs text-stone-600">{item.label}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-10 border-t border-stone-200 pt-6 text-center">
          <p className="text-xs text-stone-400">RapidoLehm — Lausitzer Naturbaustoffe GmbH. Natürliche Lehmputze für gesundes Wohnen.</p>
        </footer>
      </main>

      {showCartToast && (
        <div className="animate-fade-in-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-rapid-700 px-6 py-3 shadow-xl">
          <p className="text-sm font-medium text-white">In den Warenkorb übernommen!</p>
        </div>
      )}
      {showSaveToast && (
        <div className="animate-fade-in-up fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-stone-700 px-6 py-3 shadow-xl">
          <p className="text-sm font-medium text-white">Raum gespeichert!</p>
        </div>
      )}
    </div>
  );
}

export default App;
