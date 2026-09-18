import DotCanvas from './DotCanvas';
import { latticeScene } from '../lib/dotfield/scenes';
import { useReveal } from '../lib/hooks';

const scene = () => latticeScene();

const METHOD = [
  { k: 'Sense', v: 'Every rep captured. Depth, tempo, symmetry, drift.' },
  { k: 'Model', v: 'Your body becomes a live model instead of a logbook.' },
  { k: 'Prescribe', v: "Tomorrow's session is written by today's data." },
  { k: 'Adapt', v: 'The plan moves the moment you do.' },
];

export default function Mission() {
  const { ref, className } = useReveal(0.14);

  return (
    <section id="mission" className="section mission" ref={ref}>
      <div className="mission__field" aria-hidden="true">
        <DotCanvas scene={scene} fade />
      </div>

      <div className={`shell mission__inner ${className}`}>
        <div className="mission__top">
          <p className="eyebrow line">02 — Mission</p>
          <h2 className="display display--l mission__head">
            <span className="mask-line">
              <span className="line" style={{ '--i': 1 } as React.CSSProperties}>
                Four sets.
              </span>
            </span>
            <span className="mask-line">
              <span className="line" style={{ '--i': 2 } as React.CSSProperties}>
                Measured to the<em> millimetre.</em>
              </span>
            </span>
          </h2>
        </div>

        <ol className="mission__grid">
          {METHOD.map((m, i) => (
            <li className="mission__cell" key={m.k} style={{ '--i': 3 + i } as React.CSSProperties}>
              <span className="rule wipe" />
              <span className="mono mission__index fade">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mission__title line">{m.k}</h3>
              <p className="body mission__copy line">{m.v}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
