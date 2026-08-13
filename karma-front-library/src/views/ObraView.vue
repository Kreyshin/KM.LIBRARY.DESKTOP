<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  Heart,
  Layers3,
  Pencil,
  Save,
  Star,
  Trash2,
  X,
} from 'lucide-vue-next';
import {
  api,
  DEMOGRAPHICS,
  FORMATS,
  FORMAT_COLORS,
  STATUSES,
  SUGGESTED_GENRES,
  type Genre,
  type Obra,
} from '../api/client';
import { useObrasStore } from '../stores/obras';
import ObraFormFields, { type ObraFormValue } from '../components/ObraFormFields.vue';
import VolumesTable from '../components/VolumesTable.vue';
import { confirmAction, notifyError, notifySuccess } from '../services/notifications';

type ObraTab = 'details' | 'volumes';

const route = useRoute();
const router = useRouter();
const store = useObrasStore();

const obra = ref<Obra | null>(null);
const loading = ref(true);
const loadError = ref('');
const editing = ref(false);
const activeTab = ref<ObraTab>('details');
const saving = ref(false);
const deleting = ref(false);
const error = ref('');
const genreCatalog = ref<Genre[]>([]);

const pendingCoverFile = ref<File | null>(null);
const pendingCoverPreview = ref<string | null>(null);

const f = ref<ObraFormValue>({
  titulo: '', originalTitle: '', autor: '', illustrator: '', publisher: '', releaseYear: '',
  tipo: 'MANGA', demographic: '', genres: [], language: '', status: 'NOT_STARTED',
  currentVolume: '', currentChapter: '', totalChapters: '', tags: [], rating: 0,
  description: '', personalReview: '', notes: '',
});

const genreSuggestions = computed(() => genreCatalog.value.length ? genreCatalog.value.map((genre) => genre.name) : SUGGESTED_GENRES);
const fmt = computed(() => (obra.value ? FORMAT_COLORS[obra.value.tipo] : null));
const fmtLabel = computed(() => FORMATS.find((format) => format.value === obra.value?.tipo)?.label || obra.value?.tipo);
const demographicLabel = computed(() => DEMOGRAPHICS.find((item) => item.value === obra.value?.demographic)?.label);
const statusLabel = computed(() => STATUSES.find((item) => item.value === obra.value?.status)?.label);
const volumeCount = computed(() => obra.value?.volumes.length ?? 0);
const ownedCount = computed(() => obra.value?.volumes.filter((v) => v.ownership !== 'NOT_OWNED').length ?? 0);
const readCount = computed(() => obra.value?.volumes.filter((v) => v.read).length ?? 0);

async function loadObra(id: string) {
  loading.value = true;
  loadError.value = '';
  editing.value = false;
  activeTab.value = route.query.tab === 'volumes' ? 'volumes' : 'details';

  try {
    obra.value = await api.get(id);
  } catch (cause: unknown) {
    loadError.value = cause instanceof Error ? cause.message : 'No se pudo cargar la obra.';
  } finally {
    loading.value = false;
  }
}

async function loadGenreCatalog() {
  try { genreCatalog.value = await api.listGenres(); }
  catch { genreCatalog.value = []; }
}

onMounted(() => {
  loadObra(route.params.id as string);
  loadGenreCatalog();
});

watch(() => route.params.id, (id) => { if (id) loadObra(id as string); });

function resetForm() {
  if (!obra.value) return;

  f.value = {
    titulo: obra.value.titulo || '',
    originalTitle: obra.value.originalTitle || '',
    autor: obra.value.autor || '',
    illustrator: obra.value.illustrator || '',
    publisher: obra.value.publisher || '',
    releaseYear: obra.value.releaseYear ? String(obra.value.releaseYear) : '',
    tipo: obra.value.tipo,
    demographic: obra.value.demographic || '',
    genres: [...obra.value.genres],
    language: obra.value.language || '',
    status: obra.value.status,
    currentVolume: obra.value.currentVolume ? String(obra.value.currentVolume) : '',
    currentChapter: obra.value.currentChapter ? String(obra.value.currentChapter) : '',
    totalChapters: obra.value.totalChapters ? String(obra.value.totalChapters) : '',
    tags: [...obra.value.tags],
    rating: obra.value.rating || 0,
    description: obra.value.description || '',
    personalReview: obra.value.personalReview || '',
    notes: obra.value.notes || '',
  };

  pendingCoverFile.value = null;
  pendingCoverPreview.value = obra.value.coverPath || null;
}

function startEdit() {
  resetForm();
  editing.value = true;
  error.value = '';
}

