import { Trash2, Plus, Home } from 'lucide-react';
import type { Room } from '@/types';
import { getProduct, getGrain } from '@/data';

interface RoomListProps {
  rooms: Room[];
  activeRoomId: string | null;
  onSelectRoom: (room: Room) => void;
  onDeleteRoom: (id: string) => void;
  onNewRoom: () => void;
}

export default function RoomList({
  rooms,
  activeRoomId,
  onSelectRoom,
  onDeleteRoom,
  onNewRoom,
}: RoomListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-800">Räume</h3>
        <button
          onClick={onNewRoom}
          className="inline-flex items-center gap-1 rounded-lg bg-rapid-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-rapid-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Neuer Raum
        </button>
      </div>

      <div className="no-scrollbar flex gap-3 overflow-x-auto pb-2">
        {rooms.length === 0 && (
          <p className="py-3 text-xs text-stone-400">
            Noch keine Räume gespeichert.
          </p>
        )}
        {rooms.map((room) => {
          const product = getProduct(room.product);
          const grain = getGrain(room.grain);
          const isActive = room.id === activeRoomId;
          return (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room)}
              className={`group relative flex-shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                isActive
                  ? 'border-rapid-500 ring-2 ring-rapid-200'
                  : 'border-stone-200 hover:border-rapid-300'
              }`}
              style={{ width: 160 }}
            >
              <div className="relative h-24 w-full overflow-hidden bg-stone-100">
                {room.image_data ? (
                  <img src={room.image_data} alt={room.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-stone-100">
                    <Home className="h-8 w-8 text-stone-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-1.5 left-2 right-2">
                  <span className="text-sm font-bold text-white drop-shadow-md">{room.title}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteRoom(room.id); }}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex flex-col gap-0.5 px-2 py-1.5">
                <span className="text-[11px] font-medium text-stone-600">
                  {product?.shortName ?? '—'} · {grain?.name ?? '—'}
                </span>
                <span className="text-[11px] text-stone-400">
                  {room.area > 0 ? `${room.area} m²` : 'Maße fehlen'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
