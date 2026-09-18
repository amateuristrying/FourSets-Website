type Listener = (y: number, velocity: number) => void;

const listeners = new Set<Listener>();
let running = false;
let lastY = 0;
let lastT = 0;
let velocity = 0;

/**
 * One scroll loop for the whole page: publishes scroll position plus a smoothed
 * 0..1 velocity, and idles itself once the page settles.
 */
function tick(now: number) {
  const y = window.scrollY;
  const dt = Math.max(0.008, (now - lastT) / 1000);
  const instant = Math.min(1, Math.abs(y - lastY) / (dt * 2600));
  velocity += (instant - velocity) * (instant > velocity ? 0.5 : 0.07);
  lastY = y;
  lastT = now;

  for (const l of listeners) l(y, velocity);

  if (velocity > 0.003 && listeners.size) {
    requestAnimationFrame(tick);
  } else {
    velocity = 0;
    running = false;
  }
}

function wake() {
  if (running || !listeners.size) return;
  running = true;
  lastT = performance.now();
  requestAnimationFrame(tick);
}

export function onScroll(listener: Listener) {
  if (!listeners.size) {
    lastY = window.scrollY;
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake, { passive: true });
  }
  listeners.add(listener);
  listener(window.scrollY, 0);
  wake();

  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
    }
  };
}

/** 0 when the element's top hits the viewport bottom, 1 when its bottom leaves the top. */
export function elementProgress(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  return Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
}

/** True while the element is within `margin` viewports of the visible area. */
export function nearViewport(el: HTMLElement, margin = 0.25) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 1;
  return r.bottom > -vh * margin && r.top < vh * (1 + margin);
}
