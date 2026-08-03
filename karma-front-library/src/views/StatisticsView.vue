<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { BarChart3, BookCheck, BookOpen, Layers3, Sparkles } from 'lucide-vue-next';
import { DEMOGRAPHICS, FORMATS } from '../api/client';
import { useObrasStore } from '../stores/obras';
import { createCollectionFilters, matchesCollectionFilters } from '../composables/collectionFilters';
import CollectionFilters from '../components/CollectionFilters.vue';

const store = useObrasStore();
const filters = ref(createCollectionFilters());
onMounted(() => store.load());

const publishers = computed(() => [...new Set(store.obras.value.map((obra) => obra.publisher).filter(Boolean) as string[])].sort());
const works = computed(() => store.obras.value.filter((obra) => matchesCollectionFilters(obra, filters.value)));
const volumes = computed(() => works.value.flatMap((obra) => obra.volumes));
const read = computed(() => volumes.value.filter((volume) => volume.read).length);
const completion = computed(() => volumes.value.length ? Math.round((read.value / volumes.value.length) * 100) : 0);
const formatDistribution = computed(() => FORMATS.map((format) => ({ label: format.label, count: works.value.filter((obra) => obra.tipo === format.value).length })).filter((item) => item.count));
const demographicDistribution = computed(() => DEMOGRAPHICS.map((item) => ({ label: item.label, count: works.value.filter((obra) => obra.demographic === item.value).length })).filter((item) => item.count));
const genreDistribution = computed(() => {
  const counts = new Map<string, number>();
  works.value.forEach((obra) => obra.genres.forEach((genre) => counts.set(genre, (counts.get(genre) || 0) + 1)));
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count }));
});
function width(count: number, collection: { count: number }[]) {
  const maximum = Math.max(1, ...collection.map((item) => item.count));
  return `${Math.round((count / maximum) * 100)}%`;
}
</script>

<template>
  <div class="statistics-page">
    <header class="library-page__header">
      <div><span class="page-eyebrow">Lectura en perspectiva</span><h1 class="section-title">Estadísticas</h1><p class="section-sub">Analiza toda tu colección o combina los mismos filtros del librero y la estantería.</p></div>
      <BarChart3 class="statistics-page__mark" />
    </header>
    <details class="shelves-advanced-filters card"><summary>Filtrar estadísticas</summary><CollectionFilters v-model="filters" :genres="store.distinctGenres.value" :publishers="publishers" compact show-search /></details>
    <div class="stat-grid statistics-summary">
      <div class="card stat-card"><div class="stat-icon"><BookOpen /></div><div><div class="stat-label">Obras</div><div class="stat-value">{{ works.length }}</div></div></div>
      <div class="card stat-card"><div class="stat-icon"><Layers3 /></div><div><div class="stat-label">Tomos</div><div class="stat-value">{{ volumes.length }}</div></div></div>
      <div class="card stat-card"><div class="stat-icon"><BookCheck /></div><div><div class="stat-label">Leídos</div><div class="stat-value">{{ read }}</div></div></div>
      <div class="card stat-card"><div class="stat-icon"><Sparkles /></div><div><div class="stat-label">Progreso</div><div class="stat-value">{{ completion }}%</div></div></div>
    </div>
    <section v-if="works.length" class="statistics-grid">
      <article class="card distribution-card"><h2>Por formato</h2><div v-for="item in formatDistribution" :key="item.label" class="distribution-row"><span>{{ item.label }}</span><div><i :style="{ width: width(item.count, formatDistribution) }" /></div><strong>{{ item.count }}</strong></div></article>
      <article class="card distribution-card"><h2>Por demografía</h2><div v-if="!demographicDistribution.length" class="placeholder-section">Sin demografías en esta selección.</div><div v-for="item in demographicDistribution" :key="item.label" class="distribution-row"><span>{{ item.label }}</span><div><i :style="{ width: width(item.count, demographicDistribution) }" /></div><strong>{{ item.count }}</strong></div></article>
      <article class="card distribution-card distribution-card--wide"><h2>Géneros principales</h2><div v-if="!genreDistribution.length" class="placeholder-section">Sin géneros en esta selección.</div><div v-for="item in genreDistribution" :key="item.label" class="distribution-row"><span>{{ item.label }}</span><div><i :style="{ width: width(item.count, genreDistribution) }" /></div><strong>{{ item.count }}</strong></div></article>
    </section>
    <section v-else class="empty-state"><div class="empty-state__art"><BarChart3 /><Sparkles /></div><h2>No hay datos para esta combinación</h2><p>Limpia o ajusta los filtros para recuperar la perspectiva de tu biblioteca.</p></section>
  </div>
</template>
