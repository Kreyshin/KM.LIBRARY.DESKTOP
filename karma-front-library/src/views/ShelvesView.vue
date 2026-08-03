<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LibraryBig,
  LockKeyhole,
  ShoppingBag,
  Minus,
  Plus,
  RotateCcw,
  Rows3,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-vue-next';
import { useObrasStore } from '../stores/obras';
import {
  FORMATS,
  FORMAT_COLORS,
  type Obra,
  type Volume,
} from '../api/client';
import BookSpine from '../components/BookSpine.vue';
import CustomShelvesPanel from '../components/CustomShelvesPanel.vue';
import CollectionFilters from '../components/CollectionFilters.vue';
import { createCollectionFilters, hasActiveCollectionFilters, matchesCollectionFilters } from '../composables/collectionFilters';

type ViewMode = 'covers' | 'spines';

interface WorkShelf {
  obra: Obra;
  volumes: Volume[];
  ownedCount: number;
  readCount: number;
}

const store = useObrasStore();
const openWorkModal = inject<(obra: Obra) => void>('openWorkModal');
const openVolumeModal = inject<(obra: Obra, volume: Volume) => void>('openVolumeModal');

const viewMode = ref<ViewMode>('covers');
const filters = ref(createCollectionFilters());
const shelfFilter = ref<{ id: string; name: string; obraIds: string[] | null; smartType: string | null }>({ id: 'all', name: 'Toda la biblioteca', obraIds: null, smartType: null });

const zoomViewer = ref<{
  obra: Obra;
  volume: Volume;
  src: string;
} | null>(null);

const zoomLevel = ref(1);
const zoomOffset = ref({ x: 0, y: 0 });
const dragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const dragOffsetStart = ref({ x: 0, y: 0 });

onMounted(() => {
  store.load();
  window.addEventListener('keydown', onZoomKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onZoomKeydown);
});

function volumeNumber(volume: Volume) {
  return Number(volume.number) || 0;
}

function isOwned(volume: Volume) {
  return volume.ownership !== 'NOT_OWNED';
}

function isRead(volume: Volume) {
  return volume.read;
}

function volumeCover(obra: Obra, volume: Volume) {
  return volume.alternateCovers?.find((cover) => cover.isPrimary)?.path || volume.coverPath || obra.coverPath || null;
}

function volumeThumbnail(obra: Obra, volume: Volume) {
  const edition = volume.alternateCovers?.find((cover) => cover.isPrimary);
  return edition?.thumbnailPath || edition?.path || volume.thumbnailPath || volume.coverPath || obra.thumbnailPath || obra.coverPath || null;
}

function volumeWithEditionSpine(volume: Volume) {
  const alternateSpine = volume.alternateCovers?.find((cover) => cover.isPrimary)?.spinePath;
  return alternateSpine ? { ...volume, spinePath: alternateSpine } : volume;
}

function openZoomViewer(obra: Obra, volume: Volume, event?: Event) {
  event?.stopPropagation();

  const src = volumeCover(obra, volume);
  if (!src) return;

  zoomViewer.value = { obra, volume, src };
  resetZoom();
}

function closeZoomViewer() {
  zoomViewer.value = null;
  resetZoom();
}

function resetZoom() {
  zoomLevel.value = 1;
  zoomOffset.value = { x: 0, y: 0 };
  dragging.value = false;
}

function changeZoom(amount: number) {
  zoomLevel.value = Math.min(
    4,
    Math.max(1, Number((zoomLevel.value + amount).toFixed(2))),
  );

  if (zoomLevel.value === 1) {
    zoomOffset.value = { x: 0, y: 0 };
  }
}

function onZoomWheel(event: WheelEvent) {
  event.preventDefault();
  changeZoom(event.deltaY < 0 ? 0.2 : -0.2);
}

