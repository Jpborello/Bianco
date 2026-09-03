# ADR-001: Rediseño UI/UX responsive de Mixtura de Sabores

**Status:** Accepted
**Date:** 2026-09-03
**Deciders:** Juampi (cliente/dueño del proyecto)

## Context

"Mixtura de Sabores" es una demo de sistema de pedidos gastronómicos (Next.js 16 + React 19 + Supabase) con 3 pantallas: landing/menú con delivery (`src/app/page.tsx`, ~1000 líneas), pedido por QR desde la mesa (`src/app/mesa/[id]/page.tsx`, ~1450 líneas, uso 100% mobile) y panel de administración para mozo/dueño (`src/app/admin/page.tsx`, ~3466 líneas). Tailwind v4 está instalado pero prácticamente no se usa: las tres pantallas son componentes monolíticos con estilos inline (`style={{...}}`) repetidos cientos de veces, sin breakpoints consistentes más allá de un par de media queries en `globals.css`. El panel admin usa `alert()`/`confirm()` nativos del navegador 24 veces para feedback y confirmaciones. No hay componentes compartidos (botones, modales, badges se reescriben en cada archivo).

Restricciones: es una demo (no hay presupuesto para reescribir arquitectura de datos/estado ni agregar tests); no hay que tocar seguridad/auth; hay que preservar toda la lógica de negocio existente (Supabase + fallback a `mockData` cuando no hay conexión).

## Decision

1. **Mantener la identidad de marca actual** (dorado/terracota/crema, tipografía Playfair Display + Outfit) pero formalizarla como tokens semánticos en `globals.css` (`--color-*`, `--space-*`, `--radius-*`) con soporte real de modo oscuro, en vez de reinventar la paleta.
2. **Migrar de inline-styles a utilidades Tailwind mobile-first** (`sm:` `md:` `lg:`) en los tres archivos de página, eliminando los `style={{}}` salvo casos que realmente lo requieran (valores dinámicos).
3. **Extraer un set mínimo de componentes compartidos** en `src/components/ui.tsx`: `Button`, `IconButton`, `Modal`/`Drawer`, `Toast`/`ToastProvider`, `ConfirmDialog`, `Badge`, `EmptyState`, `Skeleton`. Estos reemplazan los 24 `alert()/confirm()` del admin y la duplicación de botones/badges en las 3 páginas.
4. **Panel admin: navegación adaptativa** — rail lateral fijo en desktop/tablet (≥768px), tabs horizontales con scroll + botón "más" en mobile. Las tablas de pedidos/productos/mesas pasan a lista de tarjetas apiladas en mobile (<768px) en vez de `<table>` con scroll horizontal forzado.
5. **No se toca** la capa de datos (`dbActions.ts`, `supabase.ts`, `mockData.ts`) ni el esquema — solo el consumo desde la UI.

## Options Considered

### Opción A: Reescritura completa a Next.js App Router idiomático (server components, carpetas por feature, estado con Zustand/Context)
| Dimensión | Evaluación |
|---|---|
| Complejidad | Alta |
| Costo (tiempo) | Alto — reescribe lógica que hoy funciona |
| Riesgo de romper la demo | Alto |
| Beneficio marginal para el pedido (UI/UX) | Bajo respecto al costo |

**Pros:** arquitectura más "correcta" a largo plazo.
**Contras:** el usuario pidió mejoras de UI/UX, no una reingeniería; alto riesgo de introducir bugs en una demo que ya funciona con datos reales/mock.

### Opción B (elegida): Refactor UI in-place — mismos archivos de página, mismo estado/lógica, solo se rehace el markup con Tailwind + componentes compartidos + responsive real
| Dimensión | Evaluación |
|---|---|
| Complejidad | Media |
| Costo (tiempo) | Medio, acotado |
| Riesgo de romper la demo | Bajo — la lógica de datos no se toca |
| Beneficio marginal para el pedido | Alto — ataca exactamente lo pedido |

**Pros:** menor riesgo, foco 100% en lo pedido, reutilizable de inmediato.
**Contras:** los 3 archivos de página siguen siendo grandes (aunque más limpios); no resuelve deuda técnica de arquitectura de estado.

### Opción C: Solo agregar media queries sueltas sin tocar componentes
**Contras:** no resuelve inconsistencia visual ni reemplaza alert()/confirm(); descartada por no cumplir "muy intuitiva y comprensiva".

## Trade-off Analysis

Se prioriza velocidad y bajo riesgo sobre pureza arquitectónica: el pedido explícito es UI/UX + responsive + intuitividad, no una migración de arquitectura. Extraer componentes compartidos da la mayor parte del beneficio de mantenibilidad ("comprensivo") sin el riesgo de tocar la lógica de pedidos/facturación.

## Consequences

- Se vuelve mucho más fácil mantener consistencia visual (cambiar un botón lo cambia en todos lados).
- El código sigue teniendo 3 archivos de página grandes; una futura iteración podría partir el admin en subcomponentes por pestaña.
- Los `alert()/confirm()` nativos desaparecen — comportamiento de confirmación pasa a ser asíncrono vía modal, requiere revisar cada call site.
- Cualquier estilo custom que dependía de un valor pixel-perfect específico puede variar levemente al pasar a la escala de espaciado de Tailwind.

## Action Items

1. [x] Definir tokens de diseño y modo oscuro en `globals.css`.
2. [x] Crear `src/components/ui.tsx` con Button/Modal/Toast/ConfirmDialog/Badge/EmptyState/Skeleton.
3. [x] Reescribir `src/app/page.tsx` mobile-first con los componentes compartidos.
4. [x] Reescribir `src/app/mesa/[id]/page.tsx` mobile-first (uso 100% celular).
5. [x] Reescribir `src/app/admin/page.tsx`: nav adaptativa + tablas→tarjetas en mobile + reemplazo de alert/confirm.
6. [x] Verificar `tsc --noEmit` / build y corregir errores de tipos.
7. [x] Subir cambios a la carpeta del usuario.
