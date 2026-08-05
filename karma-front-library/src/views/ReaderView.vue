<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import ePub from 'epubjs';
import type Book from 'epubjs/types/book';
import type Rendition from 'epubjs/types/rendition';
import JSZip from 'jszip';
import { api, type DigitalFile } from '../api/client';
import { notifyError } from '../services/notifications';
import PagedImageReader from '../components/PagedImageReader.vue';

const route = useRoute();
const router = useRouter();

const obraId = route.params.obraId as string;
const volumeNumber = Number(route.params.volumeNumber);
const fileId = route.params.fileId as string;

const loading = ref(true);
const errorMessage = ref('');
const file = ref<DigitalFile | null>(null);
const obraTitle = ref('');

const epubContainer = ref<HTMLElement | null>(null);
let book: Book | null = null;
let rendition: Rendition | null = null;

const cbzLoading = ref(false);
const pages = ref<string[]>([]);
const currentPage = ref(1);
const pdfTotalPages = ref<number | null>(null);
let objectUrls: string[] = [];
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleSave(payload: { currentPage?: number; totalPages?: number; percent?: number; locator?: string }) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    api.saveDigitalProgress(obraId, volumeNumber, fileId, payload).catch(() => {});
  }, 800);
}

async function loadEpub(target: DigitalFile, initialLocator: string | null) {
  book = ePub(target.storedPath);
  await book.ready;
  rendition = book.renderTo(epubContainer.value as HTMLElement, { width: '100%', height: '100%', flow: 'paginated' });
  await rendition.display(initialLocator || undefined);
  rendition.on('relocated', (location: { start: { cfi: string; percentage: number } }) => {
    scheduleSave({ locator: location.start.cfi, percent: Math.round((location.start.percentage || 0) * 100) });
  });
}

async function loadCbz(target: DigitalFile, initialPage: number) {
  cbzLoading.value = true;
  try {
    const response = await fetch(target.storedPath);
    const blob = await response.blob();
    const zip = await JSZip.loadAsync(blob);
    const entries = Object.values(zip.files)
      .filter((entry) => !entry.dir && /\.(jpe?g|png|webp|gif)$/i.test(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const urls: string[] = [];
    for (const entry of entries) {
      const pageBlob = await entry.async('blob');
      urls.push(URL.createObjectURL(pageBlob));
    }
    objectUrls = urls;
    pages.value = urls;
    currentPage.value = Math.min(Math.max(initialPage, 1), urls.length || 1);
  } finally {
    cbzLoading.value = false;
  }
}

function loadImageFolder(target: DigitalFile, initialPage: number) {
  const manifest: string[] = JSON.parse(target.manifestJson || '[]');
  pages.value = manifest;
  currentPage.value = Math.min(Math.max(initialPage, 1), manifest.length || 1);
}

function onPageChange(page: number) {
  currentPage.value = page;
  const total = file.value?.pageCount ?? pages.value.length;
  scheduleSave({ currentPage: page, totalPages: total || undefined, percent: total ? Math.round((page / total) * 100) : undefined });
}

function savePdfProgress() {
  if (!pdfTotalPages.value) {
    scheduleSave({ currentPage: currentPage.value });
    return;
  }
  scheduleSave({
    currentPage: currentPage.value,
    totalPages: pdfTotalPages.value,
    percent: Math.round((currentPage.value / pdfTotalPages.value) * 100),
  });
}

async function init() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const [obra, files] = await Promise.all([
      api.get(obraId),
      api.listDigitalFiles(obraId, volumeNumber),
    ]);
    obraTitle.value = obra.titulo;
    const found = files.find((item) => item.id === fileId);
    if (!found) throw new Error('El archivo ya no existe en este tomo.');
    file.value = found;

    const progress = await api.getDigitalProgress(obraId, volumeNumber, fileId).catch(() => null);

    if (found.mediaType === 'EPUB') {
      await loadEpub(found, progress?.locator || null);
    } else if (found.mediaType === 'CBZ') {
      await loadCbz(found, progress?.currentPage || 1);
    } else if (found.mediaType === 'IMAGE_FOLDER') {
      loadImageFolder(found, progress?.currentPage || 1);
    } else if (found.mediaType === 'PDF') {
      currentPage.value = progress?.currentPage || 1;
      pdfTotalPages.value = progress?.totalPages || null;
    }
  } catch (cause: any) {
    errorMessage.value = cause?.message || 'No se pudo abrir el archivo.';
    notifyError('No se pudo abrir el archivo', errorMessage.value);
  } finally {
    loading.value = false;
  }
}