function beginZoomDrag(event: PointerEvent) {
  if (zoomLevel.value <= 1) return;

  dragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragOffsetStart.value = { ...zoomOffset.value };

  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function moveZoomImage(event: PointerEvent) {
  if (!dragging.value) return;

  zoomOffset.value = {
    x: dragOffsetStart.value.x + event.clientX - dragStart.value.x,
    y: dragOffsetStart.value.y + event.clientY - dragStart.value.y,
  };
}

function endZoomDrag(event: PointerEvent) {
  dragging.value = false;

  const element = event.currentTarget as HTMLElement;
  if (element.hasPointerCapture(event.pointerId)) {
    element.releasePointerCapture(event.pointerId);
  }
}

function onZoomKeydown(event: KeyboardEvent) {
  if (!zoomViewer.value) return;

  if (event.key === 'Escape') closeZoomViewer();
  if (event.key === '+' || event.key === '=') changeZoom(0.2);
  if (event.key === '-') changeZoom(-0.2);
}

function statusLabel(volume: Volume) {
  if (isRead(volume)) return 'Leído';
  if (volume.status === 'READING') return 'Leyendo';
  if (isOwned(volume)) return 'Poseído';
  return 'No adquirido';
}

function isNotOwned(volume: Volume) {
  return volume.ownership === 'NOT_OWNED';
}

function formatLabel(obra: Obra) {
  return FORMATS.find((format) => format.value === obra.tipo)?.label || obra.tipo;
}

const workShelves = computed<WorkShelf[]>(() =>
  store.obras.value
    .filter((obra) => matchesCollectionFilters(obra, { ...filters.value, query: '' }))
    .filter((obra) => obra.volumes.length > 0)
    .map((obra) => {
      const volumes = [...obra.volumes].sort(
        (a, b) => volumeNumber(a) - volumeNumber(b),
      );

      return {
        obra,
        volumes,
        ownedCount: volumes.filter(isOwned).length,
        readCount: volumes.filter(isRead).length,
      };
    })
    .sort((a, b) => a.obra.titulo.localeCompare(b.obra.titulo)),
);

const visibleWorkShelves = computed<WorkShelf[]>(() => {
  const query = filters.value.query.trim().toLocaleLowerCase('es');
  const allowed = shelfFilter.value.obraIds ? new Set(shelfFilter.value.obraIds) : null;

  return workShelves.value
    .filter((shelf) => !allowed || allowed.has(shelf.obra.id))
    .map((shelf) => {
      const workMatches = !query || [shelf.obra.titulo, shelf.obra.autor, ...shelf.obra.genres, ...shelf.obra.tags]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase('es').includes(query));
      let volumes = shelf.volumes.filter((volume) => {
        if (shelfFilter.value.smartType === 'PURCHASE_LIST' && isOwned(volume)) return false;
        if (shelfFilter.value.smartType === 'UNREAD' && volume.read) return false;
        if (shelfFilter.value.smartType === 'IN_PROGRESS' && volume.status !== 'READING') return false;
        if (shelfFilter.value.smartType === 'OWNED' && !isOwned(volume)) return false;
        if (filters.value.ownership !== 'ALL' && volume.ownership !== filters.value.ownership) return false;
        if (workMatches) return true;
        return [`tomo ${volume.number}`, `volumen ${volume.number}`, volume.title]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase('es').includes(query));
      });
      if (!query && filters.value.ownership === 'ALL') volumes = shelf.volumes;
      return {
        ...shelf,
        volumes,
        ownedCount: volumes.filter(isOwned).length,
        readCount: volumes.filter(isRead).length,
      };
    })
    .filter((shelf) => shelf.volumes.length > 0);
});

const groupedShelves = computed(() =>
  FORMATS.map((format) => ({
    ...format,
    shelves: visibleWorkShelves.value.filter(
      (shelf) => shelf.obra.tipo === format.value,
    ),
  })).filter((group) => group.shelves.length > 0),
);

const totalVolumes = computed(() =>
  workShelves.value.reduce((total, shelf) => total + shelf.volumes.length, 0),
);

const totalOwned = computed(() =>
  workShelves.value.reduce((total, shelf) => total + shelf.ownedCount, 0),
);

const totalRead = computed(() =>
  workShelves.value.reduce((total, shelf) => total + shelf.readCount, 0),
);

const visibleVolumes = computed(() => visibleWorkShelves.value.reduce((total, shelf) => total + shelf.volumes.length, 0));
const publishers = computed(() => [...new Set(store.obras.value.map((obra) => obra.publisher).filter(Boolean) as string[])].sort());
const activeFilters = computed(() => hasActiveCollectionFilters(filters.value));
function clearCollectionFilters() { filters.value = createCollectionFilters(); }
</script>

