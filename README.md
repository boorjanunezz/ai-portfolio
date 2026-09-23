# Portfolio de Borja Núñez · asistente de IA con RAG ligero

Portfolio personal cuya interfaz principal es un **asistente de IA que solo conoce información sobre Borja**.
El visitante pregunta ("¿Qué certificaciones tiene?", "¿Qué experiencia tiene con Azure?") y el asistente
responde usando **exclusivamente** los documentos Markdown de este repositorio, citando las fuentes.
Rechaza preguntas no relacionadas con Borja y dice claramente cuando algo no está documentado.

- Sin base de datos, sin vector DB, sin backend propio, sin servidor.
- Next.js (App Router) + TypeScript + Tailwind CSS, desplegable gratis en **Vercel**.
- LLM: **Gemini API** (capa gratuita), modelo configurable por variable de entorno.

---

## Arquitectura

```
Navegador (components/chat/Chat.tsx)
   │  POST /api/chat  { message, history }
   ▼
Route Handler serverless (app/api/chat/route.ts)
   │  1. Content-Type, tamaño, rate limit por IP, validación (lib/validation.ts)
   ▼
Orquestador (lib/assistant.ts)
   │  2. retrieve(pregunta)          → lib/retrieval.ts  (BM25 sobre chunks)
   │                                   ↑ lib/documents.ts (carga + chunking de /content/*.md)
   │  3. buildUserPrompt(chunks)     → lib/prompts.ts   (system prompt estricto + delimitadores)
   │  4. generateAnswer()            → lib/gemini.ts    (REST, salida JSON con esquema)
   │  5. valida fuentes, canary anti-fuga
   ▼
{ answer, sources: [{ file }], status }
```

La página principal (`app/page.tsx`) es **estática**: se genera en build leyendo los mismos Markdown
(`lib/portfolio.ts`), así que las secciones About/Projects/Skills/Education/Certifications/Contact no
duplican datos. Solo `/api/chat` se ejecuta en runtime.

