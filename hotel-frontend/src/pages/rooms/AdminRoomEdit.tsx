import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRoomById, updateRoom } from "../../services/roomService";
import { useAuth } from "../../context/AuthContext";
import type { Room, RoomType } from "../../types/room";

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "DELUXE", label: "Deluxe" },
  { value: "SUITE", label: "Suite" },
  { value: "FAMILY", label: "Family" },
];

export default function AdminRoomEdit() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === "ADMIN" ? "/admin" : "/manager";

  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);

  const [form, setForm] = useState({
    roomNumber: "",
    roomType: "" as RoomType | "",
    floor: "",
    pricePerNight: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let ignore = false;
    getRoomById(roomId)
      .then((data) => {
        if (ignore) return;
        setRoom(data);
        setForm({
          roomNumber: data.roomNumber,
          roomType: data.roomType,
          floor: String(data.floor),
          pricePerNight: String(data.pricePerNight),
        });
      })
      .catch(() => {
        if (!ignore) setLoadError("Room not found or could not be loaded.");
      })
      .finally(() => {
        if (!ignore) setLoadingRoom(false);
      });
    return () => { ignore = true; };
  }, [roomId]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!form.roomNumber.trim()) {
      e.roomNumber = "Room number is required";
    }

    if (!form.roomType) {
      e.roomType = "Room type is required";
    }

    const floor = Number(form.floor);
    if (!form.floor.trim()) {
      e.floor = "Floor is required";
    } else if (!Number.isInteger(floor) || floor < 1 || floor > 100) {
      e.floor = "Floor must be a whole number between 1 and 100";
    }

    const price = Number(form.pricePerNight);
    if (!form.pricePerNight.trim()) {
      e.pricePerNight = "Price per night is required";
    } else if (isNaN(price) || price <= 0) {
      e.pricePerNight = "Price must be greater than 0";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId || !validate()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      await updateRoom(roomId, {
        roomNumber: form.roomNumber.trim(),
        roomType: form.roomType as RoomType,
        floor: Number(form.floor),
        pricePerNight: Number(form.pricePerNight),
      });
      navigate(`${basePath}/rooms/${roomId}`, {
        state: { successMessage: `Room ${form.roomNumber} updated successfully!` },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error;
      setApiError(msg || "Failed to update room. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingRoom) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading room…</span>
      </div>
    );
  }

  if (loadError || !room) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        {loadError ?? "Room not found."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate(`${basePath}/rooms/${roomId}`)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Room Details
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit Room {room.roomNumber}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Update room information. To change status or manage images, use the Room Details page.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Room Information</h2>

          {/* Read-only Room ID */}
          <div className="mb-5 rounded-lg bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Room ID</p>
            <p className="mt-1 font-mono text-sm text-gray-700">{room.roomId}</p>
            <p className="mt-0.5 text-xs text-gray-400">Room ID cannot be changed after creation</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Room Number */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Room Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="roomNumber"
                value={form.roomNumber}
                onChange={handleChange}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.roomNumber ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.roomNumber && <p className="mt-1 text-xs text-red-600">{errors.roomNumber}</p>}
            </div>

            {/* Room Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Room Type <span className="text-red-500">*</span>
              </label>
              <select
                name="roomType"
                value={form.roomType}
                onChange={handleChange}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.roomType ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              >
                <option value="">Select room type</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.roomType && <p className="mt-1 text-xs text-red-600">{errors.roomType}</p>}
            </div>

            {/* Floor */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Floor <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="floor"
                value={form.floor}
                onChange={handleChange}
                min={1}
                max={100}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.floor ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.floor && <p className="mt-1 text-xs text-red-600">{errors.floor}</p>}
            </div>

            {/* Price Per Night */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Price Per Night ($) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="pricePerNight"
                value={form.pricePerNight}
                onChange={handleChange}
                min={0.01}
                step="0.01"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.pricePerNight ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.pricePerNight && <p className="mt-1 text-xs text-red-600">{errors.pricePerNight}</p>}
            </div>
          </div>
        </div>

        {/* Status note */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <strong>Status:</strong> Room status is managed by the reservation workflow (RESERVED, OCCUPIED, CLEANING) or can be manually set to AVAILABLE or MAINTENANCE from the Room Details page.
        </div>

        {/* API Error */}
        {apiError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`${basePath}/rooms/${roomId}`)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Saving Changes…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