function cancelEdit() {
  if (pendingCoverPreview.value?.startsWith('blob:')) URL.revokeObjectURL(pendingCoverPreview.value);
  editing.value = false;
  error.value = '';
}

function onCoverChosen(file: File) {
  if (pendingCoverPreview.value?.startsWith('blob:')) URL.revokeObjectURL(pendingCoverPreview.value);
  pendingCoverFile.value = file;
  pendingCoverPreview.value = URL.createObjectURL(file);
  error.value = '';
}

function onCoverError(message: string) {
  error.value = message;
}

function removeCover() {
  if (pendingCoverPreview.value?.startsWith('blob:')) URL.revokeObjectURL(pendingCoverPreview.value);
  pendingCoverFile.value = null;
  pendingCoverPreview.value = null;
}

async function createGenre(name: string) {
  try {
    const genre = await api.createGenre(name);
    if (!genreCatalog.value.some((item) => item.id === genre.id)) genreCatalog.value.push(genre);
  } catch (cause: unknown) {
    notifyError('No se pudo guardar el género', cause instanceof Error ? cause.message : undefined);
  }
}

function buildPayload() {
  const supportsDemographic = ['MANGA', 'MANHWA', 'MANHUA'].includes(f.value.tipo);
  return {
    titulo: f.value.titulo.trim(),
    originalTitle: f.value.originalTitle.trim() || undefined,
    autor: f.value.autor.trim(),
    illustrator: f.value.illustrator.trim() || undefined,
    publisher: f.value.publisher.trim() || undefined,
    releaseYear: f.value.releaseYear ? Number.parseInt(f.value.releaseYear, 10) : undefined,
    tipo: f.value.tipo,
    demographic: supportsDemographic ? f.value.demographic || undefined : undefined,
    genres: f.value.genres,
    language: f.value.language || undefined,
    status: f.value.status,
    currentVolume: f.value.currentVolume ? Number.parseInt(f.value.currentVolume, 10) : undefined,
    currentChapter: f.value.currentChapter ? Number.parseInt(f.value.currentChapter, 10) : undefined,
    totalChapters: f.value.totalChapters ? Number.parseInt(f.value.totalChapters, 10) : undefined,
    tags: f.value.tags,
    rating: f.value.rating || undefined,
    description: f.value.description.trim() || undefined,
    personalReview: f.value.personalReview.trim() || undefined,
    notes: f.value.notes.trim() || undefined,
  };
}

function validate() {
  if (!f.value.titulo.trim()) { error.value = 'El título es obligatorio.'; return false; }
  if (!f.value.autor.trim()) { error.value = 'El autor es obligatorio.'; return false; }
  if (f.value.releaseYear && Number(f.value.releaseYear) < 0) { error.value = 'El año de lanzamiento no es válido.'; return false; }
  if (f.value.totalChapters && Number(f.value.totalChapters) < 0) { error.value = 'El total de capítulos no es válido.'; return false; }
  error.value = '';
  return true;
}

async function save() {
  if (!obra.value || !validate()) return;

  saving.value = true;
  error.value = '';

  try {
    const payload = buildPayload();
    let updated = await api.update(obra.value.id, payload);

    if (pendingCoverFile.value) {
      updated = await api.uploadObraCover(obra.value.id, pendingCoverFile.value);
      pendingCoverFile.value = null;
    }

    obra.value = updated;
    pendingCoverPreview.value = updated.coverPath || null;
    store.upsert(updated);
    editing.value = false;
    notifySuccess('Obra actualizada', 'Los cambios se guardaron correctamente.');
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar la obra.';
    notifyError('No se pudo guardar la obra', error.value);
  } finally {
    saving.value = false;
  }
}

async function removeObra() {
  if (!obra.value || deleting.value) return;

  const confirmed = await confirmAction({
    title: `¿Eliminar “${obra.value.titulo}”?`,
    description: 'También se eliminarán todos sus tomos, portadas y datos de lectura.',
    confirmLabel: 'Eliminar obra',
    danger: true,
  });
  if (!confirmed) return;

  deleting.value = true;

  try {
    const id = obra.value.id;
    const titulo = obra.value.titulo;
    await api.remove(id);
    store.remove(id);
    notifySuccess('Obra eliminada', `“${titulo}” fue retirada de tu biblioteca.`);
    router.push({ name: 'library' });
  } catch (cause: unknown) {
    notifyError('No se pudo eliminar la obra', cause instanceof Error ? cause.message : undefined);
    deleting.value = false;
  }
}

async function toggleFavorite() {
  if (!obra.value) return;
  const updated = await api.update(obra.value.id, { favorite: !obra.value.favorite });
  obra.value = updated;
  store.upsert(updated);
}

