import DotCanvas from './DotCanvas';
import { driftScene } from '../lib/dotfield/scenes';
import { useParallax, useReveal } from '../lib/hooks';

const scene = () => driftScene({ density: 1.1 });

const PRINCIPLES = [
  { k: 'Force', v: 'What the body produces, not what it endures.' },
  { k: 'Timing', v: 'Tempo is the difference between lifting and training.' },
  { k: 'Repetition', v: 'Four sets, held honest, over years.' },
];

export default function Vision() {
  const { ref, className } = useReveal(0.16);
  const wash = useParallax<HTMLDivElement>(70);

  return (
    <section id="vision" className="section vision" ref={ref}>
      <div className="vision__wash" aria-hidden="true" ref={wash}>
        <DotCanvas scene={scene} fade />
      </div>

      <div className={`shell vision__inner ${className}`}>
        <p className="eyebrow line">01 — Vision</p>

        <h2 className="display display--xl vision__head">
          <span className="mask-line">
            <span className="line" style={{ '--i': 1 } as React.CSSProperties}>
              Every body is
            </span>
          </span>
          <span className="mask-line">
            <span className="line" style={{ '--i': 2 } as React.CSSProperties}>
              a system
            </span>
          </span>
          <span className="mask-line">
            <span className="line" style={{ '--i': 3 } as React.CSSProperties}>
              in motion<em>.</em>
            </span>
          </span>
        </h2>

        <div className="vision__grid">
          <p className="body line" style={{ '--i': 4 } as React.CSSProperties}>
            FourSets reads movement the way an engineer reads a machine — as force, timing and
            repetition. Not as a photograph, not as a feeling.
          </p>

          <dl className="vision__list">
            {PRINCIPLES.map((p, i) => (
              <div className="vision__row line" key={p.k} style={{ '--i': 5 + i } as React.CSSProperties}>
                <span className="rule wipe" />
                <dt className="mono">{String(i + 1).padStart(2, '0')} / {p.k}</dt>
                <dd className="display display--m">{p.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