<template>
  <div class="shelves-page">
    <header class="shelves-header">
      <div>
        <span class="shelves-eyebrow">Karma Library</span>
        <h1 class="section-title">Estantería</h1>
        <p class="section-sub">
          Explora cada colección por portadas o por lomos.
        </p>
      </div>

      <div class="shelves-summary">
        <div>
          <strong>{{ workShelves.length }}</strong>
          <span>obras</span>
        </div>
        <div>
          <strong>{{ totalVolumes }}</strong>
          <span>tomos</span>
        </div>
        <div>
          <strong>{{ totalOwned }}</strong>
          <span>poseídos</span>
        </div>
        <div>
          <strong>{{ totalRead }}</strong>
          <span>leídos</span>
        </div>
      </div>
    </header>

    <CustomShelvesPanel :obras="store.obras.value" @filter="shelfFilter = $event" />

    <div class="shelves-toolbar">
      <label class="shelf-search">
        <Search />
        <input v-model="filters.query" type="search" placeholder="Buscar obra, autor o tomo…" />
        <kbd>⌘ K</kbd>
      </label>

      <div class="view-switch" role="group" aria-label="Modo de visualización">
        <button
          type="button"
          :class="{ active: viewMode === 'covers' }"
          @click="viewMode = 'covers'"
        >
          <LibraryBig />
          Portadas
        </button>

        <button
          type="button"
          :class="{ active: viewMode === 'spines' }"
          @click="viewMode = 'spines'"
        >
          <Rows3 />
          Lomos
        </button>
      </div>

      <span class="toolbar-note"><strong>{{ shelfFilter.name }}</strong>{{ visibleWorkShelves.length }} obras · {{ visibleVolumes }} tomos</span>
    </div>

    <details class="shelves-advanced-filters card">
      <summary><SlidersHorizontal /> Filtros avanzados <span v-if="activeFilters">Activos</span></summary>
      <CollectionFilters v-model="filters" :genres="store.distinctGenres.value" :publishers="publishers" compact show-search @clear="clearCollectionFilters" />
    </details>

    <div v-if="store.loading.value" class="empty">
      Cargando tu estantería…
    </div>

    <div v-else-if="visibleWorkShelves.length === 0" class="empty">
      <Search />
      <b>No encontramos tomos en este estante.</b>
      <span>Prueba otra pestaña o limpia los filtros de búsqueda.</span>
      <button type="button" @click="clearCollectionFilters">Limpiar filtros</button>
    </div>

    <template v-else>
      <section
        v-for="group in groupedShelves"
        :key="group.value"
        class="format-section"
      >
        <div class="format-section__header">
          <div>
            <span
              class="fmt-dot"
              :style="{
                background: FORMAT_COLORS[group.value].color,
                color: FORMAT_COLORS[group.value].color,
              }"
            />
            <h2>{{ group.label }}</h2>
          </div>

          <span>
            {{ group.shelves.length }}
            {{ group.shelves.length === 1 ? 'obra' : 'obras' }}
          </span>
        </div>

        <article
          v-for="shelf in group.shelves"
          :key="shelf.obra.id"
          class="work-shelf"
          :style="{ '--shelf-accent': FORMAT_COLORS[shelf.obra.tipo].color }"
        >
          <header class="work-shelf__header">
            <button
              type="button"
              class="work-shelf__identity"
              @click="openWorkModal?.(shelf.obra)"
            >
              <div class="work-shelf__cover">
                <img
                  v-if="shelf.obra.coverPath"
                  :src="shelf.obra.thumbnailPath || shelf.obra.coverPath"
                  :alt="`Portada de ${shelf.obra.titulo}`"
                  loading="lazy"
                  decoding="async"
                />
                <div v-else class="work-shelf__cover-fallback">
                  <BookOpen />
                </div>
              </div>

              <div class="work-shelf__title">
                <span>{{ formatLabel(shelf.obra) }}</span>
                <h3>{{ shelf.obra.titulo }}</h3>
                <p>{{ shelf.obra.autor || 'Autor no registrado' }}</p>
              </div>
            </button>

            <div class="work-shelf__stats">
              <span>
                <strong>{{ shelf.volumes.length }}</strong>
                tomos
              </span>
              <span>
                <strong>{{ shelf.ownedCount }}</strong>
                poseídos
              </span>
              <span>
                <strong>{{ shelf.readCount }}</strong>
                leídos
              </span>
            </div>
          </header>

          <div v-if="viewMode === 'covers'" class="cover-rail">
            <div class="shelf-bookend shelf-bookend--start"><span>K</span></div>
            <article
              v-for="volume in shelf.volumes"
              :key="volume.id"
              class="volume-cover-card"
              :class="{ 'volume-cover-card--wanted': isNotOwned(volume) }"
            >
              <button
                type="button"
                class="volume-cover-card__preview"
                :title="`Ampliar ${shelf.obra.titulo} · Tomo ${volume.number}`"
                @click="openZoomViewer(shelf.obra, volume, $event)"
              >
                <div class="volume-cover-card__image">
                  <img
                    v-if="volumeCover(shelf.obra, volume)"
                    :src="volumeThumbnail(shelf.obra, volume) ?? undefined"
                    :alt="`${shelf.obra.titulo} tomo ${volume.number}`"
                    loading="lazy"
                    decoding="async"
                  />

                  <div v-else class="volume-cover-card__fallback">
                    <BookOpen />
                    <span>{{ shelf.obra.titulo }}</span>
                  </div>

                  <div
                    v-if="isNotOwned(volume)"
                    class="volume-cover-card__wanted"
                  >
                    <div class="volume-cover-card__wanted-icon">
                      <ShoppingBag />
                    </div>
                    <strong>Por adquirir</strong>
                    <span>Registrado en tu lista</span>
                  </div>

                  <span
                    class="volume-cover-card__status"
                    :class="{
                      read: isRead(volume),
                      reading: volume.status === 'READING',
                      owned:
                        isOwned(volume) &&
                        !isRead(volume) &&
                        volume.status !== 'READING',
                    }"
                  />

                  <span
                    v-if="volumeCover(shelf.obra, volume)"
                    class="volume-cover-card__zoom-label"
                  >
                    Ampliar
                  </span>
                </div>
              </button>

              <button
                type="button"
                class="volume-cover-card__meta"
                @click="openVolumeModal?.(shelf.obra, volume)"
              >
                <strong>Tomo {{ volume.number }}</strong>
                <span
                  :class="{ 'volume-cover-card__pending-text': isNotOwned(volume) }"
                >
                  <LockKeyhole v-if="isNotOwned(volume)" />
                  {{ isNotOwned(volume) ? 'Aún no está en tu colección' : statusLabel(volume) }}
                </span>
              </button>
            </article>
            <div class="shelf-bookend shelf-bookend--end"><span>{{ shelf.volumes.length }}</span></div>
          </div>

          <div v-else class="spine-stage">
            <div class="spine-stage__light" />
            <div class="spine-rail">
              <BookSpine
                v-for="volume in shelf.volumes"
                :key="volume.id"
                :obra="shelf.obra"
                :volume="volumeWithEditionSpine(volume)"
                @click="openVolumeModal?.(shelf.obra, volume)"
              />
            </div>
            <div class="spine-stage__board" />
          </div>
        </article>
      </section>
    </template>

    <Teleport to="body">
      <div
        v-if="zoomViewer"
        class="cover-zoom-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="`Portada ampliada de ${zoomViewer.obra.titulo}`"
        @click.self="closeZoomViewer"
      >
        <header class="cover-zoom-header">
          <div>
            <span>{{ zoomViewer.obra.titulo }}</span>
            <h2>Tomo {{ zoomViewer.volume.number }}</h2>
          </div>

          <button
            type="button"
            class="cover-zoom-close"
            aria-label="Cerrar"
            @click="closeZoomViewer"
          >
            <X />
          </button>
        </header>

        <div
          class="cover-zoom-canvas"
          :class="{ dragging }"
          @wheel="onZoomWheel"
          @pointerdown="beginZoomDrag"
          @pointermove="moveZoomImage"
          @pointerup="endZoomDrag"
          @pointercancel="endZoomDrag"
        >
          <img
            :src="zoomViewer.src"
            :alt="`${zoomViewer.obra.titulo} tomo ${zoomViewer.volume.number}`"
            draggable="false"
            :style="{
              transform: `translate(${zoomOffset.x}px, ${zoomOffset.y}px) scale(${zoomLevel})`,
            }"
          />
        </div>

        <footer class="cover-zoom-footer">
          <span>
            Usa la rueda del mouse para ampliar y arrastra la imagen cuando tenga zoom.
          </span>

          <div class="cover-zoom-controls">
            <button
              type="button"
              aria-label="Alejar"
              :disabled="zoomLevel <= 1"
              @click="changeZoom(-0.25)"
            >
              <Minus />
            </button>

            <strong>{{ Math.round(zoomLevel * 100) }}%</strong>

            <button
              type="button"
              aria-label="Acercar"
              :disabled="zoomLevel >= 4"
              @click="changeZoom(0.25)"
            >
              <Plus />
            </button>

            <button
              type="button"
              aria-label="Restablecer zoom"
              @click="resetZoom"
            >
              <RotateCcw />
            </button>

            <button
              type="button"
              @click="openVolumeModal?.(zoomViewer.obra, zoomViewer.volume); closeZoomViewer()"
            >
              Editar tomo
            </button>
          </div>
        </footer>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.shelves-page {
  width: 100%;
}

