<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  BookOpen,
  Check,
  FileText,
  ImagePlus,
  Layers3,
  Save,
  Star,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-vue-next';
import {
  api,
  FORMATS,
  DEMOGRAPHICS,
  LANGUAGES,
  STATUSES,
  SUGGESTED_GENRES,
  type FormatType,
  type Demographic,
  type Genre,
  type Obra,
  type ReadingStatus,
} from '../api/client';
import { useObrasStore } from '../stores/obras';
import TagInput from './TagInput.vue';
import VolumesTable from './VolumesTable.vue';
import { confirmAction, notifyError, notifySuccess } from '../services/notifications';

type ModalTab = 'details' | 'volumes';

const props = defineProps<{ obra: Obra | null }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'created', obra: Obra): void;
  (e: 'deleted', id: string): void;
}>();

const store = useObrasStore();
const mode = ref<'create' | 'edit'>(props.obra ? 'edit' : 'create');
const activeTab = ref<ModalTab>('details');
const local = ref<Obra | null>(props.obra);

const f = ref({
  titulo: '',
  originalTitle: '',
  autor: '',
  illustrator: '',
  publisher: '',
  releaseYear: '',
  tipo: 'MANGA' as FormatType,
  demographic: '' as Demographic | '',
  genres: [] as string[],
  language: '',
  status: 'NOT_STARTED' as ReadingStatus,
  currentVolume: '',
  currentChapter: '',
  totalChapters: '',
  tags: [] as string[],
  rating: 0,
  description: '',
  personalReview: '',
  notes: '',
});

const pendingCoverFile = ref<File | null>(null);
const pendingCoverPreview = ref<string | null>(null);
const coverInput = ref<HTMLInputElement | null>(null);
const saving = ref(false);
const deleting = ref(false);
const error = ref('');
const genreCatalog = ref<Genre[]>([]);
const genreNames = computed(() => genreCatalog.value.length ? genreCatalog.value.map((genre) => genre.name) : SUGGESTED_GENRES);
const supportsDemographic = computed(() => ['MANGA', 'MANHWA', 'MANHUA'].includes(f.value.tipo));

const modalTitle = computed(() =>
  mode.value === 'create' ? 'Agregar nueva obra' : local.value?.titulo || 'Editar obra',
);

const modalSubtitle = computed(() =>
  mode.value === 'create'
    ? 'Registra la información general. Luego podrás agregar los tomos.'
    : 'Actualiza la información de la obra y administra sus tomos.',
);

const volumeCount = computed(() => local.value?.volumes.length ?? 0);

function loadObra(obra: Obra | null) {
  local.value = obra;
  mode.value = obra ? 'edit' : 'create';
  activeTab.value = 'details';

  f.value = {
    titulo: obra?.titulo || '',
    originalTitle: obra?.originalTitle || '',
    autor: obra?.autor || '',
    illustrator: obra?.illustrator || '',
    publisher: obra?.publisher || '',
    releaseYear: obra?.releaseYear ? String(obra.releaseYear) : '',
    tipo: (obra?.tipo || 'MANGA') as FormatType,
    demographic: (obra?.demographic || '') as Demographic | '',
    genres: obra?.genres ? [...obra.genres] : [],
    language: obra?.language || '',
    status: (obra?.status || 'NOT_STARTED') as ReadingStatus,
    currentVolume: obra?.currentVolume ? String(obra.currentVolume) : '',
    currentChapter: obra?.currentChapter ? String(obra.currentChapter) : '',
    totalChapters: obra?.totalChapters ? String(obra.totalChapters) : '',
    tags: obra?.tags ? [...obra.tags] : [],
    rating: obra?.rating || 0,
    description: obra?.description || '',
    personalReview: obra?.personalReview || '',
    notes: obra?.notes || '',
  };

  pendingCoverFile.value = null;
  pendingCoverPreview.value = obra?.coverPath || null;
  error.value = '';
}

watch(() => props.obra, (obra, previous) => {
  const previousTab = activeTab.value;
  const sameWork = Boolean(obra?.id && obra.id === previous?.id);
  loadObra(obra);
  if (sameWork) activeTab.value = previousTab;
}, { immediate: true });

function pickCover() {
  coverInput.value?.click();
}

function onCoverChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    error.value = 'Selecciona un archivo de imagen válido.';
    input.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    error.value = 'La portada no debe superar los 5 MB.';
    input.value = '';
    return;
  }

  if (pendingCoverPreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(pendingCoverPreview.value);
  }

  pendingCoverFile.value = file;
  pendingCoverPreview.value = URL.createObjectURL(file);
  error.value = '';
}

function removeCover() {
  if (pendingCoverPreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(pendingCoverPreview.value);
  }

  pendingCoverFile.value = null;
  pendingCoverPreview.value = null;
  if (coverInput.value) coverInput.value.value = '';
}

function buildPayload() {
  return {
    titulo: f.value.titulo.trim(),
    originalTitle: f.value.originalTitle.trim() || undefined,
    autor: f.value.autor.trim(),
    illustrator: f.value.illustrator.trim() || undefined,
    publisher: f.value.publisher.trim() || undefined,
    releaseYear: f.value.releaseYear ? Number.parseInt(f.value.releaseYear, 10) : undefined,
    tipo: f.value.tipo,
    demographic: supportsDemographic.value ? f.value.demographic || undefined : undefined,
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

async function loadGenreCatalog() {
  try { genreCatalog.value = await api.listGenres(); }
  catch { genreCatalog.value = []; }
}

async function createGenre(name: string) {
  try {
    const genre = await api.createGenre(name);
    if (!genreCatalog.value.some((item) => item.id === genre.id)) genreCatalog.value.push(genre);
  } catch (cause: unknown) {
    notifyError('No se pudo guardar el género', cause instanceof Error ? cause.message : undefined);
  }
}

onMounted(loadGenreCatalog);

function validate() {
  if (!f.value.titulo.trim()) {
    error.value = 'El título es obligatorio.';
    return false;
  }

  if (!f.value.autor.trim()) {
    error.value = 'El autor es obligatorio.';
    return false;
  }

  if (f.value.releaseYear && Number(f.value.releaseYear) < 0) {
    error.value = 'El año de lanzamiento no es válido.';
    return false;
  }

  if (f.value.totalChapters && Number(f.value.totalChapters) < 0) {
    error.value = 'El total de capítulos no es válido.';
    return false;
  }

  error.value = '';
  return true;
}

async function submit() {
  if (!validate()) return;

  saving.value = true;
  error.value = '';

  try {
    const payload = buildPayload();

    if (mode.value === 'create') {
      const created = await api.create({ ...payload, totalVolumes: 0 });
      let finalObra = created;

      if (pendingCoverFile.value) {
        finalObra = await api.uploadObraCover(created.id, pendingCoverFile.value);
      }

      pendingCoverFile.value = null;
      pendingCoverPreview.value = finalObra.coverPath || null;
      store.upsert(finalObra);
      local.value = finalObra;
      mode.value = 'edit';
      activeTab.value = 'volumes';
      notifySuccess('Obra creada', `“${finalObra.titulo}” se agregó a tu biblioteca.`);
      emit('created', finalObra);
      return;
    }

    if (!local.value) return;

    let updated = await api.update(local.value.id, payload);

    if (pendingCoverFile.value) {
      updated = await api.uploadObraCover(local.value.id, pendingCoverFile.value);
      pendingCoverFile.value = null;
    }

    pendingCoverPreview.value = updated.coverPath || null;
    local.value = updated;
    store.upsert(updated);
    notifySuccess('Obra actualizada', 'Los cambios se guardaron correctamente.');
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo guardar la obra.';
    notifyError('No se pudo guardar la obra', error.value);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!local.value || deleting.value) return;

  const confirmed = await confirmAction({
    title: `¿Eliminar “${local.value.titulo}”?`,
    description: 'También se eliminarán todos sus tomos, portadas y datos de lectura.',
    confirmLabel: 'Eliminar obra',
    danger: true,
  });
  if (!confirmed) return;

  deleting.value = true;
  error.value = '';

  try {
    const id = local.value.id;
    await api.remove(id);
    store.remove(id);
    notifySuccess('Obra eliminada', `“${local.value.titulo}” fue retirada de tu biblioteca.`);
    emit('deleted', id);
    emit('close');
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : 'No se pudo eliminar la obra.';
    notifyError('No se pudo eliminar la obra', error.value);
  } finally {
    deleting.value = false;
  }
}

async function onVolumesChanged() {
  if (!local.value) return;

  try {
    const fresh = await api.get(local.value.id);
    local.value = fresh;
    store.upsert(fresh);
  } catch (cause: unknown) {
    error.value = cause instanceof Error ? cause.message : 'No se pudieron actualizar los tomos.';
    notifyError('No se pudieron actualizar los tomos', error.value);
  }
}

function closeModal() {
  if (!saving.value && !deleting.value) emit('close');
}
</script>

<template>
  <div class="work-modal-overlay" @click.self="closeModal">
    <section class="work-modal" :class="{ 'work-modal--volumes': activeTab === 'volumes' }" role="dialog" aria-modal="true" :aria-label="modalTitle">
      <header class="work-modal__header">
        <div class="work-modal__heading">
          <span class="work-modal__eyebrow">{{ mode === 'create' ? 'Nueva obra' : 'Biblioteca' }}</span>
          <h2>{{ modalTitle }}</h2>
          <p>{{ modalSubtitle }}</p>
        </div>

        <button type="button" class="work-modal__close" aria-label="Cerrar" @click="closeModal">
          <X />
        </button>
      </header>

      <nav v-if="mode === 'edit'" class="work-modal__tabs">
        <button type="button" class="work-modal__tab" :class="{ active: activeTab === 'details' }" @click="activeTab = 'details'">
          <FileText /> Información
        </button>

        <button type="button" class="work-modal__tab" :class="{ active: activeTab === 'volumes' }" @click="activeTab = 'volumes'">
          <Layers3 /> Tomos <span>{{ volumeCount }}</span>
        </button>
      </nav>

      <div class="work-modal__body">
        <div v-if="error" class="work-modal__error">{{ error }}</div>

        <template v-if="activeTab === 'details'">
          <div class="work-form-layout">
            <aside class="work-cover-panel">
              <button type="button" class="cover-dropzone" @click="pickCover">
                <img v-if="pendingCoverPreview" :src="pendingCoverPreview" alt="Vista previa de portada" />

                <div v-else class="cover-dropzone__empty">
                  <div class="cover-dropzone__icon"><UploadCloud /></div>
                  <strong>Subir portada</strong>
                  <span>JPG, PNG o WebP</span>
                  <small>Máximo 5 MB</small>
                </div>

                <div v-if="pendingCoverPreview" class="cover-dropzone__replace">
                  <ImagePlus /> Cambiar portada
                </div>
              </button>

              <button v-if="pendingCoverPreview" type="button" class="cover-remove" @click="removeCover">
                <Trash2 /> Quitar portada
              </button>

              <input ref="coverInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onCoverChosen" />

              <div class="cover-help">
                <BookOpen />
                <p>Usa una portada vertical. Los tomos podrán tener portadas propias después de crear la obra.</p>
              </div>
            </aside>

            <main class="work-fields">
              <section class="form-section">
                <div class="form-section__header">
                  <div><span>01</span><div><h3>Información principal</h3><p>Datos básicos para identificar la obra.</p></div></div>
                </div>

                <div class="form-grid">
                  <div class="field"><label for="work-title">Título *</label><input id="work-title" v-model="f.titulo" type="text" placeholder="Ej. Dune" /></div>
                  <div class="field"><label for="original-title">Título original</label><input id="original-title" v-model="f.originalTitle" type="text" placeholder="Ej. デューン" /></div>
                  <div class="field"><label for="author">Autor *</label><input id="author" v-model="f.autor" type="text" placeholder="Ej. Frank Herbert" /></div>
                  <div class="field"><label for="illustrator">Ilustrador</label><input id="illustrator" v-model="f.illustrator" type="text" placeholder="Ej. John Schoenherr" /></div>
                  <div class="field"><label for="publisher">Editorial</label><input id="publisher" v-model="f.publisher" type="text" placeholder="Ej. Ace Books" /></div>
                  <div class="field"><label for="release-year">Año de lanzamiento</label><input id="release-year" v-model="f.releaseYear" type="number" min="0" placeholder="Ej. 1965" /></div>
                </div>
              </section>

              <section class="form-section">
                <div class="form-section__header">
                  <div><span>02</span><div><h3>Clasificación</h3><p>Formato, estado y organización de la obra.</p></div></div>
                </div>

                <div class="field field--full">
                  <label>Tipo de formato *</label>
                  <div class="format-toggle-row">
                    <button v-for="fmt in FORMATS" :key="fmt.value" type="button" class="format-toggle" :class="{ active: f.tipo === fmt.value }" @click="f.tipo = fmt.value">
                      <Check v-if="f.tipo === fmt.value" /> {{ fmt.label }}
                    </button>
                  </div>
                </div>

                <div class="form-grid form-grid--classification">
                  <div v-if="supportsDemographic" class="field field--full demographic-field">
                    <label>Demografía</label>
                    <p>Audiencia editorial principal; no reemplaza los géneros de la obra.</p>
                    <div class="demographic-options">
                      <button v-for="item in DEMOGRAPHICS" :key="item.value" type="button" :class="{ active: f.demographic === item.value }" @click="f.demographic = f.demographic === item.value ? '' : item.value"><strong>{{ item.label }}</strong><span>{{ item.description }}</span></button>
                    </div>
                  </div>
                  <div class="field"><label>Géneros</label><TagInput v-model="f.genres" :suggestions="genreNames" allow-create placeholder="Busca un género o escribe uno nuevo…" @create="createGenre" /></div>
                  <div class="field"><label for="language">Idioma</label><select id="language" v-model="f.language"><option value="">Selecciona un idioma</option><option v-for="language in LANGUAGES" :key="language" :value="language">{{ language }}</option></select></div>
                  <div class="field"><label for="status">Estado *</label><select id="status" v-model="f.status"><option v-for="status in STATUSES" :key="status.value" :value="status.value">{{ status.label }}</option></select></div>
                  <div class="field"><label for="current-volume">Tomo actual</label><input id="current-volume" v-model="f.currentVolume" type="number" min="0" placeholder="Ej. 3" /></div>
                  <div class="field"><label for="current-chapter">Capítulo actual</label><input id="current-chapter" v-model="f.currentChapter" type="number" min="0" placeholder="Ej. 18" /></div>
                  <div class="field"><label for="chapters">Total de capítulos</label><input id="chapters" v-model="f.totalChapters" type="number" min="0" placeholder="Ej. 24" /></div>
                  <div class="field field--full"><label>Etiquetas</label><TagInput v-model="f.tags" placeholder="Agregar etiquetas…" /></div>
                </div>
              </section>

              <section class="form-section">
                <div class="form-section__header">
                  <div><span>03</span><div><h3>Valoración y contenido</h3><p>Tu opinión y datos adicionales de la obra.</p></div></div>
                </div>

                <div class="rating-row">
                  <div class="field">
                    <label>Calificación</label>
                    <div class="star-picker">
                      <button v-for="n in 5" :key="n" type="button" :class="{ filled: n <= f.rating }" @click="f.rating = f.rating === n ? 0 : n"><Star /></button>
                      <span>{{ f.rating ? `${f.rating}.0 / 5` : 'Sin calificar' }}</span>
                    </div>
                  </div>
                </div>

                <div class="form-grid">
                  <div class="field field--full"><label for="description">Descripción / Sinopsis</label><textarea id="description" v-model="f.description" maxlength="2000" placeholder="Escribe un resumen o sinopsis de la obra…" /><div class="char-count">{{ f.description.length }} / 2000</div></div>
                  <div class="field"><label for="personal-review">Reseña personal</label><textarea id="personal-review" v-model="f.personalReview" maxlength="2000" placeholder="Comparte tus pensamientos o impresiones…" /><div class="char-count">{{ f.personalReview.length }} / 2000</div></div>
                  <div class="field"><label for="notes">Notas generales</label><textarea id="notes" v-model="f.notes" maxlength="2000" placeholder="Agrega notas personales sobre esta obra…" /><div class="char-count">{{ f.notes.length }} / 2000</div></div>
                </div>
              </section>
            </main>
          </div>
        </template>

        <template v-else-if="local">
          <section class="volumes-section">
            <div class="volumes-section__header">
              <div><span class="work-modal__eyebrow">Colección</span><h3>Tomos de {{ local.titulo }}</h3><p>Agrega, edita y registra el progreso de cada tomo individualmente.</p></div>
              <div class="volumes-count"><Layers3 /> {{ volumeCount }} {{ volumeCount === 1 ? 'tomo' : 'tomos' }}</div>
            </div>

            <div v-if="volumeCount === 0" class="volumes-empty">
              <div class="volumes-empty__icon"><Layers3 /></div>
              <h4>La obra todavía no tiene tomos</h4>
              <p>Usa el botón de la tabla para agregar el primer tomo y registrar su portada, estado, capítulos y notas.</p>
            </div>

            <VolumesTable :obra-id="local.id" :obra="local" :volumes="local.volumes" @changed="onVolumesChanged" />
          </section>
        </template>
      </div>

      <footer class="work-modal__footer">
        <button v-if="mode === 'edit'" type="button" class="danger-button" :disabled="deleting || saving" @click="remove"><Trash2 /> {{ deleting ? 'Eliminando…' : 'Eliminar obra' }}</button>
        <div v-else />

        <div class="work-modal__actions">
          <button type="button" class="secondary-button" :disabled="saving || deleting" @click="closeModal">Cancelar</button>
          <button v-if="activeTab === 'details'" type="button" class="primary-button" :disabled="saving || deleting" @click="submit"><Save /> {{ saving ? 'Guardando…' : mode === 'create' ? 'Guardar y agregar tomos' : 'Guardar cambios' }}</button>
          <button v-else type="button" class="primary-button" @click="closeModal"><Check /> Finalizar</button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.work-modal-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(2,4,10,.78);backdrop-filter:blur(12px);animation:karma-overlay-in .22s ease-out both}
.work-modal{width:min(1120px,100%);max-height:min(900px,92vh);display:flex;flex-direction:column;overflow:hidden;color:var(--text);background:linear-gradient(145deg,rgba(255,255,255,.018),transparent 30%),#080b12;border:1px solid rgba(255,255,255,.075);border-radius:18px;box-shadow:0 34px 90px rgba(0,0,0,.62),0 0 0 1px rgba(159,107,255,.045),0 0 48px rgba(89,39,160,.09);animation:karma-modal-in .28s cubic-bezier(.2,.85,.25,1) both}
@keyframes karma-overlay-in{from{opacity:0}to{opacity:1}}
@keyframes karma-modal-in{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.work-modal--volumes{width:min(1280px,100%)}
.work-modal__header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:22px 26px 18px;background:rgba(8,11,18,.96);border-bottom:1px solid rgba(255,255,255,.06)}
.work-modal__eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.work-modal__header h2{margin:0 0 5px;font-size:21px}.work-modal__header p{margin:0;color:var(--text-dim);font-size:12.5px}.work-modal__close{width:34px;height:34px;display:grid;place-items:center;color:var(--text-dim);background:#0d111a;border:1px solid rgba(255,255,255,.075);border-radius:9px;cursor:pointer}.work-modal__close:hover{color:var(--text);border-color:rgba(159,107,255,.32)}.work-modal__close svg{width:16px;height:16px}
.work-modal__tabs{display:flex;gap:4px;padding:9px 26px 0;background:#070a11;border-bottom:1px solid rgba(255,255,255,.06)}.work-modal__tab{position:relative;display:inline-flex;align-items:center;gap:7px;padding:11px 15px 12px;color:var(--text-dim);background:transparent;border:0;font:600 12.5px inherit;cursor:pointer}.work-modal__tab svg{width:15px;height:15px}.work-modal__tab>span{min-width:20px;padding:2px 6px;color:var(--text-faint);background:var(--surface-2);border-radius:999px;font-size:10px}.work-modal__tab.active{color:#f5f1ff}.work-modal__tab.active::after{content:"";position:absolute;right:10px;bottom:-1px;left:10px;height:2px;background:var(--accent-gradient);border-radius:999px;box-shadow:0 0 10px rgba(159,107,255,.55)}
.work-modal__body{flex:1;overflow-y:auto;padding:22px 26px 26px}.work-modal__error{margin-bottom:16px;padding:11px 13px;color:#fca5a5;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.28);border-radius:9px;font-size:12.5px}.work-form-layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:22px;align-items:start}.work-cover-panel{position:sticky;top:0;display:flex;flex-direction:column;gap:10px}
.cover-dropzone{position:relative;width:100%;aspect-ratio:2/3;padding:0;overflow:hidden;color:var(--text-faint);background:radial-gradient(circle at 50% 35%,rgba(159,107,255,.09),transparent 58%),#0b0f18;border:1px dashed rgba(159,107,255,.38);border-radius:12px;cursor:pointer;transition:.16s}.cover-dropzone:hover{border-color:var(--accent);box-shadow:0 0 25px rgba(139,70,245,.13);transform:translateY(-2px)}.cover-dropzone>img{width:100%;height:100%;display:block;object-fit:contain;object-position:center;background:#05070d;animation:karma-image-reveal .3s ease-out both}.cover-dropzone__empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:18px;text-align:center}.cover-dropzone__icon{width:44px;height:44px;display:grid;place-items:center;margin-bottom:4px;color:var(--accent);background:rgba(159,107,255,.1);border:1px solid rgba(159,107,255,.22);border-radius:12px}.cover-dropzone__icon svg{width:22px;height:22px}.cover-dropzone__empty strong{color:var(--text);font-size:12.5px}.cover-dropzone__empty span{color:var(--text-dim);font-size:11px}.cover-dropzone__empty small{font-size:10px}.cover-dropzone__replace{position:absolute;right:8px;bottom:8px;left:8px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;color:#fff;background:rgba(4,6,13,.82);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:11px;font-weight:650}.cover-dropzone__replace svg,.cover-remove svg{width:14px;height:14px}.cover-remove{display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 10px;color:var(--text-dim);background:transparent;border:1px solid var(--border);border-radius:8px;font:11.5px inherit;cursor:pointer}.cover-remove:hover{color:#fca5a5;border-color:rgba(248,113,113,.28);background:rgba(248,113,113,.06)}.cover-help{display:flex;align-items:flex-start;gap:8px;padding:11px;color:var(--text-faint);background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.055);border-radius:9px}.cover-help svg{width:15px;height:15px;flex-shrink:0;color:var(--accent)}.cover-help p{margin:0;font-size:10.5px;line-height:1.5}
@keyframes karma-image-reveal{from{opacity:0;transform:scale(1.025);filter:blur(3px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
.form-section{padding:17px;margin-bottom:14px;background:linear-gradient(145deg,rgba(255,255,255,.012),transparent 36%),#0a0e16;border:1px solid rgba(255,255,255,.06);border-radius:12px}.form-section__header{margin-bottom:15px}.form-section__header>div{display:flex;align-items:center;gap:10px}.form-section__header>div>span{width:28px;height:28px;display:grid;place-items:center;flex-shrink:0;color:var(--accent);background:rgba(159,107,255,.08);border:1px solid rgba(159,107,255,.2);border-radius:8px;font-size:10px;font-weight:800}.form-section__header h3{margin:0 0 2px;font-size:13px}.form-section__header p{margin:0;color:var(--text-faint);font-size:10.5px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.form-grid--classification{margin-top:14px}.field--full{grid-column:1/-1}.field>label{display:block;margin-bottom:6px;color:var(--text-dim);font-size:10.5px;font-weight:700}.field input,.field select,.field textarea{width:100%;color:var(--text);background:#080b12;border:1px solid rgba(255,255,255,.075);border-radius:8px;outline:none;font:12.5px inherit}.field input,.field select{height:38px;padding:0 11px}.field textarea{min-height:92px;padding:10px 11px;resize:vertical;line-height:1.5}.field input:focus,.field select:focus,.field textarea:focus{border-color:rgba(159,107,255,.72);box-shadow:0 0 0 3px rgba(159,107,255,.08)}
.format-toggle-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.format-toggle{min-height:38px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;color:var(--text-dim);background:#080b12;border:1px solid rgba(255,255,255,.075);border-radius:8px;font:650 11.5px inherit;cursor:pointer}.format-toggle.active{color:#efe8ff;background:linear-gradient(135deg,rgba(159,107,255,.17),rgba(124,58,237,.09));border-color:rgba(159,107,255,.7)}.format-toggle svg{width:13px;height:13px;color:var(--accent)}.rating-row{margin-bottom:14px}.star-picker{display:flex;align-items:center;gap:4px}.star-picker button{width:28px;height:28px;display:grid;place-items:center;padding:0;color:var(--text-faint);background:transparent;border:0;cursor:pointer}.star-picker button svg{width:20px;height:20px}.star-picker button.filled{color:var(--warning)}.star-picker button.filled svg{fill:currentColor}.star-picker>span{margin-left:8px;color:var(--text-faint);font-size:11px}.char-count{margin-top:4px;color:var(--text-faint);font-size:9.5px;text-align:right}
.demographic-field{padding:13px;border:1px solid rgba(159,107,255,.13);border-radius:10px;background:rgba(159,107,255,.025)}.demographic-field>p{margin:-2px 0 10px;color:var(--text-faint);font-size:9.5px}.demographic-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.demographic-options button{display:grid;gap:2px;padding:8px 10px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:#080b12;color:var(--text-dim);text-align:left}.demographic-options button strong{font-size:10.5px}.demographic-options button span{font-size:8px;color:var(--text-faint)}.demographic-options button.active{border-color:rgba(159,107,255,.65);background:rgba(159,107,255,.12);color:#f0e8ff;box-shadow:0 0 0 2px rgba(159,107,255,.05)}
.volumes-section__header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin-bottom:18px}.volumes-section__header h3{margin:0 0 5px;font-size:18px}.volumes-section__header p{margin:0;color:var(--text-dim);font-size:12px}.volumes-count{display:flex;align-items:center;gap:7px;padding:8px 11px;color:#d7c4ff;background:rgba(159,107,255,.09);border:1px solid rgba(159,107,255,.18);border-radius:9px;font-size:11.5px;font-weight:700}.volumes-count svg{width:14px;height:14px}.volumes-empty{display:flex;flex-direction:column;align-items:center;margin-bottom:16px;padding:28px 20px;color:var(--text-dim);background:rgba(255,255,255,.01);border:1px dashed rgba(159,107,255,.22);border-radius:12px;text-align:center}.volumes-empty__icon{width:48px;height:48px;display:grid;place-items:center;margin-bottom:12px;color:var(--accent);background:rgba(159,107,255,.08);border:1px solid rgba(159,107,255,.18);border-radius:13px}.volumes-empty h4{margin:0 0 6px;font-size:13px}.volumes-empty p{max-width:460px;margin:0;color:var(--text-faint);font-size:11px;line-height:1.55}
.work-modal__footer{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:15px 26px;background:rgba(7,10,17,.97);border-top:1px solid rgba(255,255,255,.06)}.work-modal__actions{display:flex;gap:9px}.primary-button,.secondary-button,.danger-button{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 15px;border-radius:8px;font:700 12px inherit;cursor:pointer}.primary-button svg,.danger-button svg{width:14px;height:14px}.primary-button{color:#fff;background:var(--accent-gradient);border:1px solid rgba(201,169,255,.22);box-shadow:0 8px 22px rgba(121,52,222,.24)}.secondary-button{color:var(--text);background:#0d111a;border:1px solid rgba(255,255,255,.075)}.danger-button{color:#fca5a5;background:transparent;border:1px solid transparent}.primary-button:disabled,.secondary-button:disabled,.danger-button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:900px){.work-form-layout{grid-template-columns:155px minmax(0,1fr);gap:16px}.format-toggle-row{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.work-modal-overlay{padding:0}.work-modal{width:100%;height:100%;max-height:none;border:0;border-radius:0}.work-modal__header,.work-modal__body,.work-modal__footer{padding-right:18px;padding-left:18px}.work-form-layout{grid-template-columns:1fr}.work-cover-panel{position:static;display:grid;grid-template-columns:130px minmax(0,1fr)}.cover-dropzone{grid-row:span 2}.form-grid{grid-template-columns:1fr}.format-toggle-row{grid-template-columns:repeat(2,minmax(0,1fr))}.demographic-options{grid-template-columns:repeat(2,minmax(0,1fr))}.work-modal__footer{align-items:stretch;flex-direction:column-reverse}.work-modal__actions{width:100%}.primary-button,.secondary-button{flex:1}.danger-button{width:100%}.volumes-section__header{flex-direction:column}}
</style>