async function onVolumesChanged() {
  if (!obra.value) return;

  try {
    const fresh = await api.get(obra.value.id);
    obra.value = fresh;
    store.upsert(fresh);
  } catch (cause: unknown) {
    notifyError('No se pudieron actualizar los tomos', cause instanceof Error ? cause.message : undefined);
  }
}
</script>

<template>
  <div class="obra-page">
    <div v-if="loading" class="card obra-status">Cargando obra…</div>
    <div v-else-if="!obra" class="card obra-status obra-status--error">{{ loadError || 'No se encontró la obra.' }}</div>

    <template v-else>
      <button type="button" class="obra-back" @click="router.back()"><ArrowLeft /> Volver</button>

      <section class="obra-hero card">
        <div class="obra-hero__backdrop" :style="obra.coverPath ? { backgroundImage: `url(${obra.coverPath})` } : {}"></div>
        <div class="obra-hero__scrim"></div>

        <div class="obra-hero__cover">
          <img v-if="obra.coverPath" :src="obra.coverPath" :alt="`Portada de ${obra.titulo}`" />
          <div v-else class="obra-hero__cover-fallback"><BookOpen /></div>
        </div>

        <div class="obra-hero__identity">
          <div class="obra-hero__badges">
            <span class="obra-hero__format" :style="{ color: fmt?.color, background: fmt?.bg, borderColor: fmt?.color }">{{ fmtLabel }}</span>
            <span v-if="demographicLabel" class="obra-hero__pill">{{ demographicLabel }}</span>
            <span class="obra-hero__pill">{{ statusLabel }}</span>
          </div>
          <h1>{{ obra.titulo }}</h1>
          <p v-if="obra.originalTitle" class="obra-hero__original">{{ obra.originalTitle }}</p>
          <div class="obra-hero__meta">
            <span v-if="obra.autor">{{ obra.autor }}</span>
            <span v-if="obra.publisher">{{ obra.publisher }}</span>
            <span v-if="obra.releaseYear">{{ obra.releaseYear }}</span>
            <span v-if="obra.language">{{ obra.language }}</span>
          </div>
          <div v-if="obra.rating" class="obra-hero__rating"><Star fill="currentColor" /> {{ obra.rating.toFixed(1) }} / 5</div>
          <div v-if="obra.genres.length" class="obra-hero__tags">
            <span v-for="genre in obra.genres" :key="genre">{{ genre }}</span>
          </div>
          <div class="obra-hero__stats">
            <span><strong>{{ volumeCount }}</strong> tomos</span>
            <span><strong>{{ ownedCount }}</strong> adquiridos</span>
            <span><strong>{{ readCount }}</strong> leídos</span>
          </div>
        </div>

        <div class="obra-hero__actions">
          <button type="button" class="obra-hero__fav" :class="{ active: obra.favorite }" :aria-label="obra.favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'" @click="toggleFavorite">
            <Heart :fill="obra.favorite ? 'currentColor' : 'none'" />
          </button>
          <button v-if="!editing" type="button" class="obra-hero__edit" @click="startEdit"><Pencil /> Editar</button>
          <button v-else type="button" class="obra-hero__edit" @click="cancelEdit"><X /> Cerrar edición</button>
        </div>
      </section>

      <nav class="obra-tabs">
        <button type="button" class="obra-tab" :class="{ active: activeTab === 'details' }" @click="activeTab = 'details'"><FileText /> Información</button>
        <button type="button" class="obra-tab" :class="{ active: activeTab === 'volumes' }" @click="activeTab = 'volumes'"><Layers3 /> Tomos <span>{{ volumeCount }}</span></button>
      </nav>

      <div v-if="error" class="obra-error-banner">{{ error }}</div>

      <template v-if="activeTab === 'details'">
        <section v-if="!editing" class="obra-info-grid">
          <article class="card obra-info-card obra-info-card--wide">
            <h3>Sinopsis</h3>
            <p v-if="obra.description">{{ obra.description }}</p>
            <p v-else class="obra-empty-copy">Todavía no agregaste una sinopsis para esta obra.</p>
          </article>

          <article v-if="obra.personalReview" class="card obra-info-card">
            <h3>Reseña personal</h3>
            <p>{{ obra.personalReview }}</p>
          </article>

          <article v-if="obra.notes" class="card obra-info-card">
            <h3>Notas</h3>
            <p>{{ obra.notes }}</p>
          </article>

          <article class="card obra-info-card">
            <h3>Progreso</h3>
            <dl class="obra-meta-list">
              <div><dt>Tomo actual</dt><dd>{{ obra.currentVolume || '—' }}</dd></div>
              <div><dt>Capítulo actual</dt><dd>{{ obra.currentChapter || '—' }}</dd></div>
              <div><dt>Total de capítulos</dt><dd>{{ obra.totalChapters || '—' }}</dd></div>
            </dl>
          </article>

          <article v-if="obra.tags.length" class="card obra-info-card">
            <h3>Etiquetas</h3>
            <div class="obra-hero__tags"><span v-for="tag in obra.tags" :key="tag">{{ tag }}</span></div>
          </article>
        </section>

        <section v-else class="card obra-edit">
          <ObraFormFields
            v-model="f"
            :cover-preview="pendingCoverPreview"
            :genre-suggestions="genreSuggestions"
            @cover-chosen="onCoverChosen"
            @cover-error="onCoverError"
            @remove-cover="removeCover"
            @create-genre="createGenre"
          />

          <footer class="obra-edit__footer">
            <button type="button" class="danger-button" :disabled="deleting || saving" @click="removeObra"><Trash2 /> {{ deleting ? 'Eliminando…' : 'Eliminar obra' }}</button>
            <div class="obra-edit__actions">
              <button type="button" class="secondary-button" :disabled="saving || deleting" @click="cancelEdit">Cancelar</button>
              <button type="button" class="primary-button" :disabled="saving || deleting" @click="save"><Save /> {{ saving ? 'Guardando…' : 'Guardar cambios' }}</button>
            </div>
          </footer>
        </section>
      </template>

      <template v-else>
        <section class="card obra-volumes">
          <VolumesTable :obra-id="obra.id" :obra="obra" :volumes="obra.volumes" @changed="onVolumesChanged" />
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.obra-page { max-width: 1180px; margin: 0 auto; }
.obra-status { padding: 60px; text-align: center; color: var(--text-dim); }
.obra-status--error { color: #fca5a5; }
.obra-back { display: inline-flex; align-items: center; gap: 7px; margin-bottom: 14px; padding: 9px 13px; color: var(--text-dim); background: var(--surface); border: 1px solid var(--border); border-radius: 9px; font: 700 12px inherit; cursor: pointer; }
.obra-back:hover { color: var(--text); border-color: rgba(159, 107, 255, .3); }
.obra-back svg { width: 15px; height: 15px; }

.obra-hero { position: relative; min-height: 300px; overflow: hidden; display: flex; align-items: flex-end; gap: 26px; padding: 130px 34px 32px; }
.obra-hero__backdrop { position: absolute; inset: 0; z-index: -2; background-color: #0b0d15; background-repeat: no-repeat; background-size: cover; background-position: center 20%; filter: blur(18px) saturate(1.15) brightness(.55); transform: scale(1.15); }
.obra-hero__scrim { position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(4,6,13,.55) 0%, rgba(4,6,13,.35) 35%, rgba(8,10,17,.94) 92%), linear-gradient(100deg, rgba(4,6,13,.55), rgba(4,6,13,.15) 55%); }
.obra-hero__cover { position: relative; z-index: 2; flex-shrink: 0; width: 168px; aspect-ratio: 2/3; overflow: hidden; background: #05070d; border: 4px solid #0c0d16; border-radius: 14px; box-shadow: 0 0 0 1px rgba(184,145,255,.35), 0 20px 44px rgba(0,0,0,.5); }
.obra-hero__cover img { width: 100%; height: 100%; display: block; object-fit: cover; }
.obra-hero__cover-fallback { width: 100%; height: 100%; display: grid; place-items: center; color: var(--text-faint); background: linear-gradient(145deg, #211735, #0c0d16); }
.obra-hero__cover-fallback svg { width: 40px; height: 40px; }
.obra-hero__identity { position: relative; z-index: 2; flex: 1; min-width: 0; }
.obra-hero__badges { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px; }
.obra-hero__format { padding: 4px 10px; border: 1px solid; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
.obra-hero__pill { padding: 4px 10px; color: var(--text-dim); background: rgba(255,255,255,.06); border: 1px solid var(--border-strong); border-radius: 999px; font-size: 10px; font-weight: 700; }
.obra-hero__identity h1 { margin: 0 0 4px; font-size: 34px; letter-spacing: -.8px; line-height: 1.1; }
.obra-hero__original { margin: 0 0 10px; color: var(--text-faint); font-size: 13px; font-style: italic; }
.obra-hero__meta { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-bottom: 10px; color: var(--text-dim); font-size: 12px; }
.obra-hero__rating { display: inline-flex; align-items: center; gap: 6px; margin-bottom: 10px; color: var(--warning); font-size: 13px; font-weight: 700; }
.obra-hero__rating svg { width: 15px; height: 15px; }
.obra-hero__tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.obra-hero__tags span { padding: 3px 9px; color: #d8c2ff; background: rgba(159,107,255,.1); border: 1px solid rgba(159,107,255,.22); border-radius: 999px; font-size: 10.5px; }
.obra-hero__stats { display: flex; gap: 16px; color: var(--text-faint); font-size: 11.5px; }
.obra-hero__stats strong { color: var(--text); }
.obra-hero__actions { position: relative; z-index: 2; display: flex; align-items: flex-start; gap: 8px; flex-shrink: 0; }
.obra-hero__fav { width: 40px; height: 40px; display: grid; place-items: center; color: var(--text-dim); background: rgba(17,17,27,.8); border: 1px solid var(--border-strong); border-radius: 10px; cursor: pointer; }
.obra-hero__fav svg { width: 17px; height: 17px; }
.obra-hero__fav.active { color: #f472b6; border-color: rgba(244,114,182,.4); }
.obra-hero__edit { display: flex; align-items: center; gap: 8px; padding: 10px 15px; color: var(--text); background: rgba(17,17,27,.8); border: 1px solid var(--border-strong); border-radius: 10px; cursor: pointer; white-space: nowrap; }
.obra-hero__edit:hover { border-color: rgba(159,107,255,.5); }
.obra-hero__edit svg { width: 14px; height: 14px; }

.obra-tabs { display: flex; gap: 4px; margin: 18px 0 0; padding: 0 4px; border-bottom: 1px solid var(--border); }
.obra-tab { position: relative; display: inline-flex; align-items: center; gap: 7px; padding: 12px 15px; color: var(--text-dim); background: transparent; border: 0; font: 600 12.5px inherit; cursor: pointer; }
.obra-tab svg { width: 15px; height: 15px; }
.obra-tab > span { min-width: 20px; padding: 2px 6px; color: var(--text-faint); background: var(--surface-2); border-radius: 999px; font-size: 10px; }
.obra-tab.active { color: #f5f1ff; }
.obra-tab.active::after { content: ''; position: absolute; right: 10px; bottom: -1px; left: 10px; height: 2px; background: var(--accent-gradient); border-radius: 999px; box-shadow: 0 0 10px rgba(159,107,255,.55); }

.obra-error-banner { margin: 18px 0 0; padding: 11px 13px; color: #fca5a5; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.28); border-radius: 9px; font-size: 12.5px; }

.obra-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; margin-top: 20px; }
.obra-info-card { padding: 22px; }
.obra-info-card--wide { grid-column: 1/-1; }
.obra-info-card h3 { margin: 0 0 10px; font-size: 14px; }
.obra-info-card p { margin: 0; color: var(--text-dim); line-height: 1.6; white-space: pre-wrap; }
.obra-empty-copy { font-style: italic; color: var(--text-faint) !important; }
.obra-meta-list { display: grid; gap: 9px; margin: 0; }
.obra-meta-list > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.obra-meta-list dt { color: var(--text-faint); font-size: 11px; }
.obra-meta-list dd { margin: 0; color: var(--text); font-size: 12.5px; font-weight: 700; }

.obra-edit { margin-top: 20px; padding: 24px; }
.obra-edit__footer { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--border); }
.obra-edit__actions { display: flex; gap: 9px; }
.primary-button, .secondary-button, .danger-button { min-height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 15px; border-radius: 8px; font: 700 12px inherit; cursor: pointer; }
.primary-button svg, .danger-button svg { width: 14px; height: 14px; }
.primary-button { color: #fff; background: var(--accent-gradient); border: 1px solid rgba(201,169,255,.22); box-shadow: 0 8px 22px rgba(121,52,222,.24); }
.secondary-button { color: var(--text); background: #0d111a; border: 1px solid rgba(255,255,255,.075); }
.danger-button { color: #fca5a5; background: transparent; border: 1px solid transparent; }
.primary-button:disabled, .secondary-button:disabled, .danger-button:disabled { opacity: .55; cursor: not-allowed; }

.obra-volumes { margin-top: 20px; padding: 24px; }

@media (max-width: 760px) {
  .obra-hero { flex-direction: column; align-items: flex-start; padding: 110px 20px 24px; }
  .obra-hero__cover { width: 120px; }
  .obra-hero__identity h1 { font-size: 26px; }
  .obra-hero__actions { flex-direction: row; }
  .obra-info-grid { grid-template-columns: 1fr; }
  .obra-edit__footer { flex-direction: column-reverse; align-items: stretch; }
  .obra-edit__actions { width: 100%; }
  .primary-button, .secondary-button { flex: 1; }
}
</style>
