<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, FileUp, GripVertical, Save, Search, Trash2, X } from 'lucide-vue-next';
import { api, type DigitalFile } from '../api/client';
import { confirmAction, notifyError, notifySuccess } from '../services/notifications';

const props = defineProps<{ obraId: string; volumeNumber: number; file: DigitalFile }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'updated', file: DigitalFile): void }>();

const pages = ref<string[]>([]);
const dirty = ref(false);
const saving = ref(false);
const appending = ref(false);
const removing = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const dragIndex = ref<number | null>(null);
const selected = ref<Set<string>>(new Set());
const previewIndex = ref<number | null>(null);

function loadPages() {
  try { pages.value = JSON.parse(props.file.manifestJson || '[]'); } catch { pages.value = []; }
  dirty.value = false;
  selected.value = new Set();
}

watch(() => props.file, loadPages, { immediate: true });

const selectedCount = computed(() => selected.value.size);

function pageName(url: string) {
  return url.split('/').pop() || url;
}

function openPreview(index: number) {
  previewIndex.value = index;
}

function closePreview() {
  previewIndex.value = null;
}

function previewPrev() {
  if (previewIndex.value === null) return;
  previewIndex.value = Math.max(0, previewIndex.value - 1);
}

function previewNext() {
  if (previewIndex.value === null) return;
  previewIndex.value = Math.min(pages.value.length - 1, previewIndex.value + 1);
}

function onPreviewKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closePreview();
  else if (event.key === 'ArrowLeft') previewPrev();
  else if (event.key === 'ArrowRight') previewNext();
}

watch(previewIndex, (value, previous) => {
  if (value !== null && previous === null) document.addEventListener('keydown', onPreviewKeydown);
  else if (value === null && previous !== null) document.removeEventListener('keydown', onPreviewKeydown);
});

onBeforeUnmount(() => document.removeEventListener('keydown', onPreviewKeydown));

function toggleSelected(page: string) {
  const next = new Set(selected.value);
  if (next.has(page)) next.delete(page);
  else next.add(page);
  selected.value = next;
}

function moveUp(index: number) {
  if (index <= 0) return;
  [pages.value[index - 1], pages.value[index]] = [pages.value[index], pages.value[index - 1]];
  dirty.value = true;
}

function moveDown(index: number) {
  if (index >= pages.value.length - 1) return;
  [pages.value[index], pages.value[index + 1]] = [pages.value[index + 1], pages.value[index]];
  dirty.value = true;
}

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

function onDrop(index: number) {
  if (dragIndex.value === null || dragIndex.value === index) return;
  const [moved] = pages.value.splice(dragIndex.value, 1);
  pages.value.splice(index, 0, moved);
  dirty.value = true;
  dragIndex.value = null;
}

function onDragEnd() {
  dragIndex.value = null;
}

async function saveOrder() {
  saving.value = true;
  try {
    const updated = await api.reorderDigitalPages(props.obraId, props.volumeNumber, props.file.id, pages.value);
    dirty.value = false;
    emit('updated', updated);
    notifySuccess('Orden guardado');
  } catch (cause: any) {
    notifyError('No se pudo guardar el orden', cause?.message);
  } finally {
    saving.value = false;
  }
}

function pickFiles() {
  fileInput.value?.click();
}

async function onFilesChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = input.files ? Array.from(input.files) : [];
  if (!files.length) return;

  appending.value = true;
  try {
    const updated = await api.appendDigitalPages(props.obraId, props.volumeNumber, props.file.id, files);
    pages.value = JSON.parse(updated.manifestJson || '[]');
    dirty.value = false;
    emit('updated', updated);
    notifySuccess('Páginas agregadas', `Se sumaron ${files.length} imagen(es) al final.`);
  } catch (cause: any) {
    notifyError('No se pudieron agregar las páginas', cause?.message);
  } finally {
    appending.value = false;
    input.value = '';
  }
}

