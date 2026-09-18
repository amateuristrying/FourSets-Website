import { useEffect, useState } from 'react';
import Wordmark from './Wordmark';
import { useActiveSection, useMedia } from '../lib/hooks';
import { onScroll } from '../lib/scroll';
import './Nav.css';

export const NAV_LINKS = [
  { id: 'vision', label: 'Vision' },
  { id: 'mission', label: 'Mission' },
  { id: 'transformations', label: 'Transformations' },
  { id: 'downloads', label: 'Downloads' },
];

const SECTION_IDS = ['top', ...NAV_LINKS.map((l) => l.id)];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);
  const compact = useMedia('(max-width: 860px)');

  useEffect(() => onScroll((y) => setScrolled(y > 20)), []);

  useEffect(() => {
    if (!compact && open) setOpen(false);
  }, [compact, open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <div className="nav__bar">
        <a className="nav__logo" href="#top" aria-label="FourSets — home" onClick={() => setOpen(false)}>
          <Wordmark />
        </a>

        {compact ? (
          <button
            className="nav__toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="nav-menu"
          >
            <span className="nav__toggle-label">{open ? 'Close' : 'Menu'}</span>
            <span className="nav__toggle-mark" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        ) : (
          <nav aria-label="Sections">
            <ul className="nav__links">
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a href={`#${l.id}`} className={active === l.id ? 'is-active' : ''}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {compact ? (
        <nav id="nav-menu" className="nav__sheet" aria-label="Sections" aria-hidden={!open}>
          <ul>
            {NAV_LINKS.map((l, i) => (
              <li key={l.id} style={{ '--i': i } as React.CSSProperties}>
                <a href={`#${l.id}`} onClick={() => setOpen(false)}>
                  <span className="nav__sheet-index">{String(i + 1).padStart(2, '0')}</span>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mono nav__sheet-foot">Four sets. Nothing spare.</p>
        </nav>
      ) : null}
    </header>
  );
}
