<script setup lang="ts">
import { SlidersHorizontal, RotateCcw } from 'lucide-vue-next';
import { DEMOGRAPHICS, FORMATS, LANGUAGES, STATUSES, VOLUME_OWNERSHIP } from '../api/client';
import { createCollectionFilters, type CollectionFiltersState } from '../composables/collectionFilters';

const props = withDefaults(defineProps<{
  genres?: string[];
  publishers?: string[];
  showSearch?: boolean;
  compact?: boolean;
}>(), { genres: () => [], publishers: () => [], showSearch: false, compact: false });

const model = defineModel<CollectionFiltersState>({ required: true });
const emit = defineEmits<{ (event: 'clear'): void }>();

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
      <select v-model="model.format">
        <option value="ALL">Todos</option>
        <option v-for="format in FORMATS" :key="format.value" :value="format.value">{{ format.label }}</option>
      </select>
    </label>

    <label class="collection-filter-field">
      <span>Demografía</span>
      <select v-model="model.demographic">
        <option value="ALL">Todas</option>
        <option v-for="item in DEMOGRAPHICS" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>

    <label class="collection-filter-field">
      <span>Estado de lectura</span>
      <select v-model="model.status">
        <option value="ALL">Todos</option>
        <option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ status.label }}</option>
      </select>
    </label>

    <label class="collection-filter-field">
      <span>Adquisición</span>
      <select v-model="model.ownership">
        <option value="ALL">Cualquier estado</option>
        <option v-for="ownership in VOLUME_OWNERSHIP" :key="ownership.value" :value="ownership.value">{{ ownership.label }}</option>
      </select>
    </label>

    <label class="collection-filter-field">
      <span>Editorial</span>
      <select v-model="model.publisher">
        <option value="">Todas</option>
        <option v-for="publisher in publishers" :key="publisher" :value="publisher">{{ publisher }}</option>
      </select>
    </label>

    <label class="collection-filter-field">
      <span>Autor</span>
      <input v-model="model.author" type="search" placeholder="Nombre del autor…" />
    </label>

    <label class="collection-filter-field">
      <span>Idioma</span>
      <select v-model="model.language">
        <option value="">Todos</option>
        <option v-for="language in LANGUAGES" :key="language" :value="language">{{ language }}</option>
      </select>
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
