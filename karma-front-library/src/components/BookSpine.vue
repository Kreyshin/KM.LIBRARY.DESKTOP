<script setup lang="ts">
import { computed, ref } from 'vue';
import { FORMAT_COLORS, type Obra, type Volume } from '../api/client';

const props = defineProps<{
  obra: Obra;
  volume: Volume;
}>();

defineEmits<{
  (event: 'click'): void;
}>();

const imageRatio = ref<number | null>(null);

const PALETTE = [
  '#17121f',
  '#21152f',
  '#151d2b',
  '#251525',
  '#142523',
  '#252018',
  '#161624',
  '#241923',
];

function hash(value: string) {
  let result = 0;

  for (let index = 0; index < value.length; index += 1) {
    result = value.charCodeAt(index) + ((result << 5) - result);
  }

  return Math.abs(result);
}

const format = computed(() => FORMAT_COLORS[props.obra.tipo]);

const hasSpineImage = computed(() => Boolean(props.volume.spinePath));

const generatedColor = computed(
  () => PALETTE[hash(props.obra.id) % PALETTE.length],
);

const generatedAccent = computed(() => format.value.color);

const generatedWidth = computed(
  () => 42 + (hash(`${props.obra.id}:${props.volume.number}`) % 7),
);

const realWidth = computed(() => {
  if (!imageRatio.value) return 46;

  const calculated = Math.round(250 * imageRatio.value);
  return Math.min(92, Math.max(28, calculated));
});

const statusClass = computed(() => {
  if (props.volume.read || props.volume.status === 'COMPLETED') {
    return 'book-spine__status--read';
  }

  if (props.volume.status === 'READING') {
    return 'book-spine__status--reading';
  }

  if (props.volume.status === 'OWNED') {
    return 'book-spine__status--owned';
  }

  return '';
});

const spineStyle = computed(() => ({
  '--spine-width': `${hasSpineImage.value ? realWidth.value : generatedWidth.value}px`,
  '--spine-color': generatedColor.value,
  '--spine-accent': generatedAccent.value,
}));

function onImageLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement;

  if (!image.naturalWidth || !image.naturalHeight) return;

  imageRatio.value = image.naturalWidth / image.naturalHeight;
}
</script>

<template>
  <button
    type="button"
    class="book-spine"
    :class="{
      'book-spine--real': hasSpineImage,
      'book-spine--generated': !hasSpineImage,
    }"
    :style="spineStyle"
    :title="`${obra.titulo} · Tomo ${volume.number}`"
    @click="$emit('click')"
  >
    <img
      v-if="hasSpineImage"
      class="book-spine__image"
      :src="volume.spinePath ?? undefined"
      :alt="`${obra.titulo} tomo ${volume.number}`"
      @load="onImageLoad"
    />

    <template v-else>
      <span class="book-spine__top-mark" />

      <span class="book-spine__title">
        {{ obra.titulo }}
      </span>

      <strong class="book-spine__number">
        {{ volume.number }}
      </strong>

      <span class="book-spine__author">
        {{ obra.autor || 'Karma Library' }}
      </span>
    </template>

    <span
      class="book-spine__status"
      :class="statusClass"
      aria-hidden="true"
    />
  </button>
</template>

<style scoped>
.book-spine {
  --spine-width: 44px;
  --spine-color: #17121f;
  --spine-accent: var(--accent);

  position: relative;
  width: var(--spine-width);
  height: 250px;
  flex: 0 0 var(--spine-width);
  padding: 0;
  overflow: hidden;
  color: var(--text);
  background: transparent;
  border: 0;
  border-radius: 3px 3px 1px 1px;
  outline: none;
  cursor: pointer;
  transform-origin: bottom center;
  transition:
    transform .18s cubic-bezier(.2, .8, .3, 1),
    filter .18s ease,
    box-shadow .18s ease;
}

.book-spine:hover,
.book-spine:focus-visible {
  z-index: 8;
  transform: translateY(-10px) scale(1.025);
  filter: brightness(1.07);
}

.book-spine:focus-visible {
  box-shadow: 0 0 0 2px var(--spine-accent);
}

.book-spine--real {
  background: transparent;
  box-shadow:
    4px 9px 12px -6px rgba(0, 0, 0, .72);
}

.book-spine--real:hover {
  box-shadow:
    7px 17px 20px -10px rgba(0, 0, 0, .82),
    0 0 18px -8px rgba(159, 107, 255, .5);
}

.book-spine__image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: fill;
  object-position: center;
  pointer-events: none;
}

.book-spine--generated {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 11px 5px 10px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, .08), transparent 14%, transparent 82%, rgba(0, 0, 0, .36)),
    linear-gradient(180deg, rgba(255, 255, 255, .045), transparent 24%, rgba(0, 0, 0, .28)),
    var(--spine-color);
  border: 1px solid rgba(255, 255, 255, .08);
  box-shadow:
    inset 2px 0 3px rgba(255, 255, 255, .045),
    inset -3px 0 4px rgba(0, 0, 0, .38),
    4px 9px 12px -6px rgba(0, 0, 0, .72);
}

.book-spine--generated::after {
  content: '';
  position: absolute;
  inset: 4px 3px;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--spine-accent) 20%, transparent);
  border-radius: 2px;
}

.book-spine__top-mark {
  width: 16px;
  height: 2px;
  flex-shrink: 0;
  margin-bottom: 10px;
  background: var(--spine-accent);
  border-radius: 999px;
  box-shadow: 0 0 8px color-mix(in srgb, var(--spine-accent) 55%, transparent);
}

.book-spine__title {
  min-height: 0;
  flex: 1;
  overflow: hidden;
  color: #f4f0fb;
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: .025em;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-shadow: 0 1px 3px rgba(0, 0, 0, .6);
  text-transform: uppercase;
  writing-mode: vertical-rl;
}

.book-spine__number {
  position: relative;
  z-index: 1;
  min-width: 22px;
  margin: 9px 0;
  padding: 3px 4px;
  color: #fff;
  background: rgba(4, 6, 13, .6);
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 999px;
  font-size: 9px;
  text-align: center;
}

.book-spine__author {
  max-height: 54px;
  overflow: hidden;
  color: rgba(255, 255, 255, .55);
  font-size: 7px;
  font-weight: 650;
  letter-spacing: .035em;
  line-height: 1;
  text-transform: uppercase;
  writing-mode: vertical-rl;
}

.book-spine__status {
  position: absolute;
  right: 4px;
  bottom: 4px;
  z-index: 4;
  width: 7px;
  height: 7px;
  background: var(--text-faint);
  border: 1px solid rgba(4, 6, 13, .72);
  border-radius: 50%;
}

.book-spine__status--read,
.book-spine__status--owned {
  background: var(--success);
  box-shadow: 0 0 6px rgba(52, 211, 153, .65);
}

.book-spine__status--reading {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(159, 107, 255, .72);
}

@media (max-width: 620px) {
  .book-spine {
    height: 220px;
  }
}
</style>