.shelves-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.shelves-eyebrow {
  display: block;
  margin-bottom: 7px;
  color: var(--accent);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.shelves-header .section-sub {
  margin-bottom: 0;
}

.shelves-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px;
  background: rgba(10, 13, 20, .72);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.shelves-summary > div {
  min-width: 72px;
  padding: 7px 10px;
  text-align: center;
  border-right: 1px solid var(--border);
}

.shelves-summary > div:last-child {
  border-right: 0;
}

.shelves-summary strong,
.shelves-summary span {
  display: block;
}

.shelves-summary strong {
  color: var(--text);
  font-size: 14px;
}

.shelves-summary span {
  margin-top: 2px;
  color: var(--text-faint);
  font-size: 9.5px;
}

.shelves-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding: 11px 13px;
  background: rgba(255, 255, 255, .018);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.view-switch {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: #070a11;
  border: 1px solid rgba(255, 255, 255, .065);
  border-radius: 9px;
}

.view-switch button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  color: var(--text-dim);
  background: transparent;
  border: 0;
  border-radius: 7px;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}

.view-switch button svg {
  width: 14px;
  height: 14px;
}

.view-switch button.active {
  color: #f6f1ff;
  background: linear-gradient(
    135deg,
    rgba(159, 107, 255, .25),
    rgba(124, 58, 237, .12)
  );
  box-shadow: inset 0 0 0 1px rgba(159, 107, 255, .28);
}

