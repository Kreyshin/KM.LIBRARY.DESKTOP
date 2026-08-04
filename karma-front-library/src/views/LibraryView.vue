<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Heart, LibraryBig, Plus, RotateCcw, Search, SearchX, SlidersHorizontal, Sparkles } from 'lucide-vue-next';
import { useObrasStore } from '../stores/obras';
import { type FormatType, type Obra, type ReadingStatus } from '../api/client';
import { createCollectionFilters, hasActiveCollectionFilters, matchesCollectionFilters } from '../composables/collectionFilters';
import CollectionFilters from '../components/CollectionFilters.vue';
import WorkCard from '../components/WorkCard.vue';

const route = useRoute();
const router = useRouter();
const store = useObrasStore();
const openWorkModal = inject<(obra: Obra | null) => void>('openWorkModal');
const filters = ref(createCollectionFilters({
  query: String(route.query.q || ''),
  format: (route.query.tipo as FormatType) || 'ALL',
  status: (route.query.status as ReadingStatus) || 'ALL',
  author: String(route.query.author || ''),
  favoritesOnly: route.query.favorite === '1',
}));
const sortBy = ref<'recent' | 'title' | 'rating'>('recent');
const page = ref(1);
const pageSize = 20;

onMounted(() => store.load());

watch(() => route.query, (query) => {
  filters.value.query = String(query.q || '');
  filters.value.format = (query.tipo as FormatType) || 'ALL';
  filters.value.status = (query.status as ReadingStatus) || 'ALL';
  filters.value.author = String(query.author || '');
  filters.value.favoritesOnly = query.favorite === '1';
}, { deep: true });

watch(filters, (value) => {
  const query: Record<string, string> = {};
  if (value.query) query.q = value.query;
  if (value.format !== 'ALL') query.tipo = value.format;
  if (value.status !== 'ALL') query.status = value.status;
  if (value.author) query.author = value.author;
  if (value.favoritesOnly) query.favorite = '1';
  router.replace({ query });
  page.value = 1;
}, { deep: true });

const publishers = computed(() => [...new Set(store.obras.value.map((obra) => obra.publisher).filter(Boolean) as string[])].sort());
const filtered = computed(() => {
  let list = store.obras.value.filter((obra) => matchesCollectionFilters(obra, filters.value));
  if (sortBy.value === 'title') list = [...list].sort((a, b) => a.titulo.localeCompare(b.titulo));
  else if (sortBy.value === 'rating') list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
});
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const activeFilters = computed(() => hasActiveCollectionFilters(filters.value));

function clearFilters() {
  filters.value = createCollectionFilters();
}
</script>

<template>
  <div class="library-page">
    <header class="library-page__header">
      <div>
        <span class="page-eyebrow">Tu colección</span>
        <h1 class="section-title">Librero</h1>
        <p class="section-sub">Encuentra cualquier obra por formato, demografía, género, editorial o estado.</p>
      </div>
      <div class="library-page__summary"><strong>{{ filtered.length }}</strong><span>de {{ store.obras.value.length }} obras</span></div>
    </header>

    <details class="library-filter-mobile card">
      <summary><SlidersHorizontal /> Filtrar colección <span v-if="activeFilters">Activo</span></summary>
      <CollectionFilters v-model="filters" :genres="store.distinctGenres.value" :publishers="publishers" />
    </details>

    <div class="library-layout">
      <aside class="card filters library-filter-desktop">
        <CollectionFilters v-model="filters" :genres="store.distinctGenres.value" :publishers="publishers" />
      </aside>

      <main>
        <div class="library-toolbar">
          <label class="search-box library-search">
            <Search />
            <input v-model="filters.query" type="search" aria-label="Buscar en la colección" placeholder="Buscar título, autor, editorial o etiqueta…" />
          </label>
          <button type="button" class="favorite-filter" :class="{ active: filters.favoritesOnly }" :aria-pressed="filters.favoritesOnly" @click="filters.favoritesOnly = !filters.favoritesOnly"><Heart :fill="filters.favoritesOnly ? 'currentColor' : 'none'" /> Favoritos</button>
          <select v-model="sortBy" class="filter-select library-sort" aria-label="Ordenar resultados">
            <option value="recent">Añadido recientemente</option>
            <option value="title">Título</option>
            <option value="rating">Calificación</option>
          </select>
        </div>

        <div class="results-count" aria-live="polite">
          Mostrando {{ paged.length ? (page - 1) * pageSize + 1 : 0 }}–{{ (page - 1) * pageSize + paged.length }} de {{ filtered.length }} resultados
        </div>

        <div v-if="store.loading.value" class="works-grid" aria-label="Cargando colección">
          <div v-for="index in 8" :key="index" class="card work-skeleton" aria-hidden="true"><span /><i /><i /></div>
        </div>

        <div v-else-if="paged.length" class="works-grid">
          <WorkCard v-for="obra in paged" :key="obra.id" :obra="obra" @click="openWorkModal?.(obra)" @updated="store.upsert($event)" />
        </div>

        <section v-else class="empty-state">
          <div class="empty-state__art"><LibraryBig v-if="!store.obras.value.length" /><SearchX v-else /><Sparkles /></div>
          <h2>{{ store.obras.value.length ? 'No hay coincidencias' : 'Tu próxima historia empieza aquí' }}</h2>
          <p>{{ store.obras.value.length ? 'Ajusta los filtros para volver a explorar tu colección.' : 'Agrega tu primera obra y comienza a construir una biblioteca hecha a tu medida.' }}</p>
          <button v-if="store.obras.value.length" type="button" class="empty-state__button empty-state__button--secondary" @click="clearFilters"><RotateCcw /> Limpiar filtros</button>
          <button v-else type="button" class="empty-state__button empty-state__button--primary" @click="openWorkModal?.(null)"><Plus /> Agregar primera obra</button>
        </section>

        <nav v-if="totalPages > 1" class="pagination" aria-label="Páginas de resultados">
          <button v-for="number in totalPages" :key="number" class="tab-pill" :class="{ active: number === page }"
            :aria-current="number === page ? 'page' : undefined" @click="page = number">{{ number }}</button>
        </nav>
      </main>
    </div>
  </div>
</template>
