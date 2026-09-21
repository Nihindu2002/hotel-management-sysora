import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Reveal from '../../components/site/Reveal';
import SiteLink from '../../components/site/SiteLink';
import { LANDING_CARDS, LANDING_IMAGES, LANDING_ROOMS } from './landingContent';

/** The small circled arrow that sits beside each card label. */
function ArrowCircle() {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors duration-500 group-hover:border-royal group-hover:bg-navy group-hover:text-white"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-3.5 w-3.5">
        <path d="M5 12h13M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

const OUTLINE_BUTTON =
  'inline-block rounded-full border border-line px-9 py-3 text-[11px] uppercase tracking-[0.28em] text-ink transition-colors duration-500 hover:border-navy hover:bg-royal hover:text-white';

export default function LandingPage() {
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('2');

  // The browser tab should read as the hotel's site, not as the management app.
  useEffect(() => {
    const previous = document.title;
    document.title = 'LUMI — A Quiet Retreat in the Mountains';
    return () => {
      document.title = previous;
    };
  }, []);

  /**
   * Hands the dates to the availability page through query params, so a guest
   * arriving from here lands on prefilled results instead of an empty search.
   */
  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (checkIn) params.set('checkInDate', checkIn);
    if (checkOut) params.set('checkOutDate', checkOut);
    params.set('numberOfGuests', guests);

    navigate(`/book?${params.toString()}`);
  };

  return (
    <>
      {/* ── Hero ── */}
      <section>
        <div className="relative overflow-hidden">
          <img
            src={LANDING_IMAGES.hero.src}
            srcSet={LANDING_IMAGES.hero.srcSet}
            sizes="100vw"
            alt={LANDING_IMAGES.hero.alt}
            className="aspect-[4/5] w-full object-cover sm:aspect-[16/10] lg:aspect-[16/9]"
            fetchPriority="high"
          />

          {/* Scrim: the headline is white on photography, so it needs a
              guaranteed dark backing to stay legible. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-navy/70 via-navy/15 to-transparent"
          />

          <h1 className="absolute inset-x-0 bottom-0 p-6 text-[clamp(2.5rem,8vw,7rem)] leading-[0.88] font-semibold tracking-[-0.02em] text-white uppercase md:p-12 lg:p-16">
            <span className="block">Stay</span>
            <span className="flex items-baseline justify-between gap-4">
              <span>Among</span>
              <span>The</span>
            </span>
            <span className="block md:pl-[18%]">Light</span>
          </h1>
        </div>
      </section>

      <div className="flex justify-center py-10 md:py-14">
        <SiteLink to="/#explore" className={OUTLINE_BUTTON}>
          Explore
        </SiteLink>
      </div>

      {/* ── Introduction ── */}
      <section id="about" className="scroll-mt-10 px-6 pb-20 text-center md:px-16 md:pb-28">
        <Reveal>
          <h2 className="mx-auto max-w-4xl text-[clamp(1.35rem,3.1vw,2.4rem)] leading-[1.2] font-semibold tracking-[-0.01em] uppercase">
            LUMI — a quiet retreat, built in harmony with the mountains.
          </h2>

          <p className="mt-8 text-[11px] tracking-[0.32em] text-muted uppercase">
            Your space — your view — your moment.
          </p>

          <p className="mt-6 text-lg text-gold-ink italic">mountains, forests, stillness</p>
        </Reveal>
      </section>

      {/* ── Feature cards ── */}
      <section id="explore" className="scroll-mt-10 px-6 pb-20 md:px-12 md:pb-28">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-6 lg:gap-8">
          {LANDING_CARDS.map((card, index) => (
            <Reveal key={card.label} delay={index * 120}>
              <SiteLink to={card.href} className="group block">
                <div className="overflow-hidden">
                  <img
                    src={card.image.src}
                    alt={card.image.alt}
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
                  />
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-4">
                  <span className="text-[11px] tracking-[0.22em] uppercase">{card.label}</span>
                  <ArrowCircle />
                </div>
              </SiteLink>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Choose your way to rest ── */}
      <section className="grid gap-10 px-6 pb-20 md:grid-cols-2 md:gap-14 md:px-12 md:pb-28">
        <div className="flex flex-col justify-between">
          <Reveal>
            <h2 className="text-[clamp(2rem,5.5vw,4.25rem)] leading-[0.92] font-semibold tracking-[-0.02em] uppercase">
              Choose
              <br />
              your way
              <br />
              to rest
            </h2>

            <p className="mt-10 max-w-xs text-sm leading-[2.1] whitespace-pre-line text-muted">
              {'Quiet mornings.\nMountain views.\nWarm wood.\nRooms designed for slow living.'}
            </p>
          </Reveal>

          <Reveal delay={120}>
            <SiteLink to="/rooms" className={`mt-12 ${OUTLINE_BUTTON}`}>
              View rooms
            </SiteLink>
          </Reveal>
        </div>

        <Reveal delay={160}>
          <img
            src={LANDING_IMAGES.rest.src}
            srcSet={LANDING_IMAGES.rest.srcSet}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt={LANDING_IMAGES.rest.alt}
            loading="lazy"
            className="aspect-[4/5] w-full object-cover md:h-full md:min-h-[34rem] md:aspect-auto"
          />
        </Reveal>
      </section>

      {/* ── Here you can stay ── */}
      <section id="stay" className="scroll-mt-10 px-6 pb-20 md:px-12 md:pb-28">
        <Reveal>
          <h2 className="text-[clamp(1.75rem,4.6vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.02em] uppercase">
            Here you can
            <br />
            stay
          </h2>
        </Reveal>

        <Reveal delay={120} className="mt-8 md:mt-12">
          <div className="relative overflow-hidden">
            <img
              src={LANDING_IMAGES.room.src}
              srcSet={LANDING_IMAGES.room.srcSet}
              sizes="100vw"
              alt={LANDING_IMAGES.room.alt}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover md:aspect-[16/9]"
            />

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-navy/65 via-transparent to-transparent"
            />

            <ul className="absolute right-0 bottom-0 space-y-2 p-5 text-right md:p-9">
              {LANDING_ROOMS.map((room, index) => (
                <li
                  key={room}
                  className={`text-[10px] tracking-[0.24em] uppercase md:text-[11px] ${
                    index === 0 ? 'text-gold' : 'text-white/85'
                  }`}
                >
                  {room}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ── Closing call to action ── */}
      <section className="grid gap-10 px-6 pb-24 md:grid-cols-2 md:gap-14 md:px-12 md:pb-32">
        <Reveal>
          <img
            src={LANDING_IMAGES.planning.src}
            srcSet={LANDING_IMAGES.planning.srcSet}
            sizes="(min-width: 768px) 50vw, 100vw"
            alt={LANDING_IMAGES.planning.alt}
            loading="lazy"
            className="aspect-[4/5] w-full object-cover md:h-full md:min-h-[32rem] md:aspect-auto"
          />
        </Reveal>

        <div className="flex flex-col justify-center">
          <Reveal delay={120}>
            <h2 className="text-[clamp(1.75rem,4.6vw,3.5rem)] leading-[0.95] font-semibold tracking-[-0.02em] uppercase">
              Start
              <br />
              planning
              <br />
              your stay
            </h2>

            <p className="mt-8 max-w-sm text-sm leading-[2.1] whitespace-pre-line text-muted">
              {
                'Everything you need for a quiet mountain escape.\nChoose your room, select your dates,\nand let the mountains do the rest.'
              }
            </p>

            <form onSubmit={handleSearch} className="mt-10 max-w-md">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="landing-check-in"
                    className="block text-[10px] tracking-[0.24em] text-muted uppercase"
                  >
                    Check in
                  </label>
                  <input
                    id="landing-check-in"
                    type="date"
                    value={checkIn}
                    onChange={(event) => setCheckIn(event.target.value)}
                    className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal"
                  />
                </div>

                <div>
                  <label
                    htmlFor="landing-check-out"
                    className="block text-[10px] tracking-[0.24em] text-muted uppercase"
                  >
                    Check out
                  </label>
                  <input
                    id="landing-check-out"
                    type="date"
                    value={checkOut}
                    min={checkIn || undefined}
                    onChange={(event) => setCheckOut(event.target.value)}
                    className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal"
                  />
                </div>
              </div>

              <div className="mt-6 max-w-[calc(50%-0.75rem)]">
                <label
                  htmlFor="landing-guests"
                  className="block text-[10px] tracking-[0.24em] text-muted uppercase"
                >
                  Guests
                </label>
                <select
                  id="landing-guests"
                  value={guests}
                  onChange={(event) => setGuests(event.target.value)}
                  className="w-full border-b border-line bg-transparent py-2.5 text-sm text-ink outline-none transition-colors duration-300 focus:border-royal"
                >
                  {[1, 2, 3, 4, 5, 6].map((count) => (
                    <option key={count} value={String(count)}>
                      {count} {count === 1 ? 'guest' : 'guests'}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="mt-10 rounded-full bg-navy px-9 py-3.5 text-[11px] tracking-[0.28em] text-white uppercase transition-colors duration-500 hover:bg-royal"
              >
                Book your stay
              </button>
            </form>
          </Reveal>
        </div>
      </section>
    </>
  );
}
