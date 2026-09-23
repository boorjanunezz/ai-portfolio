import type { AnswerStatus, Role, Source } from "@/lib/types";
import { sectionForFile } from "@/lib/sections";
import { RichText } from "./RichText";

export interface UIMessage {
  id: number;
  role: Role;
  content: string;
  sources?: Source[];
  status?: AnswerStatus;
  error?: boolean;
  retry?: string; // pregunta a reenviar si hubo error
}

const STATUS_LABEL: Partial<Record<AnswerStatus, string>> = {
  no_info: "Sin datos en los documentos",
  off_topic: "Fuera del perfil de Borja",
};

export function Message({ message, onRetry }: { message: UIMessage; onRetry: (question: string) => void }) {
  if (message.role === "user") {
    return (
      <li className="animate-message">
        <p className="sr-only">Tu pregunta:</p>
        <p className="max-w-[40ch] font-display text-2xl leading-tight text-ink sm:text-[1.75rem]">{message.content}</p>
      </li>
    );
  }

  if (message.error) {
    return (
      <li className="animate-message -mt-6 flex max-w-[60ch] flex-wrap items-baseline gap-x-4 gap-y-2" role="alert">
        <p className="text-danger">
          <span className="font-medium">Error.</span> {message.content}
        </p>
        {message.retry && (
          <button
            type="button"
            onClick={() => onRetry(message.retry!)}
            className="text-sm font-medium text-ink underline underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-accent-ink active:opacity-70"
          >
            Reintentar
          </button>
        )}
      </li>
    );
  }

  const label = message.status ? STATUS_LABEL[message.status] : undefined;
  return (
    <li className="animate-message -mt-6 max-w-[62ch]">
      <p className="sr-only">Respuesta del asistente:</p>
      {label && <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">{label}</p>}
      <div className={label ? "text-ink-soft" : "text-ink"}>
        <RichText text={message.content} />
      </div>
      {message.sources && message.sources.length > 0 && <Sources sources={message.sources} />}
    </li>
  );
}

function Sources({ sources }: { sources: Source[] }) {
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule pt-3 text-sm">
      <span className="text-ink-faint">Fuentes</span>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {sources.map((s, i) => {
          const section = sectionForFile(s.file);
          const content = (
            <>
              <sup className="mr-1 text-accent-ink">{i + 1}</sup>
              <span className="font-mono text-[0.8125rem]">{s.file}</span>
            </>
          );
          return (
            <li key={s.file}>
              {section ? (
                <a
                  href={`#${section.id}`}
                  title={`Ir a ${section.label}`}
                  className="text-ink-soft underline decoration-rule underline-offset-4 transition-colors duration-[var(--dur-fast)] hover:text-ink hover:decoration-accent"
                >
                  {content}
                </a>
              ) : (
                <span className="text-ink-soft">{content}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
