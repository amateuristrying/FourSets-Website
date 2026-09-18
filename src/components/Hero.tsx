import DotCanvas from './DotCanvas';
import Wordmark from './Wordmark';
import { runnerScene } from '../lib/dotfield/scenes';
import { useReveal } from '../lib/hooks';
import './Hero.css';

/** Module scope keeps the factory identity stable across renders. */
const scene = () => runnerScene();

export default function Hero() {
  const { ref, className } = useReveal(0.02);

  return (
    <section id="top" className="hero" ref={ref}>
      <div className={`hero__grid ${className}`}>
        <div className="hero__field">
          <DotCanvas
            scene={scene}
            fade
            label="A runner mid-stride, drawn as a field of circular dots that assemble around the moving body."
          />
        </div>

        <h1 className="hero__mark fade" style={{ '--delay': '260ms' } as React.CSSProperties}>
          <Wordmark stagger title="FourSets" />
        </h1>

        <div className="hero__meta">
          <span className="mono fade" style={{ '--i': 7 } as React.CSSProperties}>
            Est. MMXXVI
          </span>
          <a className="hero__cue fade" href="#vision" style={{ '--i': 8 } as React.CSSProperties}>
            <span className="mono">Scroll</span>
            <span className="hero__cue-track" aria-hidden="true" />
          </a>
          <span className="mono hero__meta-end fade" style={{ '--i': 9 } as React.CSSProperties}>
            180 spm / 4 sets
          </span>
        </div>
      </div>
    </section>
  );
}
