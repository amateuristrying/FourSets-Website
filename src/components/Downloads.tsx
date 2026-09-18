import { useReveal } from '../lib/hooks';

/** Store links are placeholders: the product is a design exercise. */
const STORES = [
  { name: 'App Store', platform: 'iOS 17+', href: '#' },
  { name: 'Google Play', platform: 'Android 12+', href: '#' },
];

export default function Downloads() {
  const { ref, className } = useReveal(0.16);

  return (
    <section id="downloads" className="section downloads" ref={ref}>
      <div className={`shell dl__inner ${className}`}>
        <p className="eyebrow line">04 — Downloads</p>

        <h2 className="display display--xl dl__head">
          <span className="mask-line">
            <span className="line" style={{ '--i': 1 } as React.CSSProperties}>
              Train
            </span>
          </span>
          <span className="mask-line">
            <span className="line" style={{ '--i': 2 } as React.CSSProperties}>
              differently<em>.</em>
            </span>
          </span>
        </h2>

        <ul className="dl__list">
          {STORES.map((s, i) => (
            <li key={s.name} className="dl__row line" style={{ '--i': 3 + i } as React.CSSProperties}>
              <a
                href={s.href}
                className="dl__link"
                onClick={(e) => e.preventDefault()}
              >
                <span className="rule wipe" />
                <span className="dl__name">{s.name}</span>
                <span className="mono dl__platform">{s.platform}</span>
                <span className="dl__arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>

        <p className="mono dl__note line" style={{ '--i': 5 } as React.CSSProperties}>
          Free to start · No ads · Four sets
        </p>
      </div>
    </section>
  );
}
