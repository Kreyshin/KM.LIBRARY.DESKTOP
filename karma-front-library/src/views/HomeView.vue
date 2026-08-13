<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  BookOpen, BookOpenText, Layers, PlayCircle, CheckCircle2, Bookmark, Heart,
  PanelsTopLeft, Smartphone, ScrollText, MessageSquareText, BookMarked, Plus, ShoppingBag,
} from 'lucide-vue-next';
import { useObrasStore } from '../stores/obras';
import { api, FORMATS, FORMAT_COLORS, type Obra } from '../api/client';
import { notifyError, notifySuccess } from '../services/notifications';
import bookIllustration from '../assets/format-illustrations/book.webp';
import mangaIllustration from '../assets/format-illustrations/manga.webp';
import manhwaIllustration from '../assets/format-illustrations/manhwa.webp';
import manhuaIllustration from '../assets/format-illustrations/manhua.webp';
import comicIllustration from '../assets/format-illustrations/comic.webp';

const FORMAT_ILLUSTRATIONS = {
  BOOK: bookIllustration,
  MANGA: mangaIllustration,
  MANHWA: manhwaIllustration,
  MANHUA: manhuaIllustration,
  COMIC: comicIllustration,
};

const FORMAT_ICONS = {
  BOOK: BookOpenText,
  MANGA: PanelsTopLeft,
  MANHWA: Smartphone,
  MANHUA: ScrollText,
  COMIC: MessageSquareText,
};

const router = useRouter();
const store = useObrasStore();
const quickUpdating = ref<string | null>(null);

const total = computed(() => store.obras.value.length);
const totalVolumes = computed(() => store.obras.value.reduce((a, o) => a + o.volumes.length, 0));
const inProgress = computed(() => store.obras.value.filter((o) => o.status === 'READING').length);
const completed = computed(() => store.obras.value.filter((o) => o.status === 'COMPLETED').length);
const wishlist = computed(() => store.obras.value.filter((o) => o.status === 'WISHLIST').length);
const favorites = computed(() => store.obras.value.filter((o) => o.favorite).length);

const stats = computed(() => [
  { label: 'Total de obras', value: total.value, icon: BookOpen },
  { label: 'Tomos', value: totalVolumes.value, icon: Layers },
  { label: 'En progreso', value: inProgress.value, icon: PlayCircle },
  { label: 'Completado', value: completed.value, icon: CheckCircle2 },
  { label: 'Lista de deseos', value: wishlist.value, icon: Bookmark },
  { label: 'Favoritos', value: favorites.value, icon: Heart },
]);

const formatCounts = computed(() => FORMATS.map((format) => {
  const works = store.obras.value.filter((obra) => obra.tipo === format.value);
  const volumes = works.flatMap((obra) => obra.volumes);
  return {
    ...format, ...FORMAT_COLORS[format.value], illustration: FORMAT_ILLUSTRATIONS[format.value], icon: FORMAT_ICONS[format.value],
    count: works.length,
    owned: volumes.filter((volume) => volume.ownership !== 'NOT_OWNED').length,
    read: volumes.filter((volume) => volume.read).length,
  };
}));

const continueReading = computed(() =>
  store.obras.value.filter((o) => o.status === 'READING').slice(0, 5),
);

