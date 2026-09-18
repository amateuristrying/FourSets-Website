import { WORDMARK } from '../lib/wordmark';

interface Props {
  className?: string;
  /** Reveals the glyphs one after another when the host carries `is-in`. */
  stagger?: boolean;
  title?: string;
}

export default function Wordmark({ className = '', stagger = false, title }: Props) {
  return (
    <svg
      className={`wordmark ${stagger ? 'wordmark--stagger' : ''} ${className}`}
      viewBox={WORDMARK.viewBox}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <g fill="currentColor">
        {WORDMARK.glyphs.map((g, i) => (
          /* The offset lives on a wrapper: a CSS transform on the path itself
             would override the transform attribute instead of composing. */
          <g key={`${g.char}-${i}`} transform={`translate(${g.x} 0)`}>
            <path d={g.d} style={stagger ? ({ '--i': i } as React.CSSProperties) : undefined} />
          </g>
        ))}
      </g>
    </svg>
  );
}
