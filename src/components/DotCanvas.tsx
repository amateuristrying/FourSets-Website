import { useEffect, useRef } from 'react';
import { DotField } from '../lib/dotfield/engine';
import type { Scene } from '../lib/dotfield/types';
import { elementProgress, nearViewport, onScroll } from '../lib/scroll';
import { useReducedMotion } from '../lib/hooks';
import { smoothstep } from '../lib/dotfield/math';

interface Props {
  /** Factory so each mount owns its own scene state. */
  scene: () => Scene;
  className?: string;
  /** Fades the field out as the host section leaves the viewport. */
  fade?: boolean;
  label?: string;
}

/**
 * Hosts a DotField: owns sizing, visibility gating and the scroll coupling.
 * The canvas is decorative, so it is hidden from assistive tech and carries an
 * optional text label for the section it illustrates.
 */
export default function DotCanvas({ scene, className = '', fade = false, label }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const field = new DotField(canvas, scene());
    field.resize();

    if (reduced) {
      // Motion is the point of this component, so the reduced-motion path draws
      // one settled frame and keeps it correct across resizes.
      field.renderStill();
      const roStill = new ResizeObserver(() => {
        field.resize();
        field.renderStill();
      });
      roStill.observe(canvas);
      return () => {
        roStill.disconnect();
        field.stop();
      };
    }

    const ro = new ResizeObserver(() => field.resize());
    ro.observe(canvas);

    const host = canvas.parentElement ?? canvas;
    const offScroll = onScroll((_y, velocity) => {
      field.velocity = velocity;
      field.progress = elementProgress(host);
      field.setVisible(nearViewport(host));
      if (fade) {
        // Hold full strength while the section owns the view, then ease away.
        field.setStyle({ opacity: 1 - smoothstep(0.62, 0.95, field.progress) });
      }
    });

    field.start();

    return () => {
      offScroll();
      ro.disconnect();
      field.stop();
    };
  }, [scene, fade, reduced]);

  return (
    <>
      <canvas ref={ref} className={`dotcanvas ${className}`} aria-hidden="true" />
      {label ? <span className="vh">{label}</span> : null}
    </>
  );
}
