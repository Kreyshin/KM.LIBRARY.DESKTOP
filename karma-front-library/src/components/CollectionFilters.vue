<script setup lang="ts">
import { SlidersHorizontal, RotateCcw } from 'lucide-vue-next';
import { DEMOGRAPHICS, FORMATS, LANGUAGES, STATUSES, VOLUME_OWNERSHIP } from '../api/client';
import { createCollectionFilters, type CollectionFiltersState } from '../composables/collectionFilters';
import PurpleSelect from './PurpleSelect.vue';

const props = withDefaults(defineProps<{
  genres?: string[];
  publishers?: string[];
  showSearch?: boolean;
  compact?: boolean;
}>(), { genres: () => [], publishers: () => [], showSearch: false, compact: false });

const model = defineModel<CollectionFiltersState>({ required: true });
const emit = defineEmits<{ (event: 'clear'): void }>();
const formatOptions = [{ value: 'ALL', label: 'Todos' }, ...FORMATS];
const demographicOptions = [{ value: 'ALL', label: 'Todas' }, ...DEMOGRAPHICS];
const statusOptions = [{ value: 'ALL', label: 'Todos' }, ...STATUSES];
const ownershipOptions = [{ value: 'ALL', label: 'Cualquier estado' }, ...VOLUME_OWNERSHIP];

function toggleGenre(genre: string) {
  model.value.genres = model.value.genres.includes(genre)
    ? model.value.genres.filter((item) => item !== genre)
    : [...model.value.genres, genre];
}

function clear() {
  const fresh = createCollectionFilters({ favoritesOnly: model.value.favoritesOnly && !props.compact });
  Object.assign(model.value, fresh);
  emit('clear');
}
</script>

<template>
  <section class="collection-filters" :class="{ 'collection-filters--compact': compact }" aria-label="Filtros de la colección">
    <header class="collection-filters__head">
      <span><SlidersHorizontal /> Filtros</span>
      <button type="button" @click="clear"><RotateCcw /> Limpiar</button>
    </header>

    <label v-if="showSearch" class="collection-filter-field collection-filter-field--wide">
      <span>Buscar</span>
      <input v-model="model.query" type="search" placeholder="Título, autor, editorial o etiqueta…" />
    </label>

    <label class="collection-filter-field">
      <span>Formato</span>
      <PurpleSelect v-model="model.format" :options="formatOptions" aria-label="Filtrar por formato" compact />
    </label>

    <label class="collection-filter-field">
      <span>Demografía</span>
      <PurpleSelect v-model="model.demographic" :options="demographicOptions" aria-label="Filtrar por demografía" compact />
    </label>

    <label class="collection-filter-field">
      <span>Estado de lectura</span>
      <PurpleSelect v-model="model.status" :options="statusOptions" aria-label="Filtrar por estado" compact />
    </label>

    <label class="collection-filter-field">
      <span>Adquisición</span>
      <PurpleSelect v-model="model.ownership" :options="ownershipOptions" aria-label="Filtrar por adquisición" compact />
    </label>

    <label class="collection-filter-field">
      <span>Editorial</span>
      <PurpleSelect v-model="model.publisher" :options="publishers.map(publisher => ({ value: publisher, label: publisher }))" placeholder="Todas" aria-label="Filtrar por editorial" searchable clearable compact />
    </label>

    <label class="collection-filter-field">
      <span>Autor</span>
      <input v-model="model.author" type="search" placeholder="Nombre del autor…" />
    </label>

    <label class="collection-filter-field">
      <span>Idioma</span>
      <PurpleSelect v-model="model.language" :options="LANGUAGES.map(language => ({ value: language, label: language }))" placeholder="Todos" aria-label="Filtrar por idioma" searchable clearable compact />
    </label>

    <div class="collection-filter-field">
      <span>Año</span>
      <div class="collection-filter-range">
        <input v-model="model.yearMin" type="number" inputmode="numeric" placeholder="Desde" aria-label="Año inicial" />
        <input v-model="model.yearMax" type="number" inputmode="numeric" placeholder="Hasta" aria-label="Año final" />
      </div>
    </div>

    <div class="collection-filter-field collection-filter-field--wide">
      <span>Géneros</span>
      <div class="collection-filter-chips">
        <button v-for="genre in genres" :key="genre" type="button" :class="{ active: model.genres.includes(genre) }"
          :aria-pressed="model.genres.includes(genre)" @click="toggleGenre(genre)">{{ genre }}</button>
        <small v-if="!genres.length">Aún no hay géneros asignados.</small>
      </div>
    </div>

    <label class="collection-filter-check collection-filter-field--wide">
      <input v-model="model.favoritesOnly" type="checkbox" />
      Solo favoritos
    </label>
  </section>
</template>

<style scoped>
.collection-filters{display:flex;flex-direction:column;gap:16px}.collection-filters__head{display:flex;align-items:center;justify-content:space-between}.collection-filters__head>span{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:800}.collection-filters__head svg{width:14px}.collection-filters__head button{display:flex;align-items:center;gap:5px;padding:5px;color:var(--accent);background:transparent;border:0;font:650 10.5px inherit;cursor:pointer}.collection-filter-field{display:grid;gap:6px}.collection-filter-field>span{color:var(--text-faint);font-size:9.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.collection-filter-field input,.collection-filter-field select{width:100%;height:36px;padding:0 10px;color:var(--text);background:var(--surface-2);border:1px solid var(--border);border-radius:8px;outline:none;font:11.5px inherit}.collection-filter-field input:focus,.collection-filter-field select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}.collection-filter-range{display:grid;grid-template-columns:1fr 1fr;gap:7px}.collection-filter-chips{display:flex;flex-wrap:wrap;gap:5px;max-height:126px;overflow:auto}.collection-filter-chips button{padding:5px 8px;color:var(--text-dim);background:var(--surface-2);border:1px solid var(--border);border-radius:999px;font:600 10px inherit;cursor:pointer}.collection-filter-chips button.active{color:#efe8ff;background:var(--accent-soft);border-color:var(--accent)}.collection-filter-chips small{color:var(--text-faint)}.collection-filter-check{display:flex;align-items:center;gap:8px;color:var(--text-dim);font-size:11.5px}.collection-filters--compact{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:12px}.collection-filters--compact .collection-filters__head,.collection-filters--compact .collection-filter-field--wide{grid-column:1/-1}@media(max-width:900px){.collection-filters--compact{grid-template-columns:repeat(2,minmax(130px,1fr))}}@media(max-width:560px){.collection-filters--compact{grid-template-columns:1fr}}
</style>
