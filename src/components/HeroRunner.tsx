import { useEffect, useRef, useState } from 'react';
import { decodeRunner, drawRunner, frameAt, POSTER_FRAME } from '../lib/referenceRunner';
import { useReducedMotion } from '../lib/hooks';
import { nearViewport, onScroll } from '../lib/scroll';
import { runnerScene } from '../lib/dotfield/scenes';
import DotCanvas from './DotCanvas';

const source = new URL('../assets/runner.bin', import.meta.url).href;
const fallback = () => runnerScene();
const label = 'A runner in continuous stride, formed from fine lime particles.';

export default function HeroRunner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || failed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFailed(true);
      return;
    }

    const controller = new AbortController();
    let frames: Uint8Array | undefined;
    let width = 0;
    let height = 0;
    let visible = nearViewport(canvas, 0);
    let raf = 0;
    let elapsed = 0;
    let lastTime = 0;
    let lastFrame = -1;

    const draw = (force = false) => {
      if (!frames) return;
      const frame = reduced ? POSTER_FRAME : frameAt(elapsed);
      if (!force && frame === lastFrame) return;
      lastFrame = frame;
      drawRunner(ctx, frames, frame, width, height);
    };
    const tick = (now: number) => {
      elapsed += Math.min(now - lastTime, 100);
      lastTime = now;
      draw();
      raf = requestAnimationFrame(tick);
    };
    const syncPlayback = () => {
      const shouldPlay = frames && visible && !document.hidden && !reduced;
      if (shouldPlay && !raf) {
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!shouldPlay && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(true);
      visible = nearViewport(canvas, 0);
      syncPlayback();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const offScroll = onScroll(() => {
      visible = nearViewport(canvas, 0);
      syncPlayback();
    });
    document.addEventListener('visibilitychange', syncPlayback);

    fetch(source, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error(`Runner asset: ${response.status}`);
        return response.arrayBuffer();
      })
      .then(buffer => {
        if (controller.signal.aborted) return;
        frames = decodeRunner(new Uint8Array(buffer));
        draw(true);
        syncPlayback();
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });

    return () => {
      controller.abort();
      cancelAnimationFrame(raf);
      observer.disconnect();
      offScroll();
      document.removeEventListener('visibilitychange', syncPlayback);
    };
  }, [reduced, failed]);

  if (failed) return <DotCanvas scene={fallback} label={label} />;
  return <>
    <canvas ref={canvasRef} className="dotcanvas" aria-hidden="true" />
    <span className="vh">{label}</span>
  </>;
}
