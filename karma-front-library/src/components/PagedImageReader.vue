<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{ pages: string[]; modelValue: number }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>();

const total = computed(() => props.pages.length);
const currentSrc = computed(() => props.pages[props.modelValue - 1] || '');

function goTo(page: number) {
  const clamped = Math.min(Math.max(page, 1), total.value || 1);
  if (clamped !== props.modelValue) emit('update:modelValue', clamped);
}

function next() { goTo(props.modelValue + 1); }
function prev() { goTo(props.modelValue - 1); }

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') next();
  else if (event.key === 'ArrowLeft') prev();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="paged-reader">
    <div class="paged-reader__stage">
      <button type="button" class="paged-reader__zone paged-reader__zone--prev" aria-label="Página anterior" @click="prev"></button>
      <img v-if="currentSrc" :src="currentSrc" :alt="`Página ${modelValue}`" />
      <button type="button" class="paged-reader__zone paged-reader__zone--next" aria-label="Página siguiente" @click="next"></button>
    </div>
    <div class="paged-reader__toolbar">
      <button type="button" :disabled="modelValue <= 1" @click="prev"><ChevronLeft /></button>
      <span>{{ modelValue }} / {{ total }}</span>
      <button type="button" :disabled="modelValue >= total" @click="next"><ChevronRight /></button>
    </div>
  </div>
</template>

<style scoped>
.paged-reader { display: flex; flex-direction: column; height: 100%; }
.paged-reader__stage { position: relative; flex: 1; display: grid; place-items: center; overflow: hidden; background: #000; }
.paged-reader__stage img { max-width: 100%; max-height: 100%; object-fit: contain; user-select: none; }
.paged-reader__zone { position: absolute; top: 0; bottom: 0; width: 35%; border: 0; background: none; cursor: pointer; }
.paged-reader__zone--prev { left: 0; }
.paged-reader__zone--next { right: 0; }
.paged-reader__toolbar { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px; color: var(--text); background: rgba(8, 11, 18, .92); border-top: 1px solid rgba(255, 255, 255, .08); }
.paged-reader__toolbar button { display: grid; place-items: center; width: 34px; height: 34px; color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
.paged-reader__toolbar button:disabled { opacity: .4; cursor: not-allowed; }
.paged-reader__toolbar span { min-width: 70px; text-align: center; color: var(--text-dim); font-size: 13px; font-variant-numeric: tabular-nums; }
</style>
