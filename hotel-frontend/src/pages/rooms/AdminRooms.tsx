import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getRooms } from "../../services/roomService";
import type { Room, RoomType, RoomStatus } from "../../types/room";
import { useAuth } from "../../context/AuthContext";
import { roomImageSrcSet, roomImageUrl } from "../../utils/roomImage";

const STATUS_CONFIG: Record<RoomStatus, { label: string; cls: string }> = {
  AVAILABLE: { label: "Available", cls: "bg-emerald-100 text-emerald-800" },
  RESERVED: { label: "Reserved", cls: "bg-blue-100 text-blue-800" },
  OCCUPIED: { label: "Occupied", cls: "bg-orange-100 text-orange-800" },
  CLEANING: { label: "Cleaning", cls: "bg-yellow-100 text-yellow-800" },
  MAINTENANCE: { label: "Maintenance", cls: "bg-red-100 text-red-800" },
};

const TYPE_CONFIG: Record<RoomType, string> = {
  STANDARD: "Standard",
  DELUXE: "Deluxe",
  SUITE: "Suite",
  FAMILY: "Family",
};

type FilterStatus = RoomStatus | "ALL";
type FilterType = RoomType | "ALL";

export default function AdminRooms() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<FilterType>("ALL");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [filterFloor, setFilterFloor] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let ignore = false;
    getRooms()
      .then((data) => { if (!ignore) setRooms(data); })
      .catch(() => { if (!ignore) setError("Failed to load rooms. Please try again."); })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, []);

  const floors = useMemo(() => {
    const set = new Set(rooms.map((r) => String(r.floor)));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (filterType !== "ALL" && r.roomType !== filterType) return false;
      if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
      if (filterFloor !== "ALL" && String(r.floor) !== filterFloor) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.roomNumber.toLowerCase().includes(q) ||
          r.roomType.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rooms, filterType, filterStatus, filterFloor, searchQuery]);

  const basePath = isAdmin ? "/admin" : "/manager";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Room Management</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage hotel rooms, images, and status
          </p>
        </div>
        <Link
          to={`${basePath}/rooms/new`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Room
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Room number, type…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">Room Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Types</option>
              {(["STANDARD", "DELUXE", "SUITE", "FAMILY"] as RoomType[]).map((t) => (
                <option key={t} value={t}>{TYPE_CONFIG[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              {(Object.keys(STATUS_CONFIG) as RoomStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">Floor</label>
            <select
              value={filterFloor}
              onChange={(e) => setFilterFloor(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Floors</option>
              {floors.map((f) => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <span className="ml-3 text-sm text-gray-500">Loading rooms…</span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          <p className="mt-4 text-sm font-medium text-gray-500">No rooms found</p>
          <p className="mt-1 text-xs text-gray-400">Try adjusting your filters or add a new room</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""} found</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredRooms.map((room) => {
              const status = STATUS_CONFIG[room.status] ?? { label: room.status, cls: "bg-gray-100 text-gray-700" };
              return (
                <div
                  key={room.roomId}
                  className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Room Image */}
                  <div
                    className="relative h-44 cursor-pointer overflow-hidden bg-gray-100"
                    onClick={() => navigate(`${basePath}/rooms/${room.roomId}`)}
                  >
                    {room.images?.length > 0 ? (
                      <img
                        src={roomImageUrl(room.images[0], 1080, '16:9')}
                        srcSet={roomImageSrcSet(room.images[0], [480, 720, 1080], '16:9')}
                        sizes="(min-width: 1280px) 22vw, (min-width: 768px) 33vw, 90vw"
                        alt={`Room ${room.roomNumber}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-300">
                        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    {room.images?.length > 1 && (
                      <div className="absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-xs text-white">
                        +{room.images.length - 1}
                      </div>
                    )}
                  </div>

                  {/* Room Info */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Room {room.roomNumber}</h3>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        {TYPE_CONFIG[room.roomType] ?? room.roomType}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Floor {room.floor}</p>
                    <p className="mt-2 text-base font-bold text-gray-900">
                      ${room.pricePerNight?.toFixed(2)}<span className="text-xs font-normal text-gray-500"> /night</span>
                    </p>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`${basePath}/rooms/${room.roomId}`}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-center text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        View
                      </Link>
                      <Link
                        to={`${basePath}/rooms/${room.roomId}/edit`}
                        className="flex-1 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-center text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

