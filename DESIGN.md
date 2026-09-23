# DESIGN.md — Portfolio de Borja Núñez

## Dirección de arte
Estilo: editorial técnico. Un documento impreso con alma de consola: papel cálido, tinta, notas al pie.
Se debe sentir: preciso, sereno, fiable.        NO puede parecer: plantilla SaaS, "IA mágica" violeta, dashboard.
Gesto memorable: la conversación se lee como una entrevista anotada. Mientras el asistente piensa se ve
qué archivos está leyendo, y cada respuesta lleva sus fuentes como notas al pie que saltan a la sección
correspondiente del portfolio.

## Tokens (app/globals.css)
Primitivos OKLCH → semánticos. Los componentes solo usan semánticos:
--color-bg (papel) / --color-surface (hoja del chat) / --color-ink / --color-ink-soft / --color-ink-faint /
--color-rule (filetes) / --color-accent (señal, solo UI y elementos grandes) / --color-accent-ink (acento para texto, ≥4.5:1)
Espaciado: 4 8 12 16 24 32 48 64 96 128 (Tailwind 1 2 3 4 6 8 12 16 24 32)
Radios: 4px. Sombras: ninguna. Elevación: solo por color de superficie (hoja blanca sobre papel).
Tipografía: titular Instrument Serif (itálica para énfasis), UI/cuerpo Geist, nombres de archivo en Geist Mono
(misma superfamilia). Escala fluida con clamp().
Movimiento: --dur-fast 140ms, --dur-med 260ms, --dur-reveal 560ms, --ease-out cubic-bezier(.16,1,.3,1). Solo transform/opacity.

## Retícula
12 columnas, gutter 24px, margen clamp(20px,5vw,96px), máx 1280px.
Cabecera: columna lateral de 4 (nombre, índice) + chat de 8. Secciones: etiqueta 3 + contenido 9.
Ruptura intencional: el contacto final ocupa las 12 columnas con el email en tipografía display.

## Reglas duras
- Sin gradientes, sin sombras, sin tarjetas con borde. Listas y filetes horizontales.
- Sin Inter/Poppins/Roboto. Sin emoji como iconos. Sin modo oscuro.
- Estados: reposo, hover, :focus-visible, :active, disabled. Carga, vacío y error diseñados.
- prefers-reduced-motion: sustituir desplazamientos por fundidos.
- Contraste ≥4.5:1 en texto. El color nunca es el único canal de información.
