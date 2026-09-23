/** Indicador de generación: muestra los documentos en los que busca el asistente. */
export function Thinking({ files }: { files: string[] }) {
  return (
    <div className="-mt-6 animate-message" role="status">
      <p className="mb-2 text-sm text-ink-soft">Buscando en la base de conocimiento…</p>
      <ul aria-hidden className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.8125rem] text-ink-faint">
        {files.map((file, i) => (
          <li key={file} className="animate-scan" style={{ animationDelay: `${i * 180}ms` }}>
            {file}
          </li>
        ))}
      </ul>
    </div>
  );
}
