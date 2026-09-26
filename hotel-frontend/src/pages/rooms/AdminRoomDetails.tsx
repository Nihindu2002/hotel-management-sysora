import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, useLocation, Link } from "react-router-dom";
import {
  getRoomById,
  updateRoomStatus,
  uploadRoomImage,
  deleteRoomImage,
} from "../../services/roomService";
import { useAuth } from "../../context/AuthContext";
import type { Room, RoomStatus } from "../../types/room";
import { roomImageSrcSet, roomImageUrl } from "../../utils/roomImage";

const STATUS_CONFIG: Record<RoomStatus, { label: string; cls: string; dotCls: string }> = {
  AVAILABLE: { label: "Available", cls: "bg-emerald-100 text-emerald-800", dotCls: "bg-emerald-500" },
  RESERVED: { label: "Reserved", cls: "bg-blue-100 text-blue-800", dotCls: "bg-blue-500" },
  OCCUPIED: { label: "Occupied", cls: "bg-orange-100 text-orange-800", dotCls: "bg-orange-500" },
  CLEANING: { label: "Cleaning", cls: "bg-yellow-100 text-yellow-800", dotCls: "bg-yellow-500" },
  MAINTENANCE: { label: "Maintenance", cls: "bg-red-100 text-red-800", dotCls: "bg-red-500" },
};

// Statuses that staff can manually transition to from the UI
// (RESERVED, OCCUPIED, CHECKED_IN are handled by the reservation workflow)
const MANUAL_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  AVAILABLE: ["MAINTENANCE", "CLEANING"],
  RESERVED: [], // Managed by reservation confirmation flow
  OCCUPIED: [], // Managed by check-in flow
  CLEANING: ["AVAILABLE", "MAINTENANCE"],
  MAINTENANCE: ["AVAILABLE"],
};

