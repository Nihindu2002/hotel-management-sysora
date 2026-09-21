/**
 * Image sources and copy for the LUMI landing page.
 *
 * Photography is served from Unsplash's CDN rather than bundled, so the repo
 * stays free of multi-megabyte binaries. Every id below was checked to resolve
 * (the CDN 404s unknown ids, so a passing request means a real photo).
 *
 * All shots are cropped to a warm, cinematic mountain-resort look via
 * `fit=crop`; containers use `object-cover`, so the requested width only sets
 * the resolution ceiling — CSS decides the final crop.
 */

function unsplash(id: string, width: number): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=${width}`;
}

/**
 * Builds a `srcset` so the browser downloads a variant suited to the viewport
 * instead of one oversized file. Without this the full-bleed shots are ~2.4MB
 * on a phone that renders them a few hundred pixels wide.
 */
function unsplashSet(id: string, widths: number[]): string {
  return widths.map((width) => `${unsplash(id, width)} ${width}w`).join(', ');
}

export const LANDING_IMAGES = {
  /** Wide hero — wooden mountain hotel, pool terrace, forest, warm light. */
  hero: {
    src: unsplash('photo-1571003123894-1f0594d2b5d9', 1600),
    srcSet: unsplashSet('photo-1571003123894-1f0594d2b5d9', [640, 1024, 1600, 2000]),
    alt: 'A modern wooden mountain hotel at golden hour, with an infinity pool on the terrace and a forested ridge behind it.',
  },
  /** Feature card — pool and hotel exterior. */
  bookStay: {
    src: unsplash('photo-1571902943202-507ec2618e8f', 900),
    alt: 'Infinity pool overlooking a mountain valley at sunset.',
  },
  /** Feature card — mountain landscape. */
  explore: {
    src: unsplash('photo-1506905925346-21bda4d32df4', 900),
    alt: 'A wide mountain range under soft morning light.',
  },
  /** Feature card — wooden architecture. */
  chooseRoom: {
    src: unsplash('photo-1518780664697-55e3ad937233', 900),
    alt: 'Angular timber cladding and glass on the hotel facade.',
  },
  /** Tall right-hand image — terrace, pool, guests relaxing. */
  rest: {
    src: unsplash('photo-1584132967334-10e028bd69f7', 1000),
    srcSet: unsplashSet('photo-1584132967334-10e028bd69f7', [640, 1000, 1400]),
    alt: 'Guests relaxing on loungers beside a mountain-view pool terrace in warm afternoon sun.',
  },
  /** Wide interior — the room showcase. */
  room: {
    src: unsplash('photo-1611892440504-42a792e24d32', 1600),
    srcSet: unsplashSet('photo-1611892440504-42a792e24d32', [640, 1024, 1600, 2000]),
    alt: 'A luxury lodge bedroom with a large bed, warm timber walls and soft natural light.',
  },
  /** Tall left-hand image — mountain and forest, atmospheric light. */
  planning: {
    src: unsplash('photo-1470071459604-3b5ec3a7fe05', 1000),
    srcSet: unsplashSet('photo-1470071459604-3b5ec3a7fe05', [640, 1000, 1400]),
    alt: 'Mountain ridges dissolving into forest mist in warm atmospheric light.',
  },
} as const;

/** The three editorial blocks under the introduction. */
export const LANDING_CARDS = [
  { label: 'Book your stay', href: '/book', image: LANDING_IMAGES.bookStay },
  { label: 'Explore the surroundings', href: '/#explore', image: LANDING_IMAGES.explore },
  { label: 'Choose your room', href: '/rooms', image: LANDING_IMAGES.chooseRoom },
] as const;

/** Room names overlaid on the interior shot; the first is the featured one. */
export const LANDING_ROOMS = [
  'LUMI Silent Room',
  'Mountain View Suite',
  'Snow Light Studio',
  'Snow Studio',
] as const;
