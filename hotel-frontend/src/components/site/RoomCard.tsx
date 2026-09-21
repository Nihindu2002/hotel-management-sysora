import SiteLink from './SiteLink';
import type { Room } from '../../types/room';
import { formatMoney, roomTypeLabel } from '../../utils/siteFormat';
import { roomImageSrcSet, roomImageUrl } from '../../utils/roomImage';

/**
 * Widths the browser may pick from, matched to the grid in RoomsPage: three
 * columns at `lg`, two at `sm`, one below that.
 */
const IMAGE_WIDTHS = [480, 720, 1080, 1440];
const IMAGE_SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw';

/**
 * A room as it appears in a listing.
 *
 * The image is 4:3 and delivered through `roomImageUrl`, which both crops
 * landscape photography to the card rather than the portrait slice the old
 * cards used, and lets the browser pick a rendition sized for the slot.
 */
export default function RoomCard({ room }: { room: Room }) {
  const cover = room.images?.[0];

  return (
    <SiteLink to={`/rooms/${room.roomId}`} className="group block">
      <div className="relative overflow-hidden bg-line/40">
        {cover ? (
          <img
            src={roomImageUrl(cover, 1080)}
            srcSet={roomImageSrcSet(cover, IMAGE_WIDTHS)}
            sizes={IMAGE_SIZES}
            alt={`Room ${room.roomNumber}, ${roomTypeLabel(room.roomType)}`}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center text-[10px] tracking-[0.22em] text-muted uppercase">
            Photographs coming soon
          </div>
        )}

        {/* Type chip — saves a line in the caption and gives a textless image
            somewhere for the eye to land. */}
        <span className="absolute top-4 left-4 bg-card/90 px-3 py-1.5 text-[10px] tracking-[0.22em] text-ink uppercase backdrop-blur-sm">
          {roomTypeLabel(room.roomType)}
        </span>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.22em] uppercase">Room {room.roomNumber}</p>
          <p className="mt-1.5 text-xs text-muted">Floor {room.floor}</p>
        </div>

        <p className="shrink-0 text-sm text-gold-ink">
          {formatMoney(room.pricePerNight)}
          <span className="text-muted"> / night</span>
        </p>
      </div>
    </SiteLink>
  );
}
