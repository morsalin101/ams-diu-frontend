import katex from 'katex';
import 'katex/dist/katex.min.css';

/**
 * Renders a string that may contain inline LaTeX delimited by single `$...$`.
 * Math segments are rendered with KaTeX; everything else is plain text.
 * Used only in the AI Question Scrapper preview.
 */
export function MathText({ text, className }: { text?: string | null; className?: string }) {
  const value = text ?? '';
  if (!value) return <span className={className} />;

  // Split on $...$ while keeping the delimiters' content. Escaped \$ is left as literal.
  const segments = value.split(/(\$[^$]+\$)/g);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.length > 1 && seg.startsWith('$') && seg.endsWith('$')) {
          const expr = seg.slice(1, -1);
          try {
            const html = katex.renderToString(expr, {
              throwOnError: false,
              displayMode: false,
            });
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch {
            return <span key={i}>{seg}</span>;
          }
        }
        return <span key={i}>{seg}</span>;
      })}
    </span>
  );
}

export default MathText;
