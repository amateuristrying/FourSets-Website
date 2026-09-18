import { useEffect, useMemo, useRef, useState } from 'react';
import { elementProgress, onScroll } from './scroll';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

export function useMedia(query: string) {
  const [match, setMatch] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia(query).matches,
  );
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setMatch(mq.matches);
    setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/**
 * Adds `is-in` once the element has entered the viewport, then stops watching.
 *
 * Deliberately rect-based off the shared scroll loop rather than an
 * IntersectionObserver: it is one code path for every scroll-driven effect on
 * the page, and it behaves identically in embedded and background contexts
 * where observers can report nothing as intersecting.
 */
export function useReveal<T extends HTMLElement>(ratio = 0.12) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    return onScroll(() => {
      if (done) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const lead = Math.min(r.height * ratio, vh * 0.28);
      if (r.top < vh - lead && r.bottom > 0) {
        done = true;
        setInView(true);
      }
    });
  }, [ratio]);

  const className = useMemo(() => (inView ? 'reveal is-in' : 'reveal'), [inView]);
  return { ref, inView, className };
}

/** Tracks which section owns the middle of the viewport, for nav state. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    return onScroll(() => {
      const mid = (window.innerHeight || 1) * 0.42;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          current = id;
          break;
        }
      }
      setActive(current);
    });
  }, [ids]);

  return active;
}

/**
 * Publishes the element's own scroll progress as `--shift`, a pixel offset the
 * stylesheet can use for parallax. Keeps the transform in CSS where it belongs.
 */
export function useParallax<T extends HTMLElement>(range = 48) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    return onScroll(() => {
      const p = elementProgress(el);
      el.style.setProperty('--shift', `${((p - 0.5) * -range).toFixed(2)}px`);
    });
  }, [range]);

  return ref;
}