onMounted(init);

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer);
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  rendition?.destroy();
  book?.destroy();
});

function goBack() {
  router.back();
}
</script>

<template>
  <div class="reader-page">
    <header class="reader-toolbar">
      <button type="button" class="reader-back" @click="goBack"><ArrowLeft /> Volver</button>
      <div class="reader-title">
        <strong>{{ file?.label || file?.originalName || 'Lector' }}</strong>
        <span>{{ obraTitle }} · Tomo {{ volumeNumber }}</span>
      </div>
      <div class="reader-toolbar-spacer"></div>
    </header>

    <main class="reader-content">
      <p v-if="loading" class="reader-status">Abriendo archivo…</p>
      <p v-else-if="errorMessage" class="reader-status reader-status--error">{{ errorMessage }}</p>

      <div v-else-if="file?.mediaType === 'EPUB'" ref="epubContainer" class="reader-epub"></div>

      <div v-else-if="file?.mediaType === 'CBZ'" class="reader-fill">
        <p v-if="cbzLoading" class="reader-status">Descomprimiendo cómic…</p>
        <PagedImageReader v-else :pages="pages" :model-value="currentPage" @update:model-value="onPageChange" />
      </div>

      <div v-else-if="file?.mediaType === 'IMAGE_FOLDER'" class="reader-fill">
        <PagedImageReader :pages="pages" :model-value="currentPage" @update:model-value="onPageChange" />
      </div>

      <div v-else-if="file?.mediaType === 'PDF'" class="reader-fill reader-pdf">
        <iframe :src="file.storedPath" title="Documento PDF"></iframe>
        <div class="reader-pdf-progress">
          <label>Página actual<input v-model.number="currentPage" type="number" min="1" @change="savePdfProgress" /></label>
          <label>Total de páginas<input v-model.number="pdfTotalPages" type="number" min="1" @change="savePdfProgress" /></label>
          <span class="reader-pdf-note">El visor de PDF no reporta la página automáticamente: actualízala aquí para guardar tu progreso.</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.reader-page { display: flex; flex-direction: column; height: 100vh; background: #000; color: var(--text); }
.reader-toolbar { display: flex; align-items: center; gap: 16px; padding: 10px 16px; background: #0a0d14; border-bottom: 1px solid var(--border); }
.reader-back { display: inline-flex; align-items: center; gap: 6px; color: var(--text-dim); background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; cursor: pointer; }
.reader-back:hover { color: var(--text); border-color: var(--accent); }
.reader-title { display: flex; flex-direction: column; line-height: 1.3; }
.reader-title span { color: var(--text-faint); font-size: 11.5px; }
.reader-toolbar-spacer { flex: 1; }
.reader-content { flex: 1; min-height: 0; display: flex; }
.reader-fill { flex: 1; min-height: 0; display: flex; flex-direction: column; }
.reader-epub { flex: 1; min-height: 0; background: #fff; }
.reader-status { margin: auto; color: var(--text-dim); }
.reader-status--error { color: #fca5a5; }
.reader-pdf { position: relative; }
.reader-pdf iframe { flex: 1; border: 0; background: #fff; }
.reader-pdf-progress { display: flex; align-items: center; gap: 14px; padding: 10px 16px; background: #0a0d14; border-top: 1px solid var(--border); }
.reader-pdf-progress label { display: flex; align-items: center; gap: 8px; color: var(--text-dim); font-size: 12px; }
.reader-pdf-progress input { width: 70px; padding: 6px 8px; color: var(--text); background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 6px; }
.reader-pdf-note { color: var(--text-faint); font-size: 11px; }
</style>
