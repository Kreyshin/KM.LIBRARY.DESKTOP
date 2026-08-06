<script setup lang="ts">
import { ref, watch } from 'vue';
import { ArrowDown, ArrowUp, FileUp, Save, X } from 'lucide-vue-next';
import { api, type DigitalFile } from '../api/client';
import { notifyError, notifySuccess } from '../services/notifications';

const props = defineProps<{ obraId: string; volumeNumber: number; file: DigitalFile }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'updated', file: DigitalFile): void }>();

const pages = ref<string[]>([]);
const dirty = ref(false);
const saving = ref(false);
const appending = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function loadPages() {
  try { pages.value = JSON.parse(props.file.manifestJson || '[]'); } catch { pages.value = []; }
  dirty.value = false;
}

watch(() => props.file, loadPages, { immediate: true });

function pageName(url: string) {
  return url.split('/').pop() || url;
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
</script>

<template>
  <div class="pages-modal-overlay" @click.self="$emit('close')">
    <section class="pages-modal" role="dialog" aria-modal="true">
      <header class="pages-modal__header">
        <div>
          <span class="pages-modal__eyebrow">PÁGINAS</span>
          <h2>{{ file.label || file.originalName }}</h2>
          <p>Agrega más imágenes al final o cambia el orden de lectura.</p>
        </div>
        <button type="button" class="pages-modal__close" aria-label="Cerrar" @click="$emit('close')"><X /></button>
      </header>

      <div class="pages-modal__body">
        <div class="pages-modal__actions">
          <button type="button" class="new-edition-button" :disabled="appending" @click="pickFiles">
            <FileUp /> {{ appending ? 'Agregando…' : 'Agregar más imágenes' }}
          </button>
          <button type="button" class="pages-save-button" :disabled="!dirty || saving" @click="saveOrder">
            <Save /> {{ saving ? 'Guardando…' : 'Guardar orden' }}
          </button>
        </div>
        <input ref="fileInput" type="file" hidden multiple accept="image/*" @change="onFilesChosen" />

        <ol class="pages-list">
          <li v-for="(page, index) in pages" :key="page" class="pages-row">
            <span class="pages-row__number">{{ index + 1 }}</span>
            <img :src="page" :alt="`Página ${index + 1}`" />
            <span class="pages-row__name">{{ pageName(page) }}</span>
            <div class="pages-row__actions">
              <button type="button" :disabled="index === 0" aria-label="Mover arriba" @click="moveUp(index)"><ArrowUp /></button>
              <button type="button" :disabled="index === pages.length - 1" aria-label="Mover abajo" @click="moveDown(index)"><ArrowDown /></button>
            </div>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pages-modal-overlay { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 24px; background: rgba(2, 4, 10, .78); backdrop-filter: blur(12px); }
.pages-modal { width: min(560px, 100%); max-height: 88vh; display: flex; flex-direction: column; overflow: hidden; color: var(--text); background: #080b12; border: 1px solid rgba(255, 255, 255, .075); border-radius: 16px; box-shadow: 0 34px 90px rgba(0, 0, 0, .62); }
.pages-modal__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; padding: 20px 22px 16px; border-bottom: 1px solid rgba(255, 255, 255, .06); }
.pages-modal__eyebrow { display: block; margin-bottom: 6px; color: var(--accent); font-size: 10px; font-weight: 800; letter-spacing: .11em; }
.pages-modal__header h2 { margin: 0 0 4px; font-size: 17px; }
.pages-modal__header p { margin: 0; color: var(--text-dim); font-size: 11.5px; }
.pages-modal__close { width: 32px; height: 32px; display: grid; place-items: center; color: var(--text-dim); background: #0d111a; border: 1px solid rgba(255, 255, 255, .075); border-radius: 8px; cursor: pointer; }
.pages-modal__body { flex: 1; overflow-y: auto; padding: 18px 22px 22px; }
.pages-modal__actions { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.new-edition-button:disabled, .pages-save-button:disabled { opacity: .5; cursor: not-allowed; }
.pages-save-button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; color: #fff; background: var(--accent-gradient); border: 0; border-radius: 8px; font: 700 11px inherit; cursor: pointer; }
.pages-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.pages-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: #0d111a; border: 1px solid rgba(255, 255, 255, .06); border-radius: 8px; }
.pages-row__number { min-width: 22px; color: var(--text-faint); font-size: 11px; font-weight: 700; text-align: center; }
.pages-row img { width: 40px; height: 56px; object-fit: cover; border-radius: 4px; background: #05070d; flex-shrink: 0; }
.pages-row__name { flex: 1; overflow: hidden; color: var(--text-dim); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.pages-row__actions { display: flex; gap: 4px; flex-shrink: 0; }
.pages-row__actions button { width: 26px; height: 26px; display: grid; place-items: center; color: var(--text-dim); background: #05070d; border: 1px solid rgba(255, 255, 255, .075); border-radius: 6px; cursor: pointer; }
.pages-row__actions button:hover:not(:disabled) { color: var(--accent); border-color: rgba(159, 107, 255, .3); }
.pages-row__actions button:disabled { opacity: .35; cursor: not-allowed; }
.pages-row__actions svg { width: 13px; height: 13px; }
</style>
