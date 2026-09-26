import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRooms } from "../../services/roomService";
import type { Room } from "../../types/room";
import { roomImageSrcSet, roomImageUrl } from "../../utils/roomImage";

export default function Rooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const data = await getRooms();
        setRooms(data);
      } catch {
        setError("Failed to load rooms.");
      } finally {
        setLoading(false);
      }
    };

    loadRooms();
  }, []);

  if (loading) {
    return <div>Loading rooms...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Rooms</h1>
        <p className="text-gray-600">
          Browse our available hotel rooms.
        </p>
      </div>

      {rooms.length === 0 ? (
        <p>No rooms found.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div
              key={room.roomId}
              className="overflow-hidden rounded-lg bg-white shadow"
            >
              {room.images?.length > 0 ? (
                <img
                  src={roomImageUrl(room.images[0], 1080, '16:9')}
                  srcSet={roomImageSrcSet(room.images[0], [480, 720, 1080], '16:9')}
                  sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  alt={`Room ${room.roomNumber}`}
                  loading="lazy"
                  decoding="async"
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="flex h-48 items-center justify-center bg-gray-200">
                  No image
                </div>
              )}

              <div className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">
                    Room {room.roomNumber}
                  </h2>

                  <span className="rounded bg-gray-100 px-2 py-1 text-sm">
                    {room.roomType}
                  </span>
                </div>

                <p className="text-gray-600">
                  Floor {room.floor}
                </p>

                <p className="mt-3 text-lg font-bold">
                  ${room.pricePerNight} / night
                </p>

                <p className="mt-2 text-sm">
                  Status: {room.status}
                </p>

                <Link
                  to={`/receptionist/rooms/${room.roomId}`}
                  className="mt-4 block rounded bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
                >
                  View Room
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}