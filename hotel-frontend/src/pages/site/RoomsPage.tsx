import { useEffect, useState } from 'react';
import Reveal from '../../components/site/Reveal';
import RoomCard from '../../components/site/RoomCard';
import { getRooms } from '../../services/roomService';
import type { Room } from '../../types/room';

/**
 * Public room listing. Reached from the landing page's "View rooms" and
 * "Choose your room" cards, and needs no sign-in.
 */
export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    getRooms()
      .then((data) => {
        if (!ignore) setRooms(data ?? []);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(
            err?.response?.data?.message || 'We could not load our rooms just now.',
          );
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // A room under maintenance is not something to advertise on the public site.
  const bookable = rooms.filter((room) => room.status !== 'MAINTENANCE');

  return (
    <div className="px-6 pb-24 md:px-12 md:pb-32">
      <header className="max-w-3xl pt-4 pb-14 md:pb-20">
        <p className="text-[10px] tracking-[0.3em] text-gold-ink uppercase">Stay</p>
        <h1 className="mt-4 text-[clamp(2rem,6vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.02em] uppercase">
          Rooms
        </h1>
        <p className="mt-6 max-w-md text-sm leading-[2.1] text-muted">
          Every room is built from timber, stone and glass, and looks out on the ridge. Choose the
          one that suits the way you rest.
        </p>
      </header>

      {error && (
        <p role="alert" className="border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-muted">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center text-sm text-muted" role="status">
          Loading rooms…
        </p>
      ) : bookable.length === 0 && !error ? (
        <div className="border border-dashed border-line px-6 py-16 text-center">
          <p className="text-sm tracking-[0.18em] text-muted uppercase">
            No rooms are open for booking
          </p>
          <p className="mt-3 text-sm text-muted">
            Please check back soon, or contact us directly.
          </p>
        </div>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
          {bookable.map((room, index) => (
            <Reveal key={room.roomId} delay={(index % 3) * 120}>
              <RoomCard room={room} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
