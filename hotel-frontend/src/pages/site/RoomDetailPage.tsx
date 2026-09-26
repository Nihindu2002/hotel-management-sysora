import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SiteLink from '../../components/site/SiteLink';
import { getRoomById } from '../../services/roomService';
import type { Room } from '../../types/room';
import { formatMoney, roomTypeLabel } from '../../utils/siteFormat';
import { roomImageSrcSet, roomImageUrl } from '../../utils/roomImage';

/** The gallery hero: 4:3 on phones, 21:9 from md up. */
const HERO_ASPECT = '16:9';

/** Public room detail. Booking hands off to /book with the room preselected. */
export default function RoomDetailPage() {
  const { roomId } = useParams();
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId) return;

    let ignore = false;

    getRoomById(roomId)
      .then((data) => {
        if (!ignore) setRoom(data);
      })
      .catch((err: any) => {
        if (!ignore) {
          setError(err?.response?.data?.message || 'We could not find that room.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [roomId]);

  if (loading) {
    return (
      <p className="px-6 py-24 text-center text-sm text-muted md:px-12" role="status">
        Loading room…
      </p>
    );
  }

  if (error || !room) {
    return (
      <div className="px-6 py-24 text-center md:px-12">
        <p className="text-sm tracking-[0.18em] text-muted uppercase">
          {error || 'Room not found'}
        </p>
        <Link
          to="/rooms"
          className="mt-8 inline-block rounded-full border border-line px-7 py-3 text-[11px] tracking-[0.22em] text-ink uppercase transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white"
        >
          Back to rooms
        </Link>
      </div>
    );
  }

  const isMaintenance = room.status === 'MAINTENANCE';

  return (
    <div className="pb-24 md:pb-32">
      {/* Gallery — first image full-bleed, the rest as a strip beneath. */}
      {room.images?.length > 0 && (
        <div className="mb-12 overflow-hidden md:mb-16">
          <img
            src={roomImageUrl(room.images[0], 1600, HERO_ASPECT)}
            srcSet={roomImageSrcSet(room.images[0], [640, 1024, 1600, 2000], HERO_ASPECT)}
            sizes="100vw"
            alt={`Room ${room.roomNumber}`}
            className="aspect-[4/3] w-full object-cover md:aspect-[21/9]"
          />
        </div>
      )}

      <div className="px-6 md:px-12">
        <Link
          to="/rooms"
          className="text-[11px] tracking-[0.22em] text-muted uppercase transition-colors duration-300 hover:text-ink"
        >
          ← Back to rooms
        </Link>

        <div className="mt-10 grid gap-12 md:grid-cols-[1.4fr_1fr] md:gap-16">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-gold-ink uppercase">
              {roomTypeLabel(room.roomType)}
            </p>
            <h1 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.02em] uppercase">
              Room {room.roomNumber}
            </h1>

            <p className="mt-6 max-w-lg text-sm leading-[2.1] text-muted">
              A {roomTypeLabel(room.roomType).toLowerCase()} room on floor {room.floor}, with warm
              timber walls and a view across the valley. Rates are per night and include breakfast.
            </p>

            {room.images?.length > 1 && (
              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {room.images.slice(1).map((image) => (
                  <img
                    key={image}
                    src={roomImageUrl(image, 1080)}
                    srcSet={roomImageSrcSet(image, [480, 720, 1080])}
                    sizes="(min-width: 640px) 40vw, 90vw"
                    alt={`Room ${room.roomNumber}`}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-cover"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Booking card */}
          <aside className="md:sticky md:top-10 md:self-start">
            <div className="border border-line p-7">
              <p className="text-[10px] tracking-[0.24em] text-muted uppercase">
                From
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">
                {formatMoney(room.pricePerNight)}
                <span className="text-sm font-normal text-muted"> / night</span>
              </p>

              <dl className="mt-7 space-y-3 border-t border-line pt-6 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Floor</dt>
                  <dd>{room.floor}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Type</dt>
                  <dd>{roomTypeLabel(room.roomType)}</dd>
                </div>
              </dl>

              {isMaintenance ? (
                <p className="mt-7 border-l-2 border-danger bg-danger/5 px-4 py-3 text-sm text-muted">
                  This room is under maintenance and cannot be booked right now.
                </p>
              ) : (
                <SiteLink
                  to={`/book?roomId=${room.roomId}`}
                  className="mt-7 block rounded-full bg-navy px-7 py-3.5 text-center text-[11px] tracking-[0.24em] text-white uppercase transition-colors duration-500 hover:bg-royal"
                >
                  Check availability
                </SiteLink>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
