<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Save, X } from 'lucide-vue-next';
import { api, SUGGESTED_GENRES, type Genre, type Obra } from '../api/client';
import { useObrasStore } from '../stores/obras';
import ObraFormFields, { type ObraFormValue } from './ObraFormFields.vue';
import { notifyError, notifySuccess } from '../services/notifications';

const emit = defineEmits<{ (e: 'close'): void; (e: 'created', obra: Obra): void }>();

const router = useRouter();
const store = useObrasStore();

const f = ref<ObraFormValue>({
  titulo: '', originalTitle: '', autor: '', illustrator: '', publisher: '', releaseYear: '',
  tipo: 'MANGA', demographic: '', genres: [], language: '', status: 'NOT_STARTED',
  currentVolume: '', currentChapter: '', totalChapters: '', tags: [], rating: 0,
  description: '', personalReview: '', notes: '',
});

const pendingCoverFile = ref<File | null>(null);
const pendingCoverPreview = ref<string | null>(null);
const saving = ref(false);
const error = ref('');
const genreCatalog = ref<Genre[]>([]);
const genreSuggestions = computed(() => genreCatalog.value.length ? genreCatalog.value.map((genre) => genre.name) : SUGGESTED_GENRES);

async function loadGenreCatalog() {
  try { genreCatalog.value = await api.listGenres(); }
  catch { genreCatalog.value = []; }
}

onMounted(loadGenreCatalog);

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

async function submit() {
  if (!validate()) return;

  saving.value = true;
  error.value = '';

  try {
    const payload = buildPayload();
    const created = await api.create({ ...payload, totalVolumes: 0 });
    let finalObra = created;

    if (pendingCoverFile.value) {
      finalObra = await api.uploadObraCover(created.id, pendingCoverFile.value);
    }

    store.upsert(finalObra);
    notifySuccess('Obra creada', `“${finalObra.titulo}” se agregó a tu biblioteca.`);
    emit('created', finalObra);
    router.push({ name: 'obra', params: { id: finalObra.id }, query: { tab: 'volumes' } });
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar la obra.';
    notifyError('No se pudo guardar la obra', error.value);
  } finally {
    saving.value = false;
  }
}

function closeModal() {
  if (!saving.value) emit('close');
}
</script>

<template>
  <div class="work-modal-overlay" @click.self="closeModal">
    <section class="work-modal" role="dialog" aria-modal="true" aria-label="Agregar nueva obra">
      <header class="work-modal__header">
        <div class="work-modal__heading">
          <span class="work-modal__eyebrow">Nueva obra</span>
          <h2>Agregar nueva obra</h2>
          <p>Registra la información general. Luego podrás agregar los tomos.</p>
        </div>

        <button type="button" class="work-modal__close" aria-label="Cerrar" @click="closeModal">
          <X />
        </button>
      </header>

      <div class="work-modal__body">
        <div v-if="error" class="work-modal__error">{{ error }}</div>

        <ObraFormFields
          v-model="f"
          :cover-preview="pendingCoverPreview"
          :genre-suggestions="genreSuggestions"
          @cover-chosen="onCoverChosen"
          @cover-error="onCoverError"
          @remove-cover="removeCover"
          @create-genre="createGenre"
        />
      </div>

      <footer class="work-modal__footer">
        <button type="button" class="secondary-button" :disabled="saving" @click="closeModal">Cancelar</button>
        <button type="button" class="primary-button" :disabled="saving" @click="submit"><Save /> {{ saving ? 'Guardando…' : 'Guardar y agregar tomos' }}</button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.work-modal-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(2,4,10,.78);backdrop-filter:blur(12px);animation:karma-overlay-in .22s ease-out both}
.work-modal{width:min(1120px,100%);max-height:min(900px,92vh);display:flex;flex-direction:column;overflow:hidden;color:var(--text);background:linear-gradient(145deg,rgba(255,255,255,.018),transparent 30%),#080b12;border:1px solid rgba(255,255,255,.075);border-radius:18px;box-shadow:0 34px 90px rgba(0,0,0,.62),0 0 0 1px rgba(159,107,255,.045),0 0 48px rgba(89,39,160,.09);animation:karma-modal-in .28s cubic-bezier(.2,.85,.25,1) both}
@keyframes karma-overlay-in{from{opacity:0}to{opacity:1}}
@keyframes karma-modal-in{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.work-modal__header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:22px 26px 18px;background:rgba(8,11,18,.96);border-bottom:1px solid rgba(255,255,255,.06)}
.work-modal__eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
.work-modal__header h2{margin:0 0 5px;font-size:21px}
.work-modal__header p{margin:0;color:var(--text-dim);font-size:12.5px}
.work-modal__close{width:34px;height:34px;display:grid;place-items:center;color:var(--text-dim);background:#0d111a;border:1px solid rgba(255,255,255,.075);border-radius:9px;cursor:pointer}
.work-modal__close:hover{color:var(--text);border-color:rgba(159,107,255,.32)}
.work-modal__close svg{width:16px;height:16px}
.work-modal__body{flex:1;overflow-y:auto;padding:22px 26px 26px}
.work-modal__error{margin-bottom:16px;padding:11px 13px;color:#fca5a5;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.28);border-radius:9px;font-size:12.5px}
.work-modal__footer{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:15px 26px;background:rgba(7,10,17,.97);border-top:1px solid rgba(255,255,255,.06)}
.primary-button,.secondary-button{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 15px;border-radius:8px;font:700 12px inherit;cursor:pointer}
.primary-button svg{width:14px;height:14px}
.primary-button{color:#fff;background:var(--accent-gradient);border:1px solid rgba(201,169,255,.22);box-shadow:0 8px 22px rgba(121,52,222,.24)}
.secondary-button{color:var(--text);background:#0d111a;border:1px solid rgba(255,255,255,.075)}
.primary-button:disabled,.secondary-button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:700px){.work-modal-overlay{padding:0}.work-modal{width:100%;height:100%;max-height:none;border:0;border-radius:0}.work-modal__header,.work-modal__body,.work-modal__footer{padding-right:18px;padding-left:18px}.work-modal__footer{align-items:stretch;flex-direction:column-reverse}.primary-button,.secondary-button{width:100%}}
</style>