.toolbar-note {
  color: var(--text-faint);
  font-size: 10.5px;
}

.format-section {
  margin-bottom: 30px;
}

.format-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 11px;
  padding: 0 3px;
}

.format-section__header > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

.format-section__header h2 {
  margin: 0;
  font-size: 14px;
}

.format-section__header > span {
  color: var(--text-faint);
  font-size: 10.5px;
}

.work-shelf {
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, .018), transparent 35%),
    #080b12;
  border: 1px solid rgba(255, 255, 255, .065);
  border-radius: 15px;
  box-shadow: 0 18px 42px -30px rgba(0, 0, 0, .85);
}

.work-shelf__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 17px;
  border-bottom: 1px solid rgba(255, 255, 255, .055);
}

.work-shelf__identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.work-shelf__cover {
  width: 42px;
  height: 58px;
  flex-shrink: 0;
  overflow: hidden;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.work-shelf__cover img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  background: #05070d;
}

.work-shelf__cover-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-faint);
}

.work-shelf__cover-fallback svg {
  width: 18px;
  height: 18px;
}

.work-shelf__title {
  min-width: 0;
}

.work-shelf__title > span {
  display: block;
  margin-bottom: 3px;
  color: var(--accent);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.work-shelf__title h3 {
  margin: 0 0 3px;
  overflow: hidden;
  color: var(--text);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-shelf__title p {
  margin: 0;
  overflow: hidden;
  color: var(--text-faint);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.work-shelf__stats {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.work-shelf__stats span {
  color: var(--text-faint);
  font-size: 10px;
}

.work-shelf__stats strong {
  margin-right: 3px;
  color: var(--text);
  font-size: 11.5px;
}

.cover-rail {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 18px 17px 20px;
  scroll-snap-type: x proximity;
}

.cover-rail::-webkit-scrollbar,
.spine-rail::-webkit-scrollbar {
  height: 7px;
}

.cover-rail::-webkit-scrollbar-thumb,
.spine-rail::-webkit-scrollbar-thumb {
  background: rgba(159, 107, 255, .22);
  border-radius: 999px;
}

.volume-cover-card {
  width: 120px;
  flex: 0 0 120px;
  overflow: hidden;
  color: inherit;
  background: #0b0f18;
  border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 10px;
  scroll-snap-align: start;
  transition:
    transform .18s ease,
    border-color .18s ease,
    box-shadow .18s ease;
}

.volume-cover-card__preview {
  width: 100%;
  display: block;
  padding: 0;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: zoom-in;
}

.volume-cover-card:hover {
  transform: translateY(-5px);
  border-color: rgba(159, 107, 255, .35);
  box-shadow: 0 14px 28px -16px rgba(85, 40, 155, .8);
}

.volume-cover-card__image {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 36%, rgba(159, 107, 255, .08), transparent 60%),
    #05070d;
}

.volume-cover-card__image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  object-position: center;
}

.volume-cover-card__fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 12px;
  color: var(--text-faint);
  text-align: center;
}

.volume-cover-card__fallback svg {
  width: 24px;
  height: 24px;
}

.volume-cover-card__fallback span {
  font-size: 9.5px;
  line-height: 1.35;
}


.volume-cover-card--wanted {
  border-color: rgba(251, 191, 36, .24);
  background:
    linear-gradient(180deg, rgba(251, 191, 36, .035), transparent 55%),
    #0b0f18;
}

.volume-cover-card--wanted:hover {
  border-color: rgba(251, 191, 36, .48);
  box-shadow: 0 16px 30px -16px rgba(251, 191, 36, .32);
}

.volume-cover-card--wanted .volume-cover-card__image img {
  filter: saturate(.68) brightness(.72);
}

.volume-cover-card__wanted {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 14px;
  color: #fff7dc;
  background:
    linear-gradient(
      180deg,
      rgba(4, 6, 13, .22) 0%,
      rgba(4, 6, 13, .5) 42%,
      rgba(4, 6, 13, .88) 100%
    );
  text-align: center;
  pointer-events: none;
}

.volume-cover-card__wanted::before {
  content: '';
  position: absolute;
  inset: 7px;
  border: 1px dashed rgba(251, 191, 36, .34);
  border-radius: 7px;
}

.volume-cover-card__wanted-icon {
  position: relative;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  margin-bottom: 3px;
  color: #fbbf24;
  background: rgba(251, 191, 36, .11);
  border: 1px solid rgba(251, 191, 36, .28);
  border-radius: 50%;
  box-shadow: 0 0 18px -7px rgba(251, 191, 36, .8);
}

.volume-cover-card__wanted-icon svg {
  width: 16px;
  height: 16px;
}

.volume-cover-card__wanted strong,
.volume-cover-card__wanted span {
  position: relative;
}

.volume-cover-card__wanted strong {
  font-size: 10px;
  letter-spacing: .02em;
}

.volume-cover-card__wanted span {
  max-width: 90px;
  color: rgba(255, 247, 220, .67);
  font-size: 8px;
  line-height: 1.35;
}

.volume-cover-card__pending-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #d7b766 !important;
}