async function removePages(pagesToRemove: string[]) {
  if (pagesToRemove.length >= pages.value.length) {
    notifyError('No puedes eliminar todas las páginas', 'Elimina el archivo completo en su lugar.');
    return;
  }
  removing.value = true;
  try {
    const updated = await api.removeDigitalPages(props.obraId, props.volumeNumber, props.file.id, pagesToRemove);
    pages.value = JSON.parse(updated.manifestJson || '[]');
    const next = new Set(selected.value);
    pagesToRemove.forEach((page) => next.delete(page));
    selected.value = next;
    dirty.value = false;
    emit('updated', updated);
    notifySuccess(pagesToRemove.length > 1 ? 'Páginas eliminadas' : 'Página eliminada');
  } catch (cause: any) {
    notifyError('No se pudieron eliminar las páginas', cause?.message);
  } finally {
    removing.value = false;
  }
}

async function removeSinglePage(page: string) {
  const confirmed = await confirmAction({
    title: '¿Eliminar esta página?',
    description: 'La imagen se eliminará permanentemente del disco.',
    confirmLabel: 'Eliminar página',
    danger: true,
  });
  if (!confirmed) return;
  await removePages([page]);
}

async function removeSelectedPages() {
  const confirmed = await confirmAction({
    title: `¿Eliminar ${selectedCount.value} página(s)?`,
    description: 'Las imágenes seleccionadas se eliminarán permanentemente del disco.',
    confirmLabel: 'Eliminar seleccionadas',
    danger: true,
  });
  if (!confirmed) return;
  await removePages([...selected.value]);
}
</script>

<template>
  <div class="pages-modal-overlay" @click.self="$emit('close')">
    <section class="pages-modal" role="dialog" aria-modal="true">
      <header class="pages-modal__header">
        <div>
          <span class="pages-modal__eyebrow">PÁGINAS</span>
          <h2>{{ file.label || file.originalName }}</h2>
          <p>Agrega más imágenes al final, arrastra para reordenar o selecciona para eliminar.</p>
        </div>
        <button type="button" class="pages-modal__close" aria-label="Cerrar" @click="$emit('close')"><X /></button>
      </header>

      <div class="pages-modal__body">
        <div class="pages-modal__actions">
          <button type="button" class="pages-upload-button" :disabled="appending" @click="pickFiles">
            <FileUp /> {{ appending ? 'Agregando…' : 'Agregar más imágenes' }}
          </button>
          <div class="pages-modal__actions-right">
            <button type="button" class="pages-delete-button" :disabled="!selectedCount || removing" @click="removeSelectedPages">
              <Trash2 /> {{ removing ? 'Eliminando…' : `Eliminar seleccionadas (${selectedCount})` }}
            </button>
            <button type="button" class="pages-save-button" :disabled="!dirty || saving" @click="saveOrder">
              <Save /> {{ saving ? 'Guardando…' : 'Guardar orden' }}
            </button>
          </div>
        </div>
        <input ref="fileInput" type="file" hidden multiple accept="image/*" @change="onFilesChosen" />

        <ol class="pages-list">
          <li
            v-for="(page, index) in pages"
            :key="page"
            class="pages-row"
            :class="{ dragging: dragIndex === index, selected: selected.has(page) }"
            draggable="true"
            @dragstart="onDragStart(index, $event)"
            @dragover="onDragOver"
            @drop="onDrop(index)"
            @dragend="onDragEnd"
          >
            <input type="checkbox" class="pages-row__check" :checked="selected.has(page)" @change="toggleSelected(page)" />
            <span class="pages-row__grip" aria-hidden="true"><GripVertical /></span>
            <span class="pages-row__number">{{ index + 1 }}</span>
            <button type="button" class="pages-row__thumb" aria-label="Ver en grande" @click="openPreview(index)">
              <img :src="page" :alt="`Página ${index + 1}`" draggable="false" />
            </button>
            <span class="pages-row__name">{{ pageName(page) }}</span>
            <div class="pages-row__actions">
              <button type="button" aria-label="Ver en grande" @click="openPreview(index)"><Search /></button>
              <button type="button" :disabled="index === 0" aria-label="Mover arriba" @click="moveUp(index)"><ArrowUp /></button>
              <button type="button" :disabled="index === pages.length - 1" aria-label="Mover abajo" @click="moveDown(index)"><ArrowDown /></button>
              <button type="button" class="pages-row__delete" aria-label="Eliminar página" @click="removeSinglePage(page)"><Trash2 /></button>
            </div>
          </li>
        </ol>
      </div>
    </section>
  </div>

  <div v-if="previewIndex !== null" class="pages-preview-overlay" @click.self="closePreview">
    <button type="button" class="pages-preview-close" aria-label="Cerrar vista ampliada" @click="closePreview"><X /></button>
    <button type="button" class="pages-preview-nav pages-preview-nav--prev" :disabled="previewIndex === 0" aria-label="Página anterior" @click="previewPrev"><ChevronLeft /></button>
    <img class="pages-preview-image" :src="pages[previewIndex]" :alt="`Página ${previewIndex + 1}`" />
    <button type="button" class="pages-preview-nav pages-preview-nav--next" :disabled="previewIndex === pages.length - 1" aria-label="Página siguiente" @click="previewNext"><ChevronRight /></button>
    <span class="pages-preview-count">{{ previewIndex + 1 }} / {{ pages.length }}</span>
  </div>
