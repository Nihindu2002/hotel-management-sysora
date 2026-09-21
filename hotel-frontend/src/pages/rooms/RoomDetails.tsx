import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getRoomById } from "../../services/roomService";
import type { Room } from "../../types/room";

export default function RoomDetails() {
  const { roomId } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!roomId) return;

    const loadRoom = async () => {
      try {
        const data = await getRoomById(roomId);
        setRoom(data);
      } catch {
        setError("Failed to load room.");
      } finally {
        setLoading(false);
      }
    };

    loadRoom();
  }, [roomId]);

  if (loading) {
    return <div>Loading room...</div>;
  }

  if (error || !room) {
    return <div className="text-red-600">{error || "Room not found."}</div>;
  }

  return (
    <div className="max-w-4xl">
      <Link
        to="/receptionist/rooms"
        className="mb-6 inline-block text-blue-600"
      >
        ← Back to rooms
      </Link>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {room.images?.length > 0 && (
          <div className="grid gap-2 md:grid-cols-2">
            {room.images.map((image) => (
              <img
                key={image}
                src={image}
                alt={`Room ${room.roomNumber}`}
                className="h-72 w-full object-cover"
              />
            ))}
          </div>
        )}

        <div className="p-6">
          <h1 className="text-3xl font-bold">
            Room {room.roomNumber}
          </h1>

          <p className="mt-2 text-gray-600">
            {room.roomType} · Floor {room.floor}
          </p>

          <p className="mt-6 text-2xl font-bold">
            ${room.pricePerNight} / night
          </p>

          <p className="mt-3">
            Status: <strong>{room.status}</strong>
          </p>

          {room.status !== "MAINTENANCE" ? (
            <Link
              to={`/reservations/new?roomId=${room.roomId}`}
              className="mt-6 inline-block rounded bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition"
            >
              Reserve This Room
            </Link>
          ) : (
            <p className="mt-4 text-sm font-semibold text-red-600">
              This room is currently under maintenance and cannot be reserved.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}