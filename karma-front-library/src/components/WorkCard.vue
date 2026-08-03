<script setup lang="ts">
import { computed } from 'vue';
import { BookCheck, Heart, Library, Star } from 'lucide-vue-next';
import { api, DEMOGRAPHICS, FORMATS, FORMAT_COLORS, type Obra } from '../api/client';

const props = defineProps<{ obra: Obra }>();
const emit = defineEmits<{ (e: 'click'): void; (e: 'updated', obra: Obra): void }>();

const fmt = computed(() => FORMAT_COLORS[props.obra.tipo]);
const fmtLabel = computed(() => FORMATS.find((f) => f.value === props.obra.tipo)?.label || props.obra.tipo);
const demographicLabel = computed(() => DEMOGRAPHICS.find((item) => item.value === props.obra.demographic)?.label);

const owned = computed(() => props.obra.volumes.filter((v) => v.ownership !== 'NOT_OWNED').length);
const read = computed(() => props.obra.volumes.filter((v) => v.read).length);
const total = computed(() => props.obra.volumes.length);
const pct = computed(() => (total.value > 0 ? Math.round((read.value / total.value) * 100) : 0));

async function toggleFav(e: Event) {
  e.stopPropagation();
  const updated = await api.update(props.obra.id, { favorite: !props.obra.favorite });
  emit('updated', updated);
}
</script>

<template>
  <article class="card work-card" role="button" tabindex="0" :aria-label="`Abrir ${obra.titulo}`"
    @click="$emit('click')" @keydown.enter="$emit('click')" @keydown.space.prevent="$emit('click')">
    <img v-if="obra.coverPath" class="work-cover" :src="obra.thumbnailPath || obra.coverPath" :alt="`Portada de ${obra.titulo}`"
      loading="lazy" decoding="async" width="320" height="480" />
    <!-- TODO(assets): sin portada — el usuario la sube desde el modal de edición -->
    <div v-else class="work-cover-fallback">{{ obra.titulo }}</div>

    <div class="work-fmt fmt-chip" :style="{ '--fmt-icon-bg': fmt.bg, '--fmt-color': fmt.color }">
      <span class="fmt-dot" :style="{ background: fmt.color, color: fmt.color }"></span>{{ fmtLabel }}
    </div>

    <button type="button" class="work-fav" :class="{ active: obra.favorite }" :aria-label="obra.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'" @click="toggleFav">
      <Heart :fill="obra.favorite ? 'currentColor' : 'none'" />
    </button>

    <div class="work-body">
      <div class="work-title">{{ obra.titulo }}</div>
      <div class="work-author">{{ obra.autor || 'Autor desconocido' }}</div>
      <span v-if="demographicLabel" class="work-demographic">{{ demographicLabel }}</span>

      <div v-if="total > 0" class="mini-progress"><div class="mini-progress-fill" :style="{ width: pct + '%' }"></div></div>
      <div v-if="total > 0" class="work-collection-stats">
        <span><Library /> {{ owned }}/{{ total }} adquiridos</span>
        <span><BookCheck /> {{ read }}/{{ total }} leídos</span>
      </div>

      <div v-if="obra.rating" class="work-rating">
        <Star fill="currentColor" /> {{ obra.rating.toFixed(1) }}
      </div>

      <div v-if="obra.genres.length" class="work-tags">
        <span v-for="g in obra.genres.slice(0, 2)" :key="g" class="work-tag">{{ g }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.work-demographic{display:inline-flex;margin-top:7px;padding:3px 7px;border:1px solid rgba(159,107,255,.2);border-radius:999px;background:rgba(159,107,255,.07);color:#bea4ec;font-size:8.5px;font-weight:750;text-transform:uppercase;letter-spacing:.05em}
.work-collection-stats{display:flex;flex-wrap:wrap;gap:5px 9px;margin-top:6px;color:var(--text-faint);font-size:8.5px}.work-collection-stats span{display:flex;align-items:center;gap:3px}.work-collection-stats svg{width:10px;height:10px}
</style>