</template>

<style scoped>
.pages-modal-overlay { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 24px; background: rgba(2, 4, 10, .78); backdrop-filter: blur(12px); }
.pages-modal { width: min(620px, 100%); max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; color: var(--text); background: #080b12; border: 1px solid rgba(255, 255, 255, .075); border-radius: 16px; box-shadow: 0 34px 90px rgba(0, 0, 0, .62); }
.pages-modal__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 20px 22px 16px; border-bottom: 1px solid rgba(255, 255, 255, .06); }
.pages-modal__eyebrow { display: block; margin-bottom: 6px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .11em; }
.pages-modal__header h2 { margin: 0 0 4px; font-size: 17px; }
.pages-modal__header p { margin: 0; color: var(--text-dim); font-size: 11.5px; }
.pages-modal__close { width: 32px; height: 32px; display: grid; place-items: center; color: var(--text-dim); background: #0d111a; border: 1px solid rgba(255, 255, 255, .075); border-radius: 8px; cursor: pointer; }
.pages-modal__body { flex: 1; overflow-y: auto; padding: 18px 22px 22px; }
.pages-modal__actions { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.pages-modal__actions-right { display: flex; gap: 10px; flex-wrap: wrap; }
.pages-upload-button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border: 1px solid rgba(159, 107, 255, .38); border-radius: 8px; background: rgba(159, 107, 255, .11); color: #d9c7ff; font: 700 11px inherit; cursor: pointer; }
.pages-upload-button:hover:not(:disabled) { background: rgba(159, 107, 255, .18); border-color: var(--accent); }
.pages-upload-button svg { width: 14px; height: 14px; }
.pages-upload-button:disabled, .pages-save-button:disabled, .pages-delete-button:disabled { opacity: .5; cursor: not-allowed; }
.pages-save-button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; color: #fff; background: var(--accent-gradient); border: 0; border-radius: 8px; font: 700 11px inherit; cursor: pointer; }
.pages-save-button svg { width: 14px; height: 14px; }
.pages-delete-button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; color: #fca5a5; background: rgba(248, 113, 113, .09); border: 1px solid rgba(248, 113, 113, .28); border-radius: 8px; font: 700 11px inherit; cursor: pointer; }
.pages-delete-button:hover:not(:disabled) { background: rgba(248, 113, 113, .16); border-color: #f87171; }
.pages-delete-button svg { width: 14px; height: 14px; }
.pages-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pages-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #0d111a; border: 1px solid rgba(255, 255, 255, .06); border-radius: 8px; cursor: grab; }
.pages-row.dragging { opacity: .4; border-style: dashed; }
.pages-row.selected { border-color: rgba(159, 107, 255, .5); background: rgba(159, 107, 255, .06); }
.pages-row__check { appearance: none; -webkit-appearance: none; width: 16px; height: 16px; flex-shrink: 0; margin: 0; border: 1.5px solid rgba(159, 107, 255, .5); border-radius: 4px; background: rgba(159, 107, 255, .1); cursor: pointer; position: relative; transition: background .15s, border-color .15s; }
.pages-row__check:hover { border-color: var(--accent); }
.pages-row__check:checked { background: var(--accent-gradient); border-color: var(--accent); }
.pages-row__check:checked::after { content: ''; position: absolute; left: 5px; top: 2px; width: 3px; height: 7px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.pages-row__grip { display: grid; place-items: center; color: var(--text-faint); flex-shrink: 0; }
.pages-row__grip svg { width: 14px; height: 14px; }
.pages-row__number { min-width: 22px; color: var(--text-faint); font-size: 11px; font-weight: 700; text-align: center; }
.pages-row__thumb { padding: 0; border: 0; background: none; cursor: zoom-in; flex-shrink: 0; }
.pages-row__thumb img { width: 40px; height: 56px; object-fit: cover; border-radius: 4px; background: #05070d; display: block; }
.pages-row__name { flex: 1; overflow: hidden; color: var(--text-dim); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; }
.pages-row__actions { display: flex; gap: 4px; flex-shrink: 0; }
.pages-row__actions button { width: 26px; height: 26px; display: grid; place-items: center; color: var(--text-dim); background: #05070d; border: 1px solid rgba(255, 255, 255, .075); border-radius: 6px; cursor: pointer; }
.pages-row__actions button:hover:not(:disabled) { color: var(--accent); border-color: rgba(159, 107, 255, .3); }
.pages-row__actions button:disabled { opacity: .35; cursor: not-allowed; }
.pages-row__actions svg { width: 13px; height: 13px; }
.pages-row__delete:hover { color: #fca5a5 !important; border-color: rgba(248, 113, 113, .35) !important; }
.pages-preview-overlay { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; background: rgba(2, 4, 10, .92); backdrop-filter: blur(6px); }
.pages-preview-image { max-width: 88vw; max-height: 88vh; object-fit: contain; border-radius: 6px; box-shadow: 0 30px 90px rgba(0, 0, 0, .6); }
.pages-preview-close { position: absolute; top: 20px; right: 20px; width: 38px; height: 38px; display: grid; place-items: center; color: var(--text); background: rgba(13, 17, 26, .85); border: 1px solid rgba(255, 255, 255, .1); border-radius: 9px; cursor: pointer; }
.pages-preview-close:hover { border-color: var(--accent); }
.pages-preview-close svg { width: 17px; height: 17px; }
.pages-preview-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 46px; height: 46px; display: grid; place-items: center; color: var(--text); background: rgba(13, 17, 26, .85); border: 1px solid rgba(255, 255, 255, .1); border-radius: 50%; cursor: pointer; }
.pages-preview-nav:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.pages-preview-nav:disabled { opacity: .3; cursor: not-allowed; }
.pages-preview-nav svg { width: 20px; height: 20px; }
.pages-preview-nav--prev { left: 24px; }
.pages-preview-nav--next { right: 24px; }
.pages-preview-count { position: absolute; bottom: 22px; left: 50%; transform: translateX(-50%); padding: 6px 14px; color: var(--text-dim); background: rgba(13, 17, 26, .85); border: 1px solid rgba(255, 255, 255, .1); border-radius: 999px; font-size: 12px; font-variant-numeric: tabular-nums; }
</style>
