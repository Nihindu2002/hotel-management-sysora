import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger in milliseconds, for revealing a row of siblings in sequence. */
  delay?: number;
}

/**
 * Fades and lifts its children into place the first time they scroll into view.
 *
 * Deliberately one-directional: once revealed the observer disconnects, so
 * content never fades back out while the user scrolls around. Users who have
 * asked their OS for reduced motion get the final state immediately rather
 * than a fast animation.
 */
export default function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Users who have asked their OS for reduced motion start in the final state,
  // so nothing animates and no observer is needed.
  const [revealed, setRevealed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || revealed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      // Fire slightly before the element is fully on screen so the motion
      // finishes as it settles into the viewport.
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [revealed]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: revealed ? `${delay}ms` : '0ms' }}
      className={`transition-[opacity,transform] ease-out duration-[900ms] motion-reduce:transition-none ${
        revealed ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}