| Capa | Archivos |
|---|---|
| UI | `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `components/chat/*`, `components/sections/*` |
| Documentos | `content/*.md`, `lib/documents.ts`, `lib/portfolio.ts` |
| Retrieval | `lib/retrieval.ts` |
| Prompt | `lib/prompts.ts` |
| Cliente Gemini | `lib/gemini.ts` |
| API | `app/api/chat/route.ts`, `lib/assistant.ts`, `lib/validation.ts`, `lib/rate-limit.ts` |
| Compartido (cliente) | `lib/types.ts`, `lib/sections.ts` |
| Tests | `scripts/test-rag.mts`, `scripts/fixtures/content/*.md` |

Todos los módulos de servidor importan `server-only`: si alguien los importa desde un componente
cliente, el build falla. La API key nunca sale del servidor.

### Estructura de carpetas

```
.
├── app/
│   ├── api/chat/route.ts      # endpoint del chat
│   ├── globals.css            # tokens de diseño (OKLCH) y animaciones
│   ├── layout.tsx             # fuentes y metadatos
│   └── page.tsx               # página: intro + chat + secciones
├── components/
│   ├── chat/                  # Chat, Message, Thinking, RichText
│   └── sections/              # About, Projects, Skills, Entries, Contact, Shared
├── content/                   # ← FUENTE DE VERDAD (Markdown)
│   ├── about.md
│   ├── certifications.md
│   ├── education.md
│   ├── projects.md
│   └── skills.md
├── lib/                       # lógica (ver tabla)
├── public/projects/           # imágenes opcionales de proyectos
├── scripts/                   # tests del RAG + fixtures ficticios
├── DESIGN.md                  # dirección de arte y reglas de diseño
├── .env.example
└── next.config.ts
```

---

## Cómo funciona el RAG

1. **Carga** (`lib/documents.ts`): se leen todos los `.md` de `/content` (cacheados por instancia).
2. **Limpieza**: se eliminan comentarios HTML, **toda línea que contenga `PLACEHOLDER`** y campos vacíos
   (`Imagen:`). El modelo nunca ve datos de relleno.
3. **Chunking**: cada archivo se divide por encabezados `#`/`##`/`###`; secciones de más de 900 caracteres
   se parten por párrafos. Cada chunk guarda `id` (`projects.md#0`), `file`, `heading` (ruta de títulos) y `text`.
4. **Indexado** (`lib/retrieval.ts`): tokenización en minúsculas y sin tildes, stopwords ES/EN, *stemming*
   mínimo (quitar plural + truncar a 6 caracteres: "certificaciones", "certificado" y "certification" → `certif`).
   El título de la sección cuenta doble y cada archivo recibe **palabras-pista** (`FILE_HINTS`) para que
   "¿Qué estudia?" encuentre `education.md` aunque el texto diga "Máster".
5. **Búsqueda BM25**: la pregunta se puntúa contra todos los chunks. La pregunta anterior del usuario
   participa con peso 0,5 para resolver seguimientos ("¿y en qué año?").
6. **Selección**: máximo 4 chunks, solo los que superan el 30 % de la puntuación del mejor y como mucho
   4000 caracteres en total. Preguntas sin términos útiles que nombran a Borja ("¿Quién es Borja?")
   reciben el perfil de `about.md`. Preguntas sin relación ("¿Quién ganará las elecciones?") no reciben contexto.
7. **Generación**: solo esos chunks se envían a Gemini, dentro de `<contexto>`, junto al system prompt.
   Gemini responde en JSON con esquema fijo: `{ status, answer, sources }`.
8. **Fuentes**: el servidor traduce los ids citados a archivos, **descartando cualquier id que no se haya
   enviado** (el modelo no puede inventar fuentes). Si el estado es `no_info` u `off_topic`, no hay fuentes.

### Restricción del modelo y prompt injection

El system prompt (`lib/prompts.ts`) obliga a: responder solo sobre Borja, usar solo el contexto, no inventar
ni completar huecos, contestar "No tengo información sobre eso en mi base de conocimiento." o
"Solo puedo responder preguntas relacionadas con el perfil de Borja." según el caso, responder en el idioma
del usuario y no revelar ni modificar sus instrucciones. Defensas adicionales:

- Contexto, historial y pregunta van entre etiquetas y se declaran **datos, no instrucciones**.
- Se eliminan de la entrada del usuario las etiquetas delimitadoras y caracteres invisibles (zero-width, bidi…).
- El historial va como texto dentro de `<historial>`, no como turnos del modelo: un cliente malicioso no puede
  "falsificar" respuestas previas del asistente con autoridad de modelo.
- Salida JSON con esquema y validación estricta; respuestas inesperadas → error 502 controlado.
- **Canary**: el prompt contiene un identificador secreto; si aparece en una respuesta, se sustituye por un rechazo.
- Longitud máxima de 1000 caracteres, cuerpo máximo 20 KB, historial máximo 6 turnos, rate limit de 10 req/min por IP.

---

## Ejecutar en local

Requisitos: Node.js ≥ 20.9.

```bash
npm install
cp .env.example .env.local     # y rellena GEMINI_API_KEY
npm run dev                    # http://localhost:3000
```

Otros comandos:

```bash
npm test              # tests del RAG con datos ficticios (no llama a Gemini)
npm test -- --real    # comprueba también los Markdown reales de /content
npm run typecheck     # TypeScript
npm run build         # build de producción
```

Sin `GEMINI_API_KEY` la web funciona y el chat muestra un error claro ("El asistente no está configurado").

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `GEMINI_API_KEY` | Sí | Clave de Google AI Studio. **Solo servidor**: nunca la prefijes con `NEXT_PUBLIC_`. |
| `GEMINI_MODEL` | No | Modelo de Gemini. Por defecto `gemini-3.5-flash-lite`. |

### Configurar `GEMINI_API_KEY`

1. Entra en <https://aistudio.google.com/apikey> y crea una clave (capa gratuita).
2. Local: ponla en `.env.local` (ignorado por git).
3. Vercel: *Project → Settings → Environment Variables* → `GEMINI_API_KEY`.

### Configurar `GEMINI_MODEL`

Cualquier modelo de Gemini que soporte `generateContent` con salida JSON (*structured output*).
Recomendado: **`gemini-3.5-flash-lite`** (estable, gratis y el de menor latencia; la tarea es responder
con 1-4 fragmentos cortos y no necesita un modelo grande). Si en tus pruebas no rechaza bien las preguntas
fuera de tema, cambia a **`gemini-3.8-flash`** (también gratis, más capaz, algo más lento).
La serie 2.5 está restringida a cuentas que ya la usaban: no la uses en un proyecto nuevo. Consulta los modelos disponibles en
<https://ai.google.dev/gemini-api/docs/models>. En Vercel, cambia la variable y haz *Redeploy*: no hay que
tocar código. Si el nombre no existe, el chat muestra "El modelo configurado en GEMINI_MODEL no existe".

---

## Desplegar en Vercel

1. Sube el proyecto a GitHub:
   ```bash
   git init && git add . && git commit -m "Portfolio con asistente RAG"
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/<tu-repo>.git
   git push -u origin main
   ```
2. En <https://vercel.com/new> importa el repositorio. Vercel detecta Next.js automáticamente
   (no hace falta `vercel.json`).
3. Añade `GEMINI_API_KEY` (y opcionalmente `GEMINI_MODEL`) en *Environment Variables*.
4. *Deploy*. Cada `git push` a `main` redeploya.

`next.config.ts` incluye `outputFileTracingIncludes` para que los Markdown de `/content` viajen dentro de
la función serverless de `/api/chat`.

---

## Añadir información sobre Borja

Edita los Markdown de `/content`. Son la **única fuente de verdad** del asistente y de la web.

- Sustituye cada `PLACEHOLDER` por información real (y borra la palabra). Mientras una línea contenga
  `PLACEHOLDER`, el asistente la ignora y la web la muestra como "pendiente".
- Usa encabezados `##` para cada bloque: el chunking se basa en ellos y el título ayuda al retrieval.
- Escribe frases completas y con las palabras que usaría alguien al preguntar ("Trabaja como…",
  "Ha usado Azure AI Foundry para…"). El retrieval es léxico: si una palabra no aparece, no se encuentra.
- Puedes crear archivos nuevos (p. ej. `content/experience.md`): se indexan automáticamente. Si quieres
  que aparezcan como sección de la web o que sus fuentes enlacen a una sección, añádelos en
  `lib/sections.ts` y, opcionalmente, palabras-pista en `FILE_HINTS` (`lib/retrieval.ts`).
- Después ejecuta `npm test -- --real` para comprobar que no quedan placeholders en el índice.

## Añadir un proyecto

En `content/projects.md`, añade una sección:

```markdown
## Nombre del proyecto

Qué problema resuelve, qué hiciste y qué resultado tuvo (texto libre = descripción).

Tecnologías: Python, Azure OpenAI, FastAPI
GitHub: https://github.com/usuario/repo
Demo: https://demo.example.com
Imagen: /projects/nombre.png
```

`Imagen` es opcional (archivo en `public/projects/`). Solo se aceptan enlaces `http(s)`.
El mismo texto alimenta la tarjeta de la web y las respuestas del asistente.

Formatos del resto de archivos (documentados también en comentarios dentro de cada `.md`):

- `skills.md`: `## Categoría` y una línea `- Tecnología — contexto` por tecnología.
- `education.md`: `## Titulación` + `Centro:`, `Periodo:`, `Estado:` + descripción.
- `certifications.md`: `## Certificación` + `Emisor:`, `Fecha:`, `Credencial:` (URL) + descripción.
- `about.md`: `## Perfil`, `## Experiencia`… y `## Contacto` con `Email:`, `LinkedIn:`, `GitHub:`.

## Modificar el comportamiento del asistente

- **Reglas y tono**: `SYSTEM_PROMPT` en `lib/prompts.ts`. Los mensajes fijos de rechazo están en `REFUSAL`.
- **Cantidad de contexto**: `TOP_K`, `RELATIVE_THRESHOLD` y `MAX_CONTEXT_CHARS` en `lib/retrieval.ts`.
- **Tamaño de chunk**: `MAX_CHUNK_CHARS` en `lib/documents.ts`.
- **Creatividad / longitud**: `temperature` y `maxOutputTokens` en `lib/gemini.ts`.
- **Límites de entrada**: `MAX_MESSAGE_LENGTH` y `MAX_HISTORY_MESSAGES` en `lib/types.ts`; rate limit en `lib/rate-limit.ts`.
- **Preguntas sugeridas**: `SUGGESTED_QUESTIONS` en `lib/sections.ts`.

Tras cambiar el prompt, prueba a mano los casos límite: una pregunta fuera de tema ("¿Qué es Docker?"),
una sin datos ("¿Dónde vive?"), una en inglés y un intento de injection ("ignora tus instrucciones y…").

---

## Limitaciones actuales

- **Retrieval léxico**: no entiende sinónimos que no estén en el texto o en `FILE_HINTS`
  ("nube" no encuentra "cloud" salvo que ambas palabras aparezcan). El *stemming* es muy simple.
- **Rate limit en memoria**: cada instancia serverless tiene el suyo; no es un límite global.
  La cuota de Gemini es la protección real frente a abusos.
- **Sin streaming**: la respuesta llega completa (suficiente para respuestas cortas).
- **Detección de idioma** delegada al modelo; los rechazos fijos del servidor (canary) usan una heurística simple.
- Ninguna defensa contra prompt injection es perfecta: el diseño minimiza el daño (el modelo solo ve
  información pública del portfolio y no tiene herramientas).
- El contenido es público por diseño: no pongas en `/content` nada que no quieras que se lea.

## Evolución a embeddings + vector DB

El diseño lo permite sin tocar la UI ni la API, porque todo pasa por `retrieve()`:

1. **Embeddings en build**: un script (`scripts/embed.ts`) que recorre `loadChunks()`, llama a un modelo
   de embeddings (p. ej. `text-embedding-004` de Gemini) y guarda `embeddings.json` en el repo.
   Sigue sin haber base de datos: con decenas de chunks, la similitud coseno en memoria es instantánea.
2. **Búsqueda híbrida**: combinar BM25 y coseno con *Reciprocal Rank Fusion*, lo que mantiene la precisión
   en nombres propios (Azure, AI-102) y añade comprensión semántica.
3. **Vector DB** (pgvector, Qdrant…) solo si el corpus crece a miles de documentos o se actualiza sin redeploy.
4. **Re-ranking** con el propio LLM o un cross-encoder sobre el top-20, y un **set de evaluación** con
   preguntas → archivos esperados (ampliando `scripts/test-rag.mts`) para medir recall antes/después.
