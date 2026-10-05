import { useEffect, useMemo, useState } from 'react';
import DotCanvas from './DotCanvas';
import { exerciseScene } from '../lib/dotfield/exercises';
import { useReducedMotion, useReveal } from '../lib/hooks';
import { decodeExercises } from '../lib/referenceExercises';

const motionSource = new URL('../assets/exercises.bin', import.meta.url).href;
const EXERCISES = [
  { index: 0, name: 'Push-up', description: 'A circle-matrix athlete lowers into a push-up, then presses back to a plank.' },
  { index: 1, name: 'Seated press', description: 'A seated circle-matrix athlete raises and lowers two dumbbells overhead.' },
  { index: 2, name: 'Pull-up', description: 'A circle-matrix athlete lifts and lowers their body beneath a fixed pull-up bar.' },
] as const;

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
  const reduced = useReducedMotion();
  const [fields, setFields] = useState<Uint8Array>();

  useEffect(() => {
    if (reduced) return;
    const controller = new AbortController();
    fetch(motionSource, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Exercise reference unavailable');
        return response.arrayBuffer();
      })
      .then(buffer => {
        if (!controller.signal.aborted) {
          setFields(decodeExercises(new Uint8Array(buffer)));
        }
      })
      // Inline circle poses remain visible during loading or a failed request.
      .catch(() => {});
    return () => controller.abort();
  }, [reduced]);

  const scenes = useMemo(
    () => EXERCISES.map(({ index }) => () => exerciseScene(index, fields)),
    [fields],
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
            Progress, one repetition at a time. Push, press, pull. Twenty-four weeks of showing up,
            measured in what you can do.
          </p>
        </div>

        <div className="tf__exercises fade" style={{ '--i': 4 } as React.CSSProperties}>
          {EXERCISES.map((exercise, index) => (
            <figure className="tf__exercise" key={exercise.name}>
              <figcaption className="mono tf__mark">
                {STAGES[index].week}<span className="vh"> — {exercise.name}</span>
              </figcaption>
              <div className="tf__stage">
                <DotCanvas scene={scenes[index]} label={exercise.description} />
              </div>
            </figure>
          ))}
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
