import Wordmark from './Wordmark';
import { NAV_LINKS } from './Nav';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="shell footer__inner">
        <span className="rule" />
        <div className="footer__cols">
          <a className="footer__mark" href="#top" aria-label="FourSets — back to top">
            <Wordmark />
          </a>

          <nav aria-label="Footer">
            <ul className="footer__links">
              {NAV_LINKS.map((l) => (
                <li key={l.id}>
                  <a className="link" href={`#${l.id}`}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mono footer__legal">
            © MMXXVI FourSets
            <br />
            Movement, measured.
          </p>
        </div>
      </div>
    </footer>
  );
}