.volume-cover-card__pending-text svg {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
}

.volume-cover-card__status {
  position: absolute;
  right: 7px;
  bottom: 7px;
  width: 8px;
  height: 8px;
  background: var(--text-faint);
  border: 2px solid #070a11;
  border-radius: 50%;
}

.volume-cover-card__status.read,
.volume-cover-card__status.owned {
  background: var(--success);
  box-shadow: 0 0 8px rgba(52, 211, 153, .65);
}

.volume-cover-card__status.reading {
  background: var(--accent);
  box-shadow: 0 0 8px rgba(159, 107, 255, .72);
}

.volume-cover-card__meta {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px 10px;
  color: inherit;
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.volume-cover-card__zoom-label {
  position: absolute;
  right: 7px;
  top: 7px;
  padding: 4px 7px;
  color: #fff;
  background: rgba(4, 6, 13, .82);
  border: 1px solid rgba(255, 255, 255, .13);
  border-radius: 999px;
  font-size: 8px;
  font-weight: 800;
  opacity: 0;
  transform: translateY(-3px);
  transition: opacity .16s ease, transform .16s ease;
}

.volume-cover-card:hover .volume-cover-card__zoom-label {
  opacity: 1;
  transform: translateY(0);
}

.volume-cover-card__meta strong {
  color: var(--text);
  font-size: 11px;
}

.volume-cover-card__meta span {
  color: var(--text-faint);
  font-size: 9.5px;
}

.spine-stage {
  position: relative;
  min-height: 310px;
  overflow: hidden;
  padding: 26px 0 0;
  background:
    radial-gradient(circle at 50% 0, rgba(159, 107, 255, .08), transparent 42%),
    linear-gradient(180deg, #0b0d14 0%, #080a10 70%, #05060a 100%);
}

.spine-stage__light {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      90deg,
      rgba(255, 255, 255, .025),
      transparent 16%,
      transparent 84%,
      rgba(255, 255, 255, .015)
    );
}

.spine-rail {
  position: relative;
  z-index: 2;
  min-height: 268px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  overflow-x: auto;
  overflow-y: visible;
  padding: 10px 22px 18px;
  perspective: 1200px;
}

.spine-rail > * {
  flex: 0 0 auto;
}

.spine-stage__board {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1;
  height: 18px;
  background:
    linear-gradient(180deg, #342644 0%, #20172e 42%, #110c19 100%);
  border-top: 1px solid rgba(190, 145, 255, .16);
  box-shadow:
    0 -5px 16px rgba(91, 45, 145, .14),
    0 10px 22px rgba(0, 0, 0, .72);
}

.cover-zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  padding: 22px;
  color: var(--text);
  background: rgba(2, 4, 9, .94);
  backdrop-filter: blur(18px);
}

.cover-zoom-header,
.cover-zoom-footer {
  width: min(1100px, 100%);
  margin: 0 auto;
}

.cover-zoom-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 14px;
}

