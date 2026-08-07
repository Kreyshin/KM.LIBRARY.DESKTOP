<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{ pages: string[]; modelValue: number }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>();

const total = computed(() => props.pages.length);
const currentSrc = computed(() => props.pages[props.modelValue - 1] || '');
const pageInput = ref(String(props.modelValue));

watch(() => props.modelValue, (value) => {
  if (Number(pageInput.value) !== value) pageInput.value = String(value);
});

function goTo(page: number) {
  const clamped = Math.min(Math.max(page, 1), total.value || 1);
  if (clamped !== props.modelValue) emit('update:modelValue', clamped);
}

function next() { goTo(props.modelValue + 1); }
function prev() { goTo(props.modelValue - 1); }

function commitPageInput() {
  const parsed = Math.round(Number(pageInput.value));
  const clamped = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), total.value || 1) : props.modelValue;
  pageInput.value = String(clamped);
  goTo(clamped);
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
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
      <span class="paged-reader__jump">
        <input
          v-model="pageInput"
          type="number"
          min="1"
          :max="total"
          aria-label="Ir a la página"
          @keydown.enter="commitPageInput"
          @blur="commitPageInput"
        />
        <span>/ {{ total }}</span>
      </span>
      <button type="button" :disabled="modelValue >= total" @click="next"><ChevronRight /></button>
    </div>
  </div>
</template>

<style scoped>
.paged-reader { display: flex; flex-direction: column; height: 100%; }
.paged-reader__stage { position: relative; flex: 1; overflow: hidden; background: #000; }
.paged-reader__stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; margin: auto; user-select: none; }
.paged-reader__zone { position: absolute; top: 0; bottom: 0; width: 35%; border: 0; background: none; cursor: pointer; }
.paged-reader__zone--prev { left: 0; }
.paged-reader__zone--next { right: 0; }
.paged-reader__toolbar { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 12px; color: var(--text); background: rgba(8, 11, 18, .92); border-top: 1px solid rgba(255, 255, 255, .08); }
.paged-reader__toolbar button { display: grid; place-items: center; width: 34px; height: 34px; color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; }
.paged-reader__toolbar button:disabled { opacity: .4; cursor: not-allowed; }
.paged-reader__jump { display: flex; align-items: center; gap: 6px; color: var(--text-dim); font-size: 13px; font-variant-numeric: tabular-nums; }
.paged-reader__jump input { width: 48px; height: 30px; padding: 0 6px; color: var(--text); background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px; outline: none; text-align: center; font: inherit; font-variant-numeric: tabular-nums; }
.paged-reader__jump input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(159, 107, 255, .18); }
.paged-reader__jump input::-webkit-inner-spin-button, .paged-reader__jump input::-webkit-outer-spin-button { margin: 0; }
</style>
