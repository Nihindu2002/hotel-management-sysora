import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRoom } from "../../services/roomService";
import { useAuth } from "../../context/AuthContext";
import type { RoomType, RoomStatus } from "../../types/room";

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: "STANDARD", label: "Standard" },
  { value: "DELUXE", label: "Deluxe" },
  { value: "SUITE", label: "Suite" },
  { value: "FAMILY", label: "Family" },
];

const ROOM_STATUSES: { value: RoomStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "CLEANING", label: "Cleaning" },
];

export default function AdminRoomCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === "ADMIN" ? "/admin" : "/manager";

  const [form, setForm] = useState({
    roomId: "",
    roomNumber: "",
    roomType: "" as RoomType | "",
    floor: "",
    pricePerNight: "",
    status: "AVAILABLE" as RoomStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!form.roomId.trim()) {
      e.roomId = "Room ID is required";
    } else if (!/^[a-zA-Z0-9_-]+$/.test(form.roomId.trim())) {
      e.roomId = "Room ID must be alphanumeric (no spaces)";
    }

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
    if (!validate()) return;

    setSubmitting(true);
    setApiError(null);

    try {
      const room = await createRoom({
        roomId: form.roomId.trim(),
        roomNumber: form.roomNumber.trim(),
        roomType: form.roomType as RoomType,
        floor: Number(form.floor),
        pricePerNight: Number(form.pricePerNight),
        status: form.status,
      });
      navigate(`${basePath}/rooms/${room.roomId}`, {
        state: { successMessage: `Room ${room.roomNumber} created successfully!` },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error;
      if (status === 409) {
        setApiError(`A room with ID "${form.roomId}" already exists. Please use a different Room ID.`);
      } else if (msg) {
        setApiError(msg);
      } else {
        setApiError("Failed to create room. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <button
          type="button"
          onClick={() => navigate(`${basePath}/rooms`)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Rooms
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Room</h1>
        <p className="mt-1 text-sm text-gray-600">Fill in the details to create a new hotel room</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-gray-900">Room Details</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Room ID */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Room ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="roomId"
                value={form.roomId}
                onChange={handleChange}
                placeholder="e.g. room-101"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.roomId ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.roomId && <p className="mt-1 text-xs text-red-600">{errors.roomId}</p>}
              <p className="mt-1 text-xs text-gray-400">Unique identifier (alphanumeric, no spaces)</p>
            </div>

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
                placeholder="e.g. 101"
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
                placeholder="e.g. 1"
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
                min={1}
                step="0.01"
                placeholder="e.g. 150.00"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.pricePerNight ? "border-red-400 bg-red-50" : "border-gray-300"
                }`}
              />
              {errors.pricePerNight && <p className="mt-1 text-xs text-red-600">{errors.pricePerNight}</p>}
            </div>

            {/* Initial Status */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Initial Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {ROOM_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Images note */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <strong>Images:</strong> You can upload room images after creating the room from the Room Details page.
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
            onClick={() => navigate(`${basePath}/rooms`)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating Room…" : "Create Room"}
          </button>
        </div>
      </form>
    </div>
  );
}