const recentlyAdded = computed(() =>
  [...store.obras.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
);

const GENRE_COLORS = ['#9F6BFF', '#22D3EE', '#F472B6', '#FBBF24', '#34D399', '#60A5FA'];
const genreBreakdown = computed(() => {
  const counts = new Map<string, number>();
  store.obras.value.forEach((o) => o.genres.forEach((g) => counts.set(g, (counts.get(g) || 0) + 1)));
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const totalCount = entries.reduce((a, [, c]) => a + c, 0);
  return { entries, totalCount };
});

const donutStyle = computed(() => {
  const { entries, totalCount } = genreBreakdown.value;
  if (totalCount === 0) return { background: 'var(--surface-2)' };
  let acc = 0;
  const stops = entries.map(([, count], i) => {
    const start = (acc / totalCount) * 360;
    acc += count;
    const end = (acc / totalCount) * 360;
    return `${GENRE_COLORS[i % GENRE_COLORS.length]} ${start}deg ${end}deg`;
  });
  return { background: `conic-gradient(${stops.join(',')})` };
});

function progressPct(o: any) {
  if (o.totalChapters && o.currentChapter) return Math.min(100, Math.round((o.currentChapter / o.totalChapters) * 100));
  const read = o.volumes.filter((v: any) => v.read).length;
  return o.volumes.length ? Math.round((read / o.volumes.length) * 100) : 0;
}

async function advanceChapter(obra: Obra) {
  if (quickUpdating.value) return;
  quickUpdating.value = obra.id;
  try {
    const next = Math.min((obra.currentChapter || 0) + 1, obra.totalChapters || Number.MAX_SAFE_INTEGER);
    const updated = await api.update(obra.id, { currentChapter: next, status: 'READING' });
    store.upsert(updated);
    notifySuccess('Progreso actualizado', `${obra.titulo}: capítulo ${next}.`);
  } catch (cause) {
    notifyError('No se pudo actualizar el progreso', cause instanceof Error ? cause.message : undefined);
  } finally {
    quickUpdating.value = null;
  }
}
</script>

<template>
  <div>
    <div class="hero-banner">
      <h1>Bienvenido de nuevo.</h1>
      <p>Continúa tus historias. Sigue tu progreso. Construye tu legado.</p>
    </div>

    <div class="stat-grid">
      <div v-for="s in stats" :key="s.label" class="card stat-card">
        <div class="stat-icon">
          <component :is="s.icon" />
        </div>
        <div class="stat-body">
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-value">{{ s.value.toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <div class="format-grid">
      <RouterLink v-for="f in formatCounts" :key="f.value" class="card format-card" :to="{ path: '/library', query: { tipo: f.value } }" :style="{
        '--fmt-glow-bg': f.bg, '--fmt-border': 'transparent', '--fmt-icon-bg': f.bg,
        '--fmt-color': f.color, '--fmt-glow': f.glow,
      }" :aria-label="`Ver ${f.label}: ${f.count} obras, ${f.owned} tomos adquiridos y ${f.read} leídos`">
        <img class="format-illustration" :src="f.illustration" alt="" aria-hidden="true" />
        <div class="format-icon">
          <component :is="f.icon" />
        </div>
        <div class="format-name">{{ f.label }}</div>
        <div class="format-count">{{ f.count }} obras</div>
        <div class="format-card__meta"><span><ShoppingBag />{{ f.owned }}</span><span><BookMarked />{{ f.read }}</span></div>
      </RouterLink>
    </div>

    <div class="home-grid">
      <div class="card widget">
        <div class="widget-head">
          <h3>Continuar leyendo</h3>
          <RouterLink to="/library?status=READING">Ver todo</RouterLink>
        </div>
        <div v-if="continueReading.length === 0" class="widget-empty"><BookMarked /><strong>Nada en progreso todavía</strong><span>Marca una obra como “Leyendo” para verla aquí.</span></div>
        <div v-for="o in continueReading" :key="o.id" class="list-row" style="cursor:pointer"
          @click="router.push({ name: 'obra', params: { id: o.id } })">
          <img v-if="o.coverPath" class="list-thumb" :src="o.thumbnailPath || o.coverPath" :alt="`Portada de ${o.titulo}`" loading="lazy" decoding="async" />
          <div v-else class="list-thumb-fallback">{{ o.titulo.slice(0, 2) }}</div>
          <div class="list-meta">
            <div class="lt">{{ o.titulo }}</div>
            <div class="ls">{{FORMATS.find(f => f.value === o.tipo)?.label}} · Tomo {{ o.currentVolume || 1 }}<template v-if="o.currentChapter"> · Cap. {{ o.currentChapter }}</template></div>
            <div class="mini-progress">
              <div class="mini-progress-fill" :style="{ width: progressPct(o) + '%' }"></div>
            </div>
          </div>
          <button type="button" class="quick-progress" :disabled="quickUpdating === o.id" aria-label="Avanzar un capítulo" @click.stop="advanceChapter(o)"><Plus /> Capítulo</button>
        </div>
      </div>

      <div class="card widget">
        <div class="widget-head">
          <h3>Añadido recientemente</h3>
          <RouterLink to="/library">Ver todo</RouterLink>
        </div>
        <div v-if="recentlyAdded.length === 0" class="widget-empty"><BookOpen /><strong>Tu biblioteca está esperando</strong><span>Agrega una obra para comenzar.</span></div>
        <div v-for="o in recentlyAdded" :key="o.id" class="list-row" style="cursor:pointer" @click="router.push({ name: 'obra', params: { id: o.id } })">
          <img v-if="o.coverPath" class="list-thumb" :src="o.thumbnailPath || o.coverPath" :alt="`Portada de ${o.titulo}`" loading="lazy" decoding="async" />
          <div v-else class="list-thumb-fallback">{{ o.titulo.slice(0, 2) }}</div>
          <div class="list-meta">
            <div class="lt">{{ o.titulo }}</div>
            <div class="ls">{{ o.autor || 'Autor desconocido' }}</div>
          </div>
        </div>
      </div>

      <div class="card widget">
        <div class="widget-head">
          <h3>Géneros principales</h3>
        </div>
        <div v-if="genreBreakdown.totalCount === 0" class="placeholder-section">
          Agrega géneros a tus obras para ver el desglose aquí.
        </div>
        <div v-else class="donut-wrap">
          <div class="donut" :style="donutStyle"></div>
          <div class="donut-legend">
            <div v-for="([g, c], i) in genreBreakdown.entries" :key="g" class="donut-legend-row">
              <span class="donut-dot" :style="{ background: GENRE_COLORS[i % GENRE_COLORS.length] }"></span>
              {{ g }} · {{ Math.round((c / genreBreakdown.totalCount) * 100) }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="home-grid" style="margin-top:16px;">
      <div class="card widget">
        <div class="widget-head">
          <h3>Metas de lectura</h3>
        </div>
        <div class="placeholder-section">Próximamente: define metas anuales de lectura.</div>
      </div>
      <div class="card widget">
        <div class="widget-head">
          <h3>Actividad de lectura</h3>
        </div>
        <div class="placeholder-section">Próximamente: requiere registrar avance de lectura por fecha.</div>
      </div>
      <div class="card widget">
        <div class="widget-head">
          <h3>Notas recientes</h3>
        </div>
        <div class="placeholder-section">Próximamente: notas de lectura tipo diario.</div>
      </div>
    </div>
  </div>
</template>
