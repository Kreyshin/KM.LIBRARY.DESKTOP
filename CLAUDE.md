# CLAUDE.md

Guía de contexto para Claude Code al trabajar en este repositorio (monorepo
`karma-library`). Ver también `README.md` (stack real y cómo levantar el
proyecto) y `karma-front-library/CLAUDE.md` (arquitectura real del frontend,
más autoritativa que este documento para detalles de implementación actuales).

## Qué es Karma Library

**Karma Library** es parte de **Karma Corp Systems** (acrónimo interno:
`KM.Library`, misma convención que otros subsistemas de Karma Corp como
`KM.Gamarra` o `KM.Restaurante`). Es una aplicación web personal para
gestionar una colección de:

- Libros
- Manga
- Manhwa
- Manhua
- Cómics

Permite registrar obras y tomos individuales, administrar portadas (guardadas
como archivos propios, no URLs externas — no depende de hotlinking), llevar
progreso de lectura, notas/reseñas personales, organizar por estantes y
categorías, y ver estadísticas básicas.

**No debe sentirse como:** un ERP, un dashboard financiero, un sistema gamer,
un panel saturado de métricas, o un catálogo genérico.

**Debe sentirse como:** una biblioteca digital premium, oscura y personal,
donde cada obra se organiza como parte de una colección viva — el centro de
la experiencia son las portadas, los estantes, los lomos, el progreso, las
notas y el placer de leer, no las estadísticas.

## Identidad visual (design system de Karma Corp)

- Modo oscuro por defecto, siempre.
- Paleta: negro con matices azul oscuro/violeta, morado como color principal,
  grises oscuros, blanco solo para texto de alta importancia.
- Estética premium, elegante, ligeramente futurista — **sin** neón exagerado
  y **sin** aspecto gamer.
- Glow/resplandor solo en: navegación activa, botones principales, iconos
  importantes, progreso, selección actual. No agregar glow a todas las
  tarjetas ni bordes brillantes por defecto.
- Espacios generosos, bordes sutiles, sombras profundas y suaves, iconos
  lineales consistentes.
- No usar imágenes genéricas de internet salvo portadas reales de obras.
- Tipografía principal: `Inter`; alternativa para títulos: `Manrope`.

Variables de color de referencia (ver también las `--fmt-*` reales ya
definidas en `karma-front-library/src/style.css`):

```css
--bg: #04060D;
--surface: #0A0D14;
--surface-2: #1B1624;
--text: #F3F1F9;
--text-dim: #9A94AE;
--accent: #9F6BFF;
--accent-dim: #7C3AED;
--radius: 14px;
```

Cada **tipo de obra** tiene un acento propio para no volver todo un morado
plano (ya implementado como `FORMAT_COLORS` en `api/client.ts` — leer siempre
de ahí, nunca hardcodear un color de formato en un componente):

```css
--fmt-book: #34D399;    /* libros */
--fmt-manga: #22D3EE;   /* manga */
--fmt-manhwa: #B794FF;  /* manhwa */
--fmt-manhua: #FBBF24;  /* manhua */
--fmt-comic: #F472B6;   /* cómics */
```

### Dos enfoques visuales explorados (decisión tomada)

1. **Dashboard profesional** (estadísticas, tarjetas, gráficos, paneles) —
   gustó pero se consideró demasiado cargado/corporativo.
2. **Biblioteca natural y acogedora** (estantes de madera oscura, lomos,
   iluminación violeta tenue, sensación de santuario de lectura) — **este es
   el enfoque ganador**, especialmente para la vista de estantes (Shelves).

El Home debe balancear pocas métricas principales con más contenido visual
(portadas, accesos rápidos) — evitar que se sienta como un sistema
corporativo de datos.

## Decisiones de UX importantes

**Flujo de obra → tomos (no cambiar sin razón fuerte):**

```
1. Crear la obra
2. Guardar la obra
3. Cambiar automáticamente a la pestaña "Tomos"
4. Agregar los tomos individualmente
5. Continuar agregando tomos cuando sea necesario
```

Explícitamente rechazado: crear automáticamente muchos tomos vacíos, pedir el
total de tomos obligatorio al inicio, o mezclar toda la edición de tomos con
los datos generales de la obra. Razón: muchas series siguen publicándose, el
usuario puede no conocer el total, y cada tomo puede tener portada, fecha,
estado y notas distintas.

**Separación de conceptos de progreso** (no confundir):
- *Adquirido* (propiedad: físico / digital / no adquirido)
- *Leído* / estado de lectura (not started / reading / completed / on hold /
  dropped)

`OWNED` no implica leído — el cálculo de progreso debe basarse en estado de
lectura real, no en propiedad.

**Vista de tomos:** cuadrícula por defecto (navegar, ver portadas, sentir
colección, mejor en móvil) + vista tabla disponible (mejor para edición
masiva de fechas/estados/capítulos).

**Vista Shelves:** estantes horizontales, tomos vistos por el lomo con
portadas frontales intercaladas, agrupados por estado de lectura / formato /
favoritos / colecciones personalizadas. Los lomos pueden generarse
automáticamente (portada + título + número + color dominante) en vez de
buscarse manualmente.

**Modal de obra:** un solo modal con pestañas "Información" y "Tomos", no
pantallas separadas ni un formulario único que mezcle todo.

## Reglas para respuestas de código en este proyecto

- Cuando se pida implementar o modificar un componente, entregar el **archivo
  completo** listo para reemplazar el actual (para `.vue`: `<script setup
  lang="ts">`, `<template>` y `<style scoped>` si aplica) — no fragmentos ni
  parches sueltos.
- Evitar explicaciones largas cuando se pide implementación; señalar solo
  dependencias o incompatibilidades importantes.
- Si se modifica un componente y eso rompe otro relacionado, entregar también
  ese archivo completo.
- Mantener nombres y estructura compatibles con el proyecto existente; no
  inventar APIs sin aclararlo; no eliminar lógica existente sin reemplazarla.
- Mantener TypeScript + Vue 3 + el design system de Karma en todo el frontend.

## Roadmap (orden de prioridad)

**Fase 1** — Home funcional, Library, crear/editar obra, gestión de tomos,
portadas, favoritos, estados. *(mayormente construido, ver
`karma-front-library/CLAUDE.md`)*

**Fase 2** — Shelves con lomos generados, colecciones, wishlist, filtros
avanzados, vista detalle de obra.

**Fase 3** — Reading Log (sesiones de lectura, notas, citas), Statistics,
metas de lectura, Discover (recomendaciones).

Secciones de Fase 3 que aún no tienen datos reales quedan como placeholder
"Próximamente" (`ComingSoonView.vue`) en vez de inventar contenido — ver
`karma-front-library/CLAUDE.md`.

## Nota sobre el origen de este documento

El contenido de este archivo resume un documento de contexto extenso
generado durante una etapa de diseño previa del proyecto (visión de producto,
paleta, UX). Algunos detalles técnicos de esa etapa (p. ej. uso de Pinia)
quedaron obsoletos frente a la implementación real — para arquitectura y
convenciones de código **actuales**, `karma-front-library/CLAUDE.md` manda
sobre este documento en caso de conflicto. Este archivo manda en visión de
producto, identidad visual y decisiones de UX de largo plazo.