.cover-zoom-header span {
  display: block;
  margin-bottom: 3px;
  color: var(--accent);
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.cover-zoom-header h2 {
  margin: 0;
  font-size: 18px;
}

.cover-zoom-close {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  padding: 0;
  color: var(--text-dim);
  background: #0c1018;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 9px;
  cursor: pointer;
}

.cover-zoom-close svg {
  width: 16px;
  height: 16px;
}

.cover-zoom-canvas {
  min-height: 0;
  display: grid;
  place-items: center;
  overflow: hidden;
  touch-action: none;
  cursor: zoom-in;
  user-select: none;
}

.cover-zoom-canvas.dragging {
  cursor: grabbing;
}

.cover-zoom-canvas img {
  max-width: min(92vw, 920px);
  max-height: calc(100vh - 190px);
  display: block;
  object-fit: contain;
  transform-origin: center;
  transition: transform .12s ease-out;
  pointer-events: none;
}

.cover-zoom-canvas.dragging img {
  transition: none;
}

.cover-zoom-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 14px;
}

.cover-zoom-footer > span {
  color: var(--text-faint);
  font-size: 10.5px;
}

.cover-zoom-controls {
  display: flex;
  align-items: center;
  gap: 7px;
}

.cover-zoom-controls button {
  min-width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  color: var(--text-dim);
  background: #0c1018;
  border: 1px solid rgba(255, 255, 255, .09);
  border-radius: 8px;
  font: 700 10.5px inherit;
  cursor: pointer;
}

.cover-zoom-controls button:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.cover-zoom-controls button svg {
  width: 14px;
  height: 14px;
}

.cover-zoom-controls strong {
  min-width: 50px;
  color: var(--text);
  font-size: 10.5px;
  text-align: center;
}

@media (max-width: 620px) {
  .cover-zoom-overlay {
    padding: 12px;
  }

  .cover-zoom-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .cover-zoom-controls {
    width: 100%;
    flex-wrap: wrap;
  }

  .cover-zoom-canvas img {
    max-width: 96vw;
    max-height: calc(100vh - 230px);
  }

  .volume-cover-card__zoom-label {
    opacity: 1;
    transform: none;
  }
}

.empty {
  margin-top: 18px;
}