const TYPE_LABEL: Record<string, string> = {
  STANDARD: "Standard",
  DELUXE: "Deluxe",
  SUITE: "Suite",
  FAMILY: "Family",
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE_MB = 5;

export default function AdminRoomDetails() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isStaff =
    user?.role === "ADMIN" || user?.role === "MANAGER";
  const basePath = user?.role === "ADMIN" ? "/admin" : "/manager";

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    (location.state as any)?.successMessage ?? null
  );

  // Status change
  const [statusChanging, setStatusChanging] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImages, setPreviewImages] = useState<{ url: string; file: File }[]>([]);

  // Image delete
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadRoom = async () => {
    if (!roomId) return;
    try {
      const data = await getRoomById(roomId);
      setRoom(data);
    } catch {
      setError("Room not found or could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleStatusChange = async (newStatus: RoomStatus) => {
    if (!room || !roomId) return;
    setStatusChanging(true);
    setStatusError(null);
    setSuccessMessage(null);

    try {
      const updated = await updateRoomStatus(roomId, newStatus);
      setRoom(updated);
      setSuccessMessage(`Room status updated to ${STATUS_CONFIG[newStatus].label}`);
    } catch (err: any) {
      setStatusError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to update room status."
      );
    } finally {
      setStatusChanging(false);
    }
  };

  const validateImageFile = (file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return `"${file.name}" is not a valid image format (JPEG, PNG, WebP, GIF only)`;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return `"${file.name}" is too large (max ${MAX_IMAGE_SIZE_MB}MB)`;
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    for (const file of files) {
      const err = validateImageFile(file);
      if (err) {
        setUploadError(err);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
    }

    const previews = files.map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setPreviewImages((prev) => [...prev, ...previews]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePreview = (index: number) => {
    setPreviewImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (!roomId || previewImages.length === 0) return;
    setUploading(true);
    setUploadError(null);
    setSuccessMessage(null);

    try {
      let updatedRoom = room!;
      for (const preview of previewImages) {
        updatedRoom = await uploadRoomImage(roomId, preview.file);
        URL.revokeObjectURL(preview.url);
      }
      setRoom(updatedRoom);
      setPreviewImages([]);
      setSuccessMessage(`${previewImages.length} image${previewImages.length > 1 ? "s" : ""} uploaded successfully!`);
    } catch (err: any) {
      setUploadError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Image upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!roomId) return;
    setDeletingUrl(imageUrl);
    setDeleteError(null);
    setSuccessMessage(null);

    try {
      const updated = await deleteRoomImage(roomId, imageUrl);
      setRoom(updated);
      setSuccessMessage("Image removed successfully.");
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to delete image."
      );
    } finally {
      setDeletingUrl(null);
    }
  };

  const allImages = [...(room?.images ?? [])];
  const totalImages = allImages.length;
  const allowedTransitions = room ? MANUAL_TRANSITIONS[room.status] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <span className="ml-3 text-sm text-gray-500">Loading room…</span>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        {error ?? "Room not found."}
      </div>
    );
  }

  const status = STATUS_CONFIG[room.status];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate(isStaff ? `${basePath}/rooms` : "/rooms")}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Rooms
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Room {room.roomNumber}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dotCls}`} />
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {TYPE_LABEL[room.roomType] ?? room.roomType} · Floor {room.floor} · ID: <span className="font-mono text-xs">{room.roomId}</span>
          </p>
        </div>
        {isStaff && (
          <Link
            to={`${basePath}/rooms/${room.roomId}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            Edit Room
          </Link>
        )}
      </div>

      {/* Success / Error banners */}
      {successMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Room Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Room Info Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-900">Room Information</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Room Number", value: room.roomNumber },
                { label: "Room Type", value: TYPE_LABEL[room.roomType] ?? room.roomType },
                { label: "Floor", value: `Floor ${room.floor}` },
                { label: "Price Per Night", value: `$${room.pricePerNight?.toFixed(2)}` },
                { label: "Current Status", value: status.label },
                { label: "Total Images", value: String(totalImages) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Images */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Room Images ({totalImages})</h2>
              {isStaff && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Upload Images
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Upload error */}
            {uploadError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {uploadError}
              </div>
            )}
            {deleteError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            {/* Previews (pending upload) */}
            {previewImages.length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                  {previewImages.length} Image{previewImages.length > 1 ? "s" : ""} Ready to Upload
                </p>
                <div className="flex flex-wrap gap-2">
                  {previewImages.map((p, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border-2 border-amber-300 bg-gray-100">
                      <img src={p.url} alt="Preview" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemovePreview(i)}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={uploading}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {uploading ? "Uploading…" : `Upload ${previewImages.length} Image${previewImages.length > 1 ? "s" : ""}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      previewImages.forEach((p) => URL.revokeObjectURL(p.url));
                      setPreviewImages([]);
                    }}
                    disabled={uploading}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Existing Images */}
            {allImages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center">
                <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-400">No images uploaded yet</p>
                {isStaff && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Upload your first image
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {allImages.map((img, i) => (
                  <div
                    key={img}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                  >
                    <img
                      src={roomImageUrl(img, 720, '1:1')}
                      srcSet={roomImageSrcSet(img, [360, 540, 720], '1:1')}
                      sizes="(min-width: 640px) 30vw, 45vw"
                      alt={`Room ${room.roomNumber} image ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                      onClick={() => setLightboxIndex(i)}
                    />
                    {isStaff && (
                      <button
                        type="button"
                        disabled={deletingUrl === img}
                        onClick={() => handleDeleteImage(img)}
                        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 group-hover:opacity-100 hover:bg-red-700 disabled:opacity-50 transition-all"
                        title="Delete image"
                      >
                        {deletingUrl === img ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    )}
                    {i === 0 && (
                      <div className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                        Main
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Status Management */}
        {isStaff && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-gray-900">Status Management</h2>

              {/* Current Status */}
              <div className="mb-4 rounded-lg bg-gray-50 p-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Current Status</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold ${status.cls}`}>
                  <span className={`h-2 w-2 rounded-full ${status.dotCls}`} />
                  {status.label}
                </span>
              </div>

              {statusError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {statusError}
                </div>
              )}

              {allowedTransitions.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-600">Change to:</p>
                  <div className="space-y-2">
                    {allowedTransitions.map((s) => {
                      const cfg = STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={statusChanging}
                          onClick={() => handleStatusChange(s)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors disabled:opacity-50 ${cfg.cls} border-current/20 hover:opacity-80`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${cfg.dotCls}`} />
                            {statusChanging ? "Updating…" : cfg.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Status <strong>{status.label}</strong> is managed automatically by the reservation workflow (RESERVED → OCCUPIED → CLEANING). Use room actions from the Reservations page.
                </p>
              )}
            </div>

            {/* Capacity Info */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-gray-900">Capacity</h2>
              <p className="text-sm text-gray-600">
                Max guests for <strong>{TYPE_LABEL[room.roomType] ?? room.roomType}</strong>:
              </p>
              <p className="mt-1 text-2xl font-bold text-indigo-600">
                {room.roomType === "STANDARD" ? 2
                  : room.roomType === "DELUXE" ? 3
                  : room.roomType === "SUITE" ? 4
                  : room.roomType === "FAMILY" ? 6
                  : "—"}
                <span className="text-sm font-normal text-gray-500 ml-1">guests</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="relative max-h-[90vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={allImages[lightboxIndex]}
              alt={`Room ${room.roomNumber}`}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg hover:bg-gray-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setLightboxIndex((lightboxIndex - 1 + allImages.length) % allImages.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900 hover:bg-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % allImages.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900 hover:bg-white"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/50 px-3 py-1 text-xs text-white">
                  {lightboxIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

