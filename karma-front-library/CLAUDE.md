# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Frontend for **KM.Library** (Karma Corp system), part of the `karma-library` monorepo. A personal
collection tracker for manga/manhwa/manhua/comics/books: series (`Obra`), owned volumes, and
per-volume covers stored as uploaded files (not external URLs). The sibling `karma-api-library`
package uses NestJS, Prisma and SQLite. Electron starts it on `127.0.0.1:3344`; the same compiled
frontend can be served by a central LAN/NAS instance. See `../README.md` for the full architecture.

## Commands

```bash
npm install
npm run dev       # Vite dev server on :5173, proxies /api and /uploads to localhost:3000
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

There is no test suite or linter configured in this package yet.

The backend must be running (`cd ../karma-api-library && npm run start:dev`) for Vite development.
Packaged Electron and Docker LAN builds serve the compiled frontend directly from NestJS.

## Architecture

**Stack:** Vue 3 (`<script setup>` + TypeScript), Vite, `vue-router`, `lucide-vue-next` for icons.
No Pinia, no CSS framework, no UI component library.

**Data flow — single module-level store, no Pinia:**
`src/stores/obras.ts` holds `obras`/`loading`/`error` as module-scope `ref`s created once at import
time. `useObrasStore()` is a plain function returning those same refs, not a composable that creates
fresh state per call — every component sees the same shared data. Components mutate the list via
`store.upsert(obra)` / `store.remove(id)` after an API call resolves; there's no reactivity magic
tying API responses back into the store automatically.

**API client (`src/api/client.ts`) is the single source of truth for domain types and constants** —
`FormatType`, `ReadingStatus`, `VolumeStatus`, `Obra`, `Volume`, plus the lookup arrays `FORMATS`,
`STATUSES`, `VOLUME_STATUSES`, `LANGUAGES`, `SUGGESTED_GENRES`. Every request goes through the
`request<T>()` helper (JSON by default, switches to raw `FormData` for cover uploads) and the `api.*`
methods. Any new field on `Obra`/`Volume` or new endpoint should be added here first.

**Format color coding must come from `FORMAT_COLORS` (in `client.ts`), never hardcoded per-component.**
Home, Library, Shelves, and `WorkCard` all key off this map (and the matching `--fmt-*` CSS custom
properties in `style.css`) so a format's color stays consistent everywhere. If you add a format-aware
UI element, read from `FORMAT_COLORS`/the CSS vars instead of picking a new color.

**Modal opened via provide/inject, not routing or a global store:** `AppShell.vue` owns `modalOpen`/
`editingObra` state and `provide('openWorkModal', openEdit)`. Views inject it with
`inject<(o) => void>('openWorkModal')` to open the add/edit modal for a given `Obra` (or `null` for
create mode) without prop-drilling through the router views.

**Routing (`src/router/index.ts`):** flat route table, lazy-loaded views. Sections not yet built
(Discover, Authors and Tags) point at the shared
`ComingSoonView.vue` placeholder rather than fabricated data — keep new unimplemented sections on
that same pattern instead of inventing content for them.

**Styling:** one global `src/style.css`, no scoped/CSS-modules convention in use. Dark theme only,
driven entirely by CSS custom properties defined in `:root` (`--bg`, `--surface`, `--accent`, the
`--fmt-*` palette, spacing/radius tokens). Class names are flat and semantic (`.work-card`,
`.filter-radio`, `.modal-footer`) rather than component-scoped — when adding a component, check
`style.css` first for an existing class before introducing a new one.

**Intentional placeholders:** search for `TODO(assets)` for spots waiting on real design assets
(brand mark in `Sidebar.vue`, decorative illustrations, user avatar in `Topbar.vue` — there's no auth
system yet, so the avatar is a stand-in). These are deliberate, not TODOs to silently "fix" by
removing.

**Dev vs. prod API access differ:** in dev, Vite's proxy (`vite.config.ts`) forwards `/api` and
`/uploads` to `localhost:3000`. In prod, the same paths are proxied by `nginx.conf` to the
`karma-api-library` container hostname. `api/client.ts` always calls relative `/api/...` paths so it
works unchanged in both.
