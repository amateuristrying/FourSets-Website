import { useMemo } from 'react';
import DotCanvas from './DotCanvas';
import { progressionScene } from '../lib/dotfield/scenes';
import { useMedia, useReveal } from '../lib/hooks';

const STAGES = [
  { week: 'W01', stride: '1.02', cadence: '148', output: '212' },
  { week: 'W12', stride: '1.34', cadence: '166', output: '288' },
  { week: 'W24', stride: '1.61', cadence: '181', output: '364' },
];

const ROWS = [
  { label: 'Stride', unit: 'm', key: 'stride' },
  { label: 'Cadence', unit: 'spm', key: 'cadence' },
  { label: 'Output', unit: 'W', key: 'output' },
] as const;

export default function Transformations() {
  const { ref, className } = useReveal(0.12);
  const solo = useMedia('(max-width: 760px)');

  // One figure on phones, the full progression on wider screens.
  const scene = useMemo(
    () => () => progressionScene(solo ? { stages: [1] } : {}),
    [solo],
  );

  return (
    <section id="transformations" className="section transformations" ref={ref}>
      <div className={`shell tf__inner ${className}`}>
        <div className="tf__head">
          <p className="eyebrow line">03 — Transformations</p>
          <h2 className="display display--l">
            <span className="mask-line">
              <span className="line" style={{ '--i': 1 } as React.CSSProperties}>
                Proof is a curve,
              </span>
            </span>
            <span className="mask-line">
              <span className="line" style={{ '--i': 2 } as React.CSSProperties}>
                not a<em> photograph.</em>
              </span>
            </span>
          </h2>
          <p className="body tf__lede line" style={{ '--i': 3 } as React.CSSProperties}>
            The same athlete, twenty-four weeks apart. Held still, then driving. What changes is not
            the shape — it is the output.
          </p>
        </div>

        <div className="tf__stage fade" style={{ '--i': 4 } as React.CSSProperties}>
          <DotCanvas
            key={solo ? 'solo' : 'row'}
            scene={scene}
            label="Three dot-matrix figures progressing from a held stance to a full running stride."
          />
          <div className="tf__marks" aria-hidden="true">
            {(solo ? STAGES.slice(-1) : STAGES).map((s) => (
              <span className="mono" key={s.week}>
                {s.week}
              </span>
            ))}
          </div>
        </div>

        <div className="tf__data">
          <table className="tf__table">
            <caption className="vh">Movement metrics by training week</caption>
            <thead>
              <tr>
                <th scope="col" className="mono">
                  Metric
                </th>
                {STAGES.map((s) => (
                  <th scope="col" className="mono" key={s.week}>
                    {s.week}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={r.key} className="line" style={{ '--i': 5 + i } as React.CSSProperties}>
                  <th scope="row">
                    <span className="tf__rowlabel">{r.label}</span>
                    <span className="mono tf__unit">{r.unit}</span>
                  </th>
                  {STAGES.map((s) => (
                    <td key={s.week} className="metric">
                      {s[r.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <aside className="tf__delta line" style={{ '--i': 8 } as React.CSSProperties}>
            <span className="display tf__delta-value">+72%</span>
            <span className="mono">mean power output · 24 weeks</span>
            <span className="mono tf__foot">Illustrative cohort</span>
          </aside>
        </div>
      </div>
    </section>
  );
}