@media (max-width: 900px) {
  .shelves-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .shelves-summary {
    width: 100%;
    overflow-x: auto;
  }

  .shelves-summary > div {
    flex: 1;
  }

  .work-shelf__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .work-shelf__stats {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 620px) {
  .shelves-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-note {
    line-height: 1.45;
  }

  .work-shelf__stats {
    gap: 10px;
    flex-wrap: wrap;
  }

  .volume-cover-card {
    width: 105px;
    flex-basis: 105px;
  }

  .spine-stage {
    min-height: 280px;
  }

  .spine-rail {
    min-height: 238px;
    padding-right: 14px;
    padding-left: 14px;
  }
}
/* Biblioteca virtual: controles compactos y rieles que se leen como estantes reales. */
.shelves-toolbar{position:sticky;top:124px;z-index:18;display:grid;grid-template-columns:minmax(230px,1fr) auto auto auto;margin-bottom:22px;padding:8px;background:rgba(8,7,13,.94);box-shadow:0 12px 28px #0006;backdrop-filter:blur(14px)}
.shelf-search,.shelf-filter{display:flex;align-items:center;gap:8px;height:42px;padding:0 11px;border:1px solid rgba(255,255,255,.075);border-radius:9px;background:#080a10;color:var(--text-faint)}
.shelf-search:focus-within,.shelf-filter:focus-within{border-color:rgba(159,107,255,.52);box-shadow:0 0 0 3px rgba(159,107,255,.07)}
.shelf-search svg,.shelf-filter svg{width:15px;flex:0 0 auto}.shelf-search input,.shelf-filter select{min-width:0;width:100%;border:0;outline:0;background:transparent;color:var(--text);font:11px inherit}.shelf-search input::placeholder{color:#625d6e}.shelf-search kbd{padding:2px 5px;border:1px solid #302b3a;border-radius:5px;color:#6f6978;font:9px inherit;white-space:nowrap}.shelf-filter{width:160px}.shelf-filter select{cursor:pointer}.shelf-filter select option{background:#0d0b12}.toolbar-note{display:grid;min-width:120px;padding:0 5px;text-align:right;line-height:1.35}.toolbar-note strong{display:block;color:#d8d1e3;font-size:10px}.format-section{margin-bottom:24px;content-visibility:auto;contain-intrinsic-size:500px}.format-section__header{margin:0 0 9px;padding:0 8px}.work-shelf{margin-bottom:13px;border-color:color-mix(in srgb,var(--shelf-accent) 16%,rgba(255,255,255,.06));border-radius:14px;background:#0b0a0e;box-shadow:0 18px 30px -25px #000}.work-shelf__header{min-height:68px;padding:9px 14px;background:linear-gradient(90deg,color-mix(in srgb,var(--shelf-accent) 7%,#0b0a0e),#0b0a0e 45%)}.work-shelf__cover{width:34px;height:46px}.work-shelf__title h3{font-size:13px}.work-shelf__stats{gap:12px}.cover-rail{position:relative;align-items:flex-end;gap:8px;min-height:222px;padding:14px 17px 29px;background:linear-gradient(180deg,#111017 0%,#09090d 78%,#21150d 79%,#5b3821 84%,#2a190f 91%,#0a0705 100%);scroll-padding-inline:44px}.cover-rail::after{content:'';position:absolute;right:0;bottom:13px;left:0;height:9px;background:linear-gradient(180deg,#80522e,#3f2616 55%,#160d08);box-shadow:0 5px 11px #000,inset 0 1px #c68a5245;pointer-events:none}.volume-cover-card{z-index:1;width:104px;flex-basis:104px;border-radius:7px;box-shadow:5px 7px 13px #0008}.volume-cover-card:hover{transform:translateY(-7px) rotate(-.5deg)}.volume-cover-card__meta{min-height:42px;padding:7px!important}.volume-cover-card__meta>span{font-size:8px!important}.shelf-bookend{position:relative;z-index:1;display:grid;place-items:center;flex:0 0 25px;width:25px;height:70px;margin-bottom:0;border:1px solid #6b4225;border-radius:4px 4px 2px 2px;background:linear-gradient(90deg,#24140c,#7a4a29 45%,#321d10);box-shadow:4px 6px 10px #0009;color:#d5a06d}.shelf-bookend::after{content:'';position:absolute;bottom:-2px;width:38px;height:9px;border-radius:2px;background:linear-gradient(#815231,#2c190e);box-shadow:2px 4px 6px #0008}.shelf-bookend span{writing-mode:vertical-rl;font-size:8px;font-weight:900;letter-spacing:.14em}.shelf-bookend--end{margin-left:auto}.spine-stage{border:0;background:linear-gradient(180deg,#121017 0,#08070b 76%,#51311d 77%,#23140c 92%,#080504)}.spine-stage__board{background:linear-gradient(180deg,#8b5a34,#3e2515 52%,#180e08)!important;box-shadow:0 8px 15px #000}.empty{display:grid;place-items:center;gap:7px;min-height:230px;border:1px dashed #30283d;border-radius:14px;background:#0b0910;color:#777181}.empty svg{width:24px;color:#8b5cf6}.empty b{color:#d5cedf}.empty span{font-size:11px}.empty button{margin-top:5px;padding:8px 12px;border:1px solid #50377a;border-radius:8px;background:#1b1228;color:#cdb8ed}
@media(max-width:900px){.shelves-toolbar{top:116px;grid-template-columns:1fr auto}.shelf-search{grid-column:1/-1}.toolbar-note{display:none}.shelf-filter{width:150px}}
@media(max-width:620px){.shelves-toolbar{top:108px}.shelf-filter{width:auto}.shelf-search kbd{display:none}.work-shelf__stats span:nth-child(2){display:none}.cover-rail{min-height:206px}.volume-cover-card{width:96px;flex-basis:96px}}
</style>
