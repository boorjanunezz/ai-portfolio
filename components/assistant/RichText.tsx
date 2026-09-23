import { Fragment, type ReactNode } from "react";

/**
 * Markdown mínimo para las respuestas: párrafos, listas "- " y **negrita**.
 * Construye nodos React (sin dangerouslySetInnerHTML), así que no hay riesgo de XSS.
 * `caret`: cursor parpadeante al final del texto mientras llega en streaming.
 */
export function RichText({ text, caret = false }: { text: string; caret?: boolean }) {
  const blocks = text.trim().split(/\n\s*\n/);
  const cursor = caret ? <Caret /> : null;
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        const last = i === blocks.length - 1;
        const lines = block.split("\n").filter((l) => l.trim());
        const isList = lines.length > 0 && lines.every((l) => /^\s*[-*•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="flex flex-col gap-1">
              {lines.map((line, j) => (
                <li key={j} className="relative pl-4 before:absolute before:left-0 before:text-ink-faint before:content-['–']">
                  {inline(line.replace(/^\s*[-*•]\s+/, ""))}
                  {last && j === lines.length - 1 && cursor}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {inline(lines.join(" "))}
            {last && cursor}
          </p>
        );
      })}
    </div>
  );
}

function Caret() {
  return <span aria-hidden className="ml-0.5 inline-block h-[1em] w-[7px] animate-blink bg-accent align-[-0.15em]" />;
}

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
