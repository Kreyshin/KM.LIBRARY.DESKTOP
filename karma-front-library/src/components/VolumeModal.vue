<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  BookMarked,
  BookOpen,
  Check,
  Crown,
  ImagePlus,
  Images,
  Layers3,
  Pencil,
  Save,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-vue-next';
import {
  api,
  COVER_EDITION_TYPES,
  LANGUAGES,
  VOLUME_OWNERSHIP,
  VOLUME_STATUSES,
  type Obra,
  type Volume,
  type VolumeCoverVariant,
  type VolumeOwnership,
  type VolumeStatus,
} from '../api/client';
import { useObrasStore } from '../stores/obras';
import DatePicker from './DatePicker.vue';
import PurpleSelect from './PurpleSelect.vue';
import { confirmAction, notifyError, notifySuccess } from '../services/notifications';

const props = defineProps<{ obra: Obra; volume: Volume }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'deleted'): void;
  (e: 'open-obra'): void;
  (e: 'updated', obra: Obra): void;
}>();

const store = useObrasStore();
const local = ref<Volume>({ ...props.volume });

const f = ref({
  title: '',
  isbn: '',
  publisher: '',
  publishDate: '',
  ownership: 'NOT_OWNED' as VolumeOwnership,
  status: 'NOT_READ' as VolumeStatus,
  read: false,
  chapters: '',
  startDate: '',
  finishDate: '',
  notes: '',
});

const alternateForm = ref({
  language: '',
  publisher: '',
  edition: '',
  country: '',
  isbn: '',
  publishDate: '',
  label: '',
  editionType: 'STANDARD' as const,
  isPrimary: false,
});

const coverInput = ref<HTMLInputElement | null>(null);
const spineInput = ref<HTMLInputElement | null>(null);
const alternateCoverInput = ref<HTMLInputElement | null>(null);
const alternateFile = ref<File | null>(null);
const alternatePreview = ref('');
const showEditionCreator = ref(false);
const variantFileInput = ref<HTMLInputElement | null>(null);
const variantUploadTarget = ref<VolumeCoverVariant | null>(null);
const variantUploadKind = ref<'image' | 'spine'>('image');

const saving = ref(false);
const deleting = ref(false);
const uploadingCover = ref(false);
const uploadingSpine = ref(false);
const uploadingAlternate = ref(false);
const alternateBusyId = ref<string | null>(null);
const editingCoverId = ref<string | null>(null);
const coverDraft = ref({ language: '', publisher: '', edition: '', country: '', isbn: '', publishDate: '', label: '', editionType: 'STANDARD' as VolumeCoverVariant['editionType'] });
const error = ref('');
const languageOptions = LANGUAGES.map((language) => ({ value: language, label: language }));

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : '';
}

function normalizeVolume(volume: Volume): Volume {
  return {
    ...volume,
    alternateCovers: volume.alternateCovers || [],
  };
}

function loadVolume(volume: Volume) {
  local.value = normalizeVolume(volume);

  f.value = {
    title: volume.title || '',
    isbn: volume.isbn || '',
    publisher: volume.publisher || '',
    publishDate: toDateInput(volume.publishDate),
    ownership: volume.ownership || 'NOT_OWNED',
    status: volume.status,
    read: volume.read,
    chapters: volume.chapters || '',
    startDate: toDateInput(volume.startDate),
    finishDate: toDateInput(volume.finishDate),
    notes: volume.notes || '',
  };

  alternateForm.value = {
    language: props.obra.language || '',
    publisher: volume.publisher || props.obra.publisher || '',
    edition: '',
    country: '',
    isbn: '',
    publishDate: '',
    label: '',
    editionType: 'STANDARD',
    isPrimary: false,
  };

  error.value = '';
}

watch(() => props.volume, loadVolume, { immediate: true });

const modalTitle = computed(() => f.value.title || `Tomo ${props.volume.number}`);
const alternateCovers = computed(() => local.value.alternateCovers || []);
const primaryAlternateCover = computed(() => alternateCovers.value.find((cover) => cover.isPrimary) || null);
const activeCoverPath = computed(() => primaryAlternateCover.value?.path || local.value.coverPath);
const activeCoverName = computed(() => primaryAlternateCover.value?.label || primaryAlternateCover.value?.edition || 'Portada base');

function formatCoverDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : '';
}

async function refreshStore() {
  const fresh = await api.get(props.obra.id);
  store.upsert(fresh);
  emit('updated', fresh);

  const freshVolume = fresh.volumes.find(
    (volume) => volume.number === props.volume.number,
  );

  if (freshVolume) {
    local.value = normalizeVolume(freshVolume);
  }
}

function validateImage(file: File) {
  if (!file.type.startsWith('image/')) {
    error.value = 'Selecciona un archivo de imagen válido.';
    notifyError('Imagen no válida', error.value);
    return false;
  }

  if (file.size > 8 * 1024 * 1024) {
    error.value = 'La imagen no debe superar los 8 MB.';
    notifyError('Imagen demasiado grande', error.value);
    return false;
  }

  return true;
}

function showOperationError(cause: unknown, fallback: string) {
  error.value = cause instanceof Error ? cause.message : fallback;
  notifyError(fallback, error.value !== fallback ? error.value : undefined);
}

async function submit() {
  saving.value = true;
  error.value = '';

  try {
    const updated = await api.updateVolume(
      props.obra.id,
      props.volume.number,
      {
        title: f.value.title.trim() || null,
        isbn: f.value.isbn.trim() || null,
        publisher: f.value.publisher.trim() || null,
        publishDate: f.value.publishDate || null,
        ownership: f.value.ownership,
        status: f.value.status,
        read: f.value.read,
        chapters: f.value.chapters.trim() || null,
        startDate: f.value.startDate || null,
        finishDate: f.value.finishDate || null,
        notes: f.value.notes.trim() || null,
      } as Partial<Volume>,
    );

    local.value = normalizeVolume(updated);
    await refreshStore();
    notifySuccess('Tomo actualizado', 'Los datos editoriales y de lectura se guardaron correctamente.');
  } catch (cause: unknown) {
    showOperationError(cause, 'No se pudo guardar el tomo.');
  } finally {
    saving.value = false;
  }
}

function pickCover() {
  coverInput.value?.click();
}

function pickSpine() {
  spineInput.value?.click();
}

function pickAlternateCover() {
  alternateCoverInput.value?.click();
}

function closeEditionCreator() {
  if (uploadingAlternate.value) return;
  showEditionCreator.value = false;
  alternateFile.value = null;
  if (alternatePreview.value) URL.revokeObjectURL(alternatePreview.value);
  alternatePreview.value = '';
}

async function onCoverChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file || !validateImage(file)) {
    input.value = '';
    return;
  }

  uploadingCover.value = true;
  error.value = '';

  try {
    local.value = normalizeVolume(
      await api.uploadVolumeCover(
        props.obra.id,
        props.volume.number,
        file,
      ),
    );

    await refreshStore();
    notifySuccess('Portada base actualizada');
  } catch (cause: unknown) {
    showOperationError(cause, 'No se pudo subir la portada.');
  } finally {
    uploadingCover.value = false;
    input.value = '';
  }
}

async function onSpineChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file || !validateImage(file)) {
    input.value = '';
    return;
  }

  uploadingSpine.value = true;
  error.value = '';

  try {
    local.value = normalizeVolume(
      await api.uploadVolumeSpine(
        props.obra.id,
        props.volume.number,
        file,
      ),
    );

    await refreshStore();
    notifySuccess('Lomo actualizado', 'La estantería utilizará la nueva imagen.');
  } catch (cause: unknown) {
    showOperationError(cause, 'No se pudo subir el lomo.');
  } finally {
    uploadingSpine.value = false;
    input.value = '';
  }
}

async function onAlternateCoverChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file || !validateImage(file)) {
    input.value = '';
    return;
  }

  if (alternatePreview.value) URL.revokeObjectURL(alternatePreview.value);
  alternateFile.value = file;
  alternatePreview.value = URL.createObjectURL(file);
  input.value = '';
}

async function createAlternateEdition() {
  const file = alternateFile.value;
  if (!file) {
    notifyError('Falta la portada', 'Selecciona la imagen que identifica esta edición.');
    return;
  }

  uploadingAlternate.value = true;
  error.value = '';

  try {
    local.value = normalizeVolume(
      await api.uploadVolumeAlternateCover(
        props.obra.id,
        props.volume.number,
        file,
        {
          language: alternateForm.value.language || undefined,
          publisher: alternateForm.value.publisher.trim() || undefined,
          edition: alternateForm.value.edition.trim() || undefined,
          country: alternateForm.value.country.trim() || undefined,
          isbn: alternateForm.value.isbn.trim() || undefined,
          publishDate: alternateForm.value.publishDate || undefined,
          editionType: alternateForm.value.editionType,
          label: alternateForm.value.label.trim() || undefined,
          isPrimary: alternateForm.value.isPrimary,
        },
      ),
    );

    alternateForm.value.edition = '';
    alternateForm.value.country = '';
    alternateForm.value.isbn = '';
    alternateForm.value.publishDate = '';
    alternateForm.value.label = '';
    alternateForm.value.editionType = 'STANDARD';
    alternateForm.value.isPrimary = false;

    await refreshStore();
    uploadingAlternate.value = false;
    closeEditionCreator();
    notifySuccess('Edición agregada', 'La portada y sus datos editoriales quedaron registrados.');
  } catch (cause: unknown) {
    showOperationError(cause, 'No se pudo subir la portada alternativa.');
  } finally {
    uploadingAlternate.value = false;
  }
}

onBeforeUnmount(() => {
  if (alternatePreview.value) URL.revokeObjectURL(alternatePreview.value);
});

async function setPrimaryCover(cover: VolumeCoverVariant | null) {
  alternateBusyId.value = cover?.id || 'main';
  error.value = '';

  try {
    local.value = normalizeVolume(
      await api.setPrimaryVolumeCover(
        props.obra.id,
        props.volume.number,
        cover?.id || null,
      ),
    );

    await refreshStore();
    notifySuccess('Portada principal actualizada', cover ? `Ahora se usa ${cover.label || cover.edition || 'la edición seleccionada'}.` : 'Se restauró la portada base.');
  } catch (cause: unknown) {
    showOperationError(cause, 'No se pudo cambiar la portada principal.');
  } finally {
    alternateBusyId.value = null;
  }
}

async function removeAlternateCover(cover: VolumeCoverVariant) {
  const coverName = cover.label || cover.edition || 'Portada alternativa';
  const confirmed = await confirmAction({
    title: `¿Eliminar “${coverName}”?`,
    description: 'La imagen y sus datos editoriales se eliminarán permanentemente.',
    confirmLabel: 'Eliminar portada',
    danger: true,
  });

  if (!confirmed) return;

  alternateBusyId.value = cover.id;
  error.value = '';

  try {
    local.value = normalizeVolume(
      await api.removeVolumeAlternateCover(
        props.obra.id,
        props.volume.number,
        cover.id,
      ),
    );

    await refreshStore();
    notifySuccess('Portada eliminada', `${coverName} fue retirada de esta edición.`);
  } catch (cause: unknown) {
    showOperationError(cause, 'No se pudo eliminar la portada alternativa.');
  } finally {
    alternateBusyId.value = null;
  }
}

function editAlternateCover(cover: VolumeCoverVariant) {
  editingCoverId.value = cover.id;
  coverDraft.value = {
    language: cover.language || '',
    publisher: cover.publisher || '',
    edition: cover.edition || '',
    country: cover.country || '',
    isbn: cover.isbn || '',
    publishDate: toDateInput(cover.publishDate),
    label: cover.label || '',
    editionType: cover.editionType || 'STANDARD',
  };
}

function cancelCoverEdit() {
  editingCoverId.value = null;
}

async function saveCoverMetadata(cover: VolumeCoverVariant) {
  alternateBusyId.value = cover.id;
  error.value = '';

  try {
    local.value = normalizeVolume(
      await api.updateVolumeAlternateCover(
        props.obra.id,
        props.volume.number,
        cover.id,
        {
          language: coverDraft.value.language.trim() || null,
          publisher: coverDraft.value.publisher.trim() || null,
          edition: coverDraft.value.edition.trim() || null,
          country: coverDraft.value.country.trim() || null,
          isbn: coverDraft.value.isbn.trim() || null,
          publishDate: coverDraft.value.publishDate || null,
          editionType: coverDraft.value.editionType,
          label: coverDraft.value.label.trim() || null,
        },
      ),
    );
    editingCoverId.value = null;
    await refreshStore();
    notifySuccess('Datos editoriales actualizados', 'Los cambios de esta portada se guardaron correctamente.');
  } catch (cause: unknown) {
    showOperationError(cause, 'No se pudieron actualizar los datos de la portada.');
  } finally {
    alternateBusyId.value = null;
  }
}

function editionTypeLabel(type: VolumeCoverVariant['editionType']) {
  return COVER_EDITION_TYPES.find((item) => item.value === type)?.label || type;
}

function pickVariantFile(cover: VolumeCoverVariant, kind: 'image' | 'spine') {
  variantUploadTarget.value = cover;
  variantUploadKind.value = kind;
  variantFileInput.value?.click();
}

async function onVariantFileChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  const cover = variantUploadTarget.value;
  if (!file || !cover || !validateImage(file)) { input.value = ''; return; }
  alternateBusyId.value = cover.id;
  try {
    local.value = normalizeVolume(variantUploadKind.value === 'image'
      ? await api.replaceVolumeAlternateCover(props.obra.id, props.volume.number, cover.id, file)
      : await api.uploadVolumeAlternateSpine(props.obra.id, props.volume.number, cover.id, file));
    await refreshStore();
    notifySuccess(variantUploadKind.value === 'image' ? 'Imagen reemplazada' : 'Lomo de la edición actualizado', 'Los metadatos de la edición se conservaron.');
  } catch (cause: unknown) {
    showOperationError(cause, variantUploadKind.value === 'image' ? 'No se pudo reemplazar la imagen.' : 'No se pudo subir el lomo.');
  } finally {
    alternateBusyId.value = null;
    variantUploadTarget.value = null;
    input.value = '';
  }
}

async function removeVolume() {
  if (deleting.value) return;

  const confirmed = await confirmAction({
    title: `¿Eliminar el tomo ${props.volume.number}?`,
    description: `Se eliminarán sus portadas, lomo y datos de “${props.obra.titulo}”.`,
    confirmLabel: 'Eliminar tomo',
    danger: true,
  });

  if (!confirmed) return;

  deleting.value = true;
  error.value = '';

  try {
    await api.removeVolume(props.obra.id, props.volume.number);
    await refreshStore();
    notifySuccess('Tomo eliminado');
    emit('deleted');
  } catch (cause: unknown) {
    showOperationError(cause, 'No se pudo eliminar el tomo.');
  } finally {
    deleting.value = false;
  }
}

function closeModal() {
  if (
    !saving.value &&
    !deleting.value &&
    !uploadingCover.value &&
    !uploadingSpine.value &&
    !uploadingAlternate.value
  ) {
    emit('close');
  }
}
</script>

<template>
  <div class="work-modal-overlay" @click.self="closeModal">
    <section
      class="work-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="modalTitle"
    >
      <header class="work-modal__header">
        <div class="work-modal__heading">
          <span class="work-modal__eyebrow">{{ obra.titulo }}</span>
          <h2>{{ modalTitle }}</h2>
          <p>
            Tomo #{{ volume.number }} · ficha, portadas y lomo de esta edición.
          </p>
        </div>

        <button
          type="button"
          class="work-modal__close"
          aria-label="Cerrar"
          @click="closeModal"
        >
          <X />
        </button>
      </header>

      <div class="work-modal__body">
        <div v-if="error" class="work-modal__error">{{ error }}</div>

        <div class="work-form-layout">
          <aside class="work-cover-panel">
            <button
              type="button"
              class="cover-dropzone"
              :class="{ 'is-busy': uploadingCover }"
              @click="pickCover"
            >
              <img
                v-if="local.coverPath"
                :src="local.coverPath"
                alt="Portada base del tomo"
              />

              <div v-else class="cover-dropzone__empty">
                <div class="cover-dropzone__icon"><UploadCloud /></div>
                <strong>Portada base</strong>
                <span>JPG, PNG o WebP</span>
              </div>

              <div v-if="local.coverPath" class="cover-dropzone__replace">
                <ImagePlus />
                Cambiar portada base
              </div>
            </button>

            <input
              ref="coverInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              @change="onCoverChosen"
            />

            <button
              type="button"
              class="cover-dropzone cover-dropzone--spine"
              :class="{ 'is-busy': uploadingSpine }"
              @click="pickSpine"
            >
              <img
                v-if="local.spinePath"
                :src="local.spinePath"
                alt="Lomo del tomo"
              />

              <div v-else class="cover-dropzone__empty">
                <div class="cover-dropzone__icon"><Layers3 /></div>
                <strong>Lomo del tomo</strong>
                <span>Para la Estantería</span>
              </div>

              <div v-if="local.spinePath" class="cover-dropzone__replace">
                <ImagePlus />
                Cambiar lomo
              </div>
            </button>

            <input
              ref="spineInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              @change="onSpineChosen"
            />

            <div class="cover-help">
              <BookMarked />
              <p>
                Las imágenes se muestran completas. El lomo real solo se usa
                cuando lo cargas; de lo contrario se genera uno tipográfico.
              </p>
            </div>
          </aside>

          <main class="work-fields">
            <section class="form-section">
              <div class="form-section__header">
                <div>
                  <span>01</span>
                  <div>
                    <h3>Identificación del tomo</h3>
                    <p>Datos editoriales de esta edición específica.</p>
                  </div>
                </div>
              </div>

              <div class="form-grid">
                <div class="field field--full">
                  <label for="vol-title">Título del tomo (opcional)</label>
                  <input
                    id="vol-title"
                    v-model="f.title"
                    type="text"
                    :placeholder="`Ej. ${obra.titulo} Vol. ${volume.number}`"
                  />
                </div>

                <div class="field">
                  <label for="vol-isbn">ISBN</label>
                  <input
                    id="vol-isbn"
                    v-model="f.isbn"
                    type="text"
                    placeholder="Ej. 978-4-08-873606-9"
                  />
                </div>

                <div class="field">
                  <label for="vol-publisher">Editorial</label>
                  <input
                    id="vol-publisher"
                    v-model="f.publisher"
                    type="text"
                    placeholder="Ej. Shueisha"
                  />
                </div>

                <div class="field">
                  <label for="vol-publish-date">Fecha de publicación</label>
                  <DatePicker id="vol-publish-date" v-model="f.publishDate" aria-label="Fecha de publicación del tomo" />
                </div>

                <div class="field">
                  <label for="vol-ownership">Tipo de propiedad</label>
                  <PurpleSelect v-model="f.ownership" :options="VOLUME_OWNERSHIP" aria-label="Tipo de propiedad" />
                </div>
              </div>
            </section>

            <section class="form-section">
              <div class="form-section__header">
                <div>
                  <span>02</span>
                  <div>
                    <h3>Portadas de otras ediciones</h3>
                    <p>
                      Guarda versiones por idioma, país, editorial o edición.
                    </p>
                  </div>
                </div>
              </div>

              <div class="primary-cover-showcase" :class="{ 'has-cover': activeCoverPath }">
                <div class="primary-cover-showcase__visual">
                  <img v-if="activeCoverPath" :src="activeCoverPath" :alt="activeCoverName" />
                  <div v-else class="primary-cover-showcase__empty"><Images /><span>Sin portada activa</span></div>
                </div>
                <div class="primary-cover-showcase__content">
                  <span class="primary-cover-showcase__badge"><Crown /> PORTADA ACTIVA</span>
                  <h4>{{ activeCoverName }}</h4>
                  <p>{{ primaryAlternateCover ? 'Esta edición se muestra en la cuadrícula de tomos y en la estantería.' : 'Se está usando el archivo base del tomo en toda la biblioteca.' }}</p>
                  <div class="primary-cover-showcase__metadata">
                    <span><b>Editorial</b>{{ primaryAlternateCover?.publisher || local.publisher || obra.publisher || 'Sin especificar' }}</span>
                    <span><b>Idioma</b>{{ primaryAlternateCover?.language || obra.language || 'Sin especificar' }}</span>
                    <span v-if="primaryAlternateCover?.country"><b>País</b>{{ primaryAlternateCover.country }}</span>
                    <span v-if="primaryAlternateCover?.publishDate"><b>Publicación</b>{{ formatCoverDate(primaryAlternateCover.publishDate) }}</span>
                  </div>
                  <div v-if="primaryAlternateCover" class="primary-cover-showcase__actions">
                    <button type="button" class="variant-action" @click="editAlternateCover(primaryAlternateCover)"><Pencil /> Editar datos</button>
                    <button v-if="local.coverPath" type="button" class="variant-action" @click="setPrimaryCover(null)"><Check /> Usar portada base</button>
                  </div>
                </div>
              </div>

              <div class="alternate-section-label">
                <div><span>AGREGAR EDICIÓN</span><h4>Nueva portada editorial</h4></div>
                <button type="button" class="new-edition-button" @click="showEditionCreator = true"><ImagePlus /> Registrar nueva edición</button>
              </div>

              <div v-if="showEditionCreator" class="edition-creator-overlay" @click.self="closeEditionCreator">
              <form class="alternate-cover-form edition-creator" @submit.prevent="createAlternateEdition">
                <header class="edition-creator__header">
                  <div><span>NUEVA EDICIÓN</span><h4>Portada y datos editoriales</h4><p>Cada portada representa una edición concreta del mismo tomo.</p></div>
                  <button type="button" aria-label="Cerrar" @click="closeEditionCreator"><X /></button>
                </header>
                <button type="button" class="edition-image-picker" @click="pickAlternateCover">
                  <img v-if="alternatePreview" :src="alternatePreview" alt="Vista previa de la nueva portada" />
                  <span v-else><ImagePlus /><b>Seleccionar portada</b><small>JPG, PNG o WebP · máximo 8 MB</small></span>
                  <em>{{ alternatePreview ? 'Cambiar imagen' : 'La imagen es obligatoria' }}</em>
                </button>
                <p class="alternate-cover-form__help">
                  Añade un nombre fácil de reconocer y la editorial. El resto es opcional y podrás editarlo después.
                </p>
                <div class="field">
                  <label for="alternate-language">Idioma</label>
                  <PurpleSelect v-model="alternateForm.language" :options="languageOptions" placeholder="Sin especificar" aria-label="Idioma de la edición" searchable clearable />
                </div>

                <div class="field">
                  <label for="alternate-publisher">Editorial</label>
                  <input
                    id="alternate-publisher"
                    v-model="alternateForm.publisher"
                    type="text"
                    placeholder="Ej. Panini Manga"
                  />
                </div>

                <div class="field">
                  <label for="alternate-edition">Edición</label>
                  <input
                    id="alternate-edition"
                    v-model="alternateForm.edition"
                    type="text"
                    placeholder="Ej. Primera edición"
                  />
                </div>

                <div class="field">
                  <label for="alternate-edition-type">Tipo de edición</label>
                  <PurpleSelect v-model="alternateForm.editionType" :options="COVER_EDITION_TYPES" aria-label="Tipo de edición" />
                </div>

                <div class="field">
                  <label for="alternate-country">País</label>
                  <input id="alternate-country" v-model="alternateForm.country" type="text" placeholder="Ej. Japón" />
                </div>

                <div class="field">
                  <label for="alternate-isbn">ISBN de esta edición</label>
                  <input id="alternate-isbn" v-model="alternateForm.isbn" type="text" placeholder="Ej. 978-4-08-873606-9" />
                </div>

                <div class="field">
                  <label for="alternate-date">Fecha de publicación</label>
                  <DatePicker id="alternate-date" v-model="alternateForm.publishDate" aria-label="Fecha de publicación de la edición" />
                </div>

                <div class="field">
                  <label for="alternate-label">Nombre visible</label>
                  <input
                    id="alternate-label"
                    v-model="alternateForm.label"
                    type="text"
                    placeholder="Ej. Portada japonesa"
                  />
                </div>

                <label class="primary-cover-check">
                  <input
                    v-model="alternateForm.isPrimary"
                    type="checkbox"
                  />
                  Usar como portada principal
                </label>

                <button
                  type="button"
                  class="edition-secondary-button"
                  @click="pickAlternateCover"
                >
                  <ImagePlus />
                  {{ alternatePreview ? 'Cambiar imagen' : 'Seleccionar imagen' }}
                </button>

                <div class="edition-creator__actions">
                  <button type="button" class="variant-action" @click="closeEditionCreator">Cancelar</button>
                  <button type="submit" class="alternate-upload-button" :disabled="uploadingAlternate || !alternateFile"><Save />{{ uploadingAlternate ? 'Guardando edición…' : 'Guardar edición' }}</button>
                </div>

                <input
                  ref="alternateCoverInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  @change="onAlternateCoverChosen"
                />
              </form>
              </div>

              <div class="cover-library-heading">
                <div><span>COLECCIÓN</span><h4>Otras ediciones</h4></div>
                <strong>{{ alternateCovers.length }}</strong>
              </div>

              <div class="cover-variants">
                <article
                  v-for="cover in alternateCovers"
                  :key="cover.id"
                  class="cover-variant"
                  :class="{
                    primary: cover.isPrimary,
                    busy: alternateBusyId === cover.id,
                  }"
                >
                  <div class="cover-variant__image">
                    <img :src="cover.thumbnailPath || cover.path" :alt="cover.label || 'Portada alternativa'" />

                    <span v-if="cover.isPrimary" class="cover-variant__primary">
                      <Crown />
                      Principal
                    </span>
                  </div>

                  <div class="cover-variant__body">
                    <template v-if="editingCoverId !== cover.id">
                      <strong>{{ cover.label || cover.edition || 'Portada alternativa' }}</strong>

                      <div class="edition-badges">
                        <span>{{ editionTypeLabel(cover.editionType) }}</span>
                        <span v-if="cover.spinePath">Lomo disponible</span>
                      </div>

                      <dl class="cover-metadata">
                        <div><dt>Editorial</dt><dd>{{ cover.publisher || 'Sin especificar' }}</dd></div>
                        <div><dt>Idioma</dt><dd>{{ cover.language || 'Sin especificar' }}</dd></div>
                        <div><dt>Edición</dt><dd>{{ cover.edition || 'Sin especificar' }}</dd></div>
                        <div><dt>País</dt><dd>{{ cover.country || 'Sin especificar' }}</dd></div>
                        <div><dt>ISBN</dt><dd>{{ cover.isbn || 'Sin especificar' }}</dd></div>
                        <div><dt>Publicación</dt><dd>{{ cover.publishDate ? new Intl.DateTimeFormat('es-PE').format(new Date(cover.publishDate)) : 'Sin especificar' }}</dd></div>
                      </dl>

                      <div class="cover-variant__actions">
                        <button type="button" class="variant-action" :disabled="alternateBusyId === cover.id" @click="pickVariantFile(cover, 'image')"><UploadCloud /> Cambiar imagen</button>
                        <button type="button" class="variant-action" :disabled="alternateBusyId === cover.id" @click="pickVariantFile(cover, 'spine')"><Layers3 /> {{ cover.spinePath ? 'Cambiar lomo' : 'Subir lomo' }}</button>
                        <button type="button" class="variant-action" :disabled="alternateBusyId === cover.id" @click="editAlternateCover(cover)">
                          <Pencil /> Editar datos
                        </button>
                        <button v-if="!cover.isPrimary" type="button" class="variant-action" :disabled="alternateBusyId === cover.id" @click="setPrimaryCover(cover)">
                          <Crown /> Principal
                        </button>
                        <button type="button" class="variant-action variant-action--danger" :disabled="alternateBusyId === cover.id" @click="removeAlternateCover(cover)">
                          <Trash2 /> Eliminar
                        </button>
                      </div>
                    </template>

                    <form v-else class="cover-metadata-editor" @submit.prevent="saveCoverMetadata(cover)">
                      <label><span>Nombre visible</span><input v-model="coverDraft.label" maxlength="160" placeholder="Ej. Portada japonesa" /></label>
                      <label><span>Editorial</span><input v-model="coverDraft.publisher" maxlength="160" placeholder="Ej. Shueisha" /></label>
                      <label><span>Idioma</span><PurpleSelect v-model="coverDraft.language" :options="languageOptions" placeholder="Sin especificar" aria-label="Idioma de la portada" searchable clearable /></label>
                      <label><span>Edición</span><input v-model="coverDraft.edition" maxlength="160" placeholder="Ej. Primera edición" /></label>
                      <label><span>Tipo de edición</span><PurpleSelect v-model="coverDraft.editionType" :options="COVER_EDITION_TYPES" aria-label="Tipo de edición de la portada" /></label>
                      <label><span>País</span><input v-model="coverDraft.country" maxlength="100" placeholder="Ej. Japón" /></label>
                      <label><span>ISBN</span><input v-model="coverDraft.isbn" maxlength="40" placeholder="Ej. 978-4-08-873606-9" /></label>
                      <label><span>Fecha de publicación</span><DatePicker v-model="coverDraft.publishDate" aria-label="Fecha de publicación de la portada" /></label>
                      <div class="cover-metadata-editor__actions">
                        <button type="button" class="variant-action" @click="cancelCoverEdit"><X /> Cancelar</button>
                        <button type="submit" class="variant-action variant-action--save" :disabled="alternateBusyId === cover.id"><Save /> Guardar</button>
                      </div>
                    </form>
                  </div>
                </article>

                <div
                  v-if="alternateCovers.length === 0"
                  class="cover-variants__empty"
                >
                  <Images />
                  <span>Todavía no hay otras ediciones registradas para este tomo.</span>
                </div>
              </div>

              <input ref="variantFileInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onVariantFileChosen" />
            </section>

            <section class="form-section">
              <div class="form-section__header">
                <div>
                  <span>03</span>
                  <div>
                    <h3>Progreso de lectura</h3>
                    <p>Estado, capítulos y fechas de este tomo.</p>
                  </div>
                </div>
              </div>

              <div class="form-grid">
                <div class="field">
                  <label for="vol-status">Estado</label>
                  <PurpleSelect v-model="f.status" :options="VOLUME_STATUSES" aria-label="Estado de lectura del tomo" />
                </div>

                <div class="field">
                  <label for="vol-chapters">Capítulos</label>
                  <input
                    id="vol-chapters"
                    v-model="f.chapters"
                    type="text"
                    placeholder="Ej. 1 – 10"
                  />
                </div>

                <div class="field">
                  <label for="vol-start">Fecha de inicio</label>
                  <DatePicker id="vol-start" v-model="f.startDate" aria-label="Fecha de inicio de lectura" />
                </div>

                <div class="field">
                  <label for="vol-finish">Fecha de fin</label>
                  <DatePicker id="vol-finish" v-model="f.finishDate" aria-label="Fecha de fin de lectura" />
                </div>

                <div class="field field--full">
                  <label class="read-toggle-label">
                    <input v-model="f.read" type="checkbox" />
                    Marcar tomo como leído
                  </label>
                </div>
              </div>
            </section>

            <section class="form-section">
              <div class="form-section__header">
                <div>
                  <span>04</span>
                  <div>
                    <h3>Notas</h3>
                    <p>Comentarios personales sobre este tomo.</p>
                  </div>
                </div>
              </div>

              <div class="field field--full">
                <textarea
                  v-model="f.notes"
                  maxlength="2000"
                  placeholder="Notas sobre esta edición, estado físico, dedicatorias, etc."
                />
                <div class="char-count">
                  {{ f.notes.length }} / 2000
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <footer class="work-modal__footer">
        <button
          type="button"
          class="danger-button"
          :disabled="deleting || saving"
          @click="removeVolume"
        >
          <Trash2 />
          {{ deleting ? 'Eliminando…' : 'Eliminar tomo' }}
        </button>

        <div class="work-modal__actions">
          <button
            type="button"
            class="link-button"
            @click="$emit('open-obra')"
          >
            <BookOpen />
            Ver obra completa
          </button>

          <button
            type="button"
            class="secondary-button"
            :disabled="saving || deleting"
            @click="closeModal"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="primary-button"
            :disabled="saving || deleting"
            @click="submit"
          >
            <Save />
            {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.work-modal-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(2,4,10,.78);backdrop-filter:blur(12px);animation:karma-volume-overlay-in .22s ease-out both}
.work-modal{width:min(1220px,100%);max-height:min(940px,94vh);display:flex;flex-direction:column;overflow:hidden;color:var(--text);background:linear-gradient(145deg,rgba(255,255,255,.018),transparent 30%),#080b12;border:1px solid rgba(255,255,255,.075);border-radius:18px;box-shadow:0 34px 90px rgba(0,0,0,.62),0 0 0 1px rgba(159,107,255,.045),0 0 48px rgba(89,39,160,.09);animation:karma-volume-modal-in .28s cubic-bezier(.2,.85,.25,1) both}
@keyframes karma-volume-overlay-in{from{opacity:0}to{opacity:1}}
@keyframes karma-volume-modal-in{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.work-modal__header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:22px 26px 18px;background:rgba(8,11,18,.96);border-bottom:1px solid rgba(255,255,255,.06)}
.work-modal__eyebrow{display:block;margin-bottom:6px;color:var(--accent);font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
.work-modal__header h2{margin:0 0 5px;font-size:21px}
.work-modal__header p{margin:0;color:var(--text-dim);font-size:12.5px}
.work-modal__close{width:34px;height:34px;display:grid;place-items:center;color:var(--text-dim);background:#0d111a;border:1px solid rgba(255,255,255,.075);border-radius:9px;cursor:pointer}
.work-modal__close:hover{color:var(--text);border-color:rgba(159,107,255,.32)}
.work-modal__close svg{width:16px;height:16px}
.work-modal__body{flex:1;overflow-y:auto;padding:22px 26px 26px}
.work-modal__error{margin-bottom:16px;padding:11px 13px;color:#fca5a5;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.28);border-radius:9px;font-size:12.5px}
.work-form-layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:22px;align-items:start}
.work-cover-panel{position:sticky;top:0;display:flex;flex-direction:column;gap:10px}
.cover-dropzone{position:relative;width:100%;aspect-ratio:2/3;padding:0;overflow:hidden;color:var(--text-faint);background:radial-gradient(circle at 50% 35%,rgba(159,107,255,.09),transparent 58%),#0b0f18;border:1px dashed rgba(159,107,255,.38);border-radius:12px;cursor:pointer;transition:.16s}
.cover-dropzone:hover{border-color:var(--accent);box-shadow:0 0 25px rgba(139,70,245,.13);transform:translateY(-2px)}
.cover-dropzone.is-busy{opacity:.82;pointer-events:none}
.cover-dropzone.is-busy:after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 20%,rgba(185,145,255,.2) 46%,transparent 72%);transform:translateX(-110%);animation:karma-upload-sheen 1.05s ease-in-out infinite}
.cover-dropzone>img{width:100%;height:100%;display:block;object-fit:contain;object-position:center;background:#05070d;animation:karma-volume-image-reveal .3s ease-out both}
@keyframes karma-upload-sheen{to{transform:translateX(110%)}}
@keyframes karma-volume-image-reveal{from{opacity:0;transform:scale(1.025);filter:blur(3px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
.cover-dropzone__empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:18px;text-align:center}
.cover-dropzone__icon{width:40px;height:40px;display:grid;place-items:center;margin-bottom:4px;color:var(--accent);background:rgba(159,107,255,.1);border:1px solid rgba(159,107,255,.22);border-radius:12px}
.cover-dropzone__icon svg{width:20px;height:20px}
.cover-dropzone__empty strong{color:var(--text);font-size:12px}
.cover-dropzone__empty span{color:var(--text-dim);font-size:10.5px}
.cover-dropzone__replace{position:absolute;right:8px;bottom:8px;left:8px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;color:#fff;background:rgba(4,6,13,.82);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:11px;font-weight:650}
.cover-dropzone__replace svg{width:14px;height:14px}
.cover-dropzone--spine{aspect-ratio:2/1.4}
.cover-help{display:flex;align-items:flex-start;gap:8px;padding:11px;color:var(--text-faint);background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.055);border-radius:9px}
.cover-help svg{width:15px;height:15px;flex-shrink:0;color:var(--accent)}
.cover-help p{margin:0;font-size:10.5px;line-height:1.5}
.form-section{padding:17px;margin-bottom:14px;background:linear-gradient(145deg,rgba(255,255,255,.012),transparent 36%),#0a0e16;border:1px solid rgba(255,255,255,.06);border-radius:12px}
.form-section__header{margin-bottom:15px}
.form-section__header>div{display:flex;align-items:center;gap:10px}
.form-section__header>div>span{width:28px;height:28px;display:grid;place-items:center;flex-shrink:0;color:var(--accent);background:rgba(159,107,255,.08);border:1px solid rgba(159,107,255,.2);border-radius:8px;font-size:10px;font-weight:800}
.form-section__header h3{margin:0 0 2px;font-size:13px}
.form-section__header p{margin:0;color:var(--text-faint);font-size:10.5px}
.form-grid,.alternate-cover-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
.primary-cover-showcase{display:grid;grid-template-columns:138px minmax(0,1fr);gap:18px;min-height:208px;margin-bottom:22px;padding:13px;background:radial-gradient(circle at 15% 30%,rgba(159,107,255,.14),transparent 38%),linear-gradient(125deg,#0d0b18,#080b12 68%);border:1px solid rgba(159,107,255,.2);border-radius:13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 14px 30px rgba(0,0,0,.15)}
.primary-cover-showcase__visual{width:138px;aspect-ratio:2/3;overflow:hidden;background:#05070d;border:1px solid rgba(255,255,255,.08);border-radius:9px;box-shadow:0 12px 28px rgba(0,0,0,.42)}
.primary-cover-showcase__visual img{width:100%;height:100%;display:block;object-fit:contain}
.primary-cover-showcase__empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text-faint);font-size:10px}.primary-cover-showcase__empty svg{width:24px;color:var(--accent)}
.primary-cover-showcase__content{min-width:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:6px 8px 6px 0}
.primary-cover-showcase__badge{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;color:#d8c2ff;background:rgba(159,107,255,.11);border:1px solid rgba(159,107,255,.22);border-radius:999px;font-size:8px;font-weight:850;letter-spacing:.08em}.primary-cover-showcase__badge svg{width:11px;height:11px}
.primary-cover-showcase h4{margin:11px 0 5px;font-size:18px;letter-spacing:-.02em}.primary-cover-showcase__content>p{max-width:540px;margin:0;color:var(--text-faint);font-size:10.5px;line-height:1.5}
.primary-cover-showcase__metadata{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.primary-cover-showcase__metadata span{display:flex;flex-direction:column;gap:2px;min-width:105px;padding:7px 9px;color:var(--text-dim);background:rgba(255,255,255,.022);border:1px solid rgba(255,255,255,.055);border-radius:7px;font-size:9.5px}.primary-cover-showcase__metadata b{color:var(--text-faint);font-size:7.5px;letter-spacing:.06em;text-transform:uppercase}
.primary-cover-showcase__actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.alternate-section-label,.cover-library-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:2px 0 12px;padding-top:16px;border-top:1px solid rgba(255,255,255,.06)}
.alternate-section-label span,.cover-library-heading span{color:#9e72df;font-size:7.5px;font-weight:850;letter-spacing:.12em}.alternate-section-label h4,.cover-library-heading h4{margin:3px 0 0;font-size:12.5px}.alternate-section-label>p{max-width:430px;margin:0;color:var(--text-faint);font-size:9.5px;line-height:1.45;text-align:right}
.cover-library-heading{align-items:center;margin-top:22px}.cover-library-heading>strong{min-width:27px;height:27px;display:grid;place-items:center;color:#d8c2ff;background:rgba(159,107,255,.1);border:1px solid rgba(159,107,255,.2);border-radius:8px;font-size:10px}
.alternate-cover-form__help{grid-column:1/-1;margin:0;padding:9px 11px;color:var(--text-faint);background:rgba(159,107,255,.045);border-left:2px solid rgba(159,107,255,.55);border-radius:0 7px 7px 0;font-size:10.5px;line-height:1.5}
.field--full{grid-column:1/-1}
.field>label{display:block;margin-bottom:6px;color:var(--text-dim);font-size:10.5px;font-weight:700}
.field input,.field select,.field textarea{width:100%;color:var(--text);background:#080b12;border:1px solid rgba(255,255,255,.075);border-radius:8px;outline:none;font:12.5px inherit}
.field input,.field select{height:38px;padding:0 11px}
.field textarea{min-height:92px;padding:10px 11px;resize:vertical;line-height:1.5}
.field input:focus,.field select:focus,.field textarea:focus{border-color:rgba(159,107,255,.72);box-shadow:0 0 0 3px rgba(159,107,255,.08)}
.char-count{margin-top:4px;color:var(--text-faint);font-size:9.5px;text-align:right}
.read-toggle-label,.primary-cover-check{display:flex;align-items:center;gap:8px;color:var(--text-dim);font-size:11px;font-weight:650;cursor:pointer}
.read-toggle-label input,.primary-cover-check input{width:16px;height:16px;accent-color:var(--accent)}
.primary-cover-check{align-self:center}
.alternate-upload-button{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 13px;color:#efe8ff;background:rgba(159,107,255,.1);border:1px dashed rgba(159,107,255,.42);border-radius:8px;font:700 11px inherit;cursor:pointer}
.alternate-upload-button:hover{background:rgba(159,107,255,.16);border-color:var(--accent)}
.alternate-upload-button:disabled{opacity:.5;cursor:not-allowed}
.alternate-upload-button svg{width:14px;height:14px}
.cover-variants{display:grid;grid-template-columns:repeat(auto-fill,minmax(225px,1fr));gap:14px;margin-top:18px;align-items:start}
.cover-variant{overflow:hidden;background:#080b12;border:1px solid rgba(255,255,255,.065);border-radius:10px}
.cover-variant.primary{border-color:rgba(159,107,255,.5);box-shadow:0 0 0 2px rgba(159,107,255,.07)}
.cover-variant.busy{opacity:.5;pointer-events:none}
.cover-variant__image{position:relative;width:100%;aspect-ratio:2/3;overflow:hidden;background:#05070d}
.cover-variant__image img{width:100%;height:100%;display:block;object-fit:contain;object-position:center}
.cover-variant__primary{position:absolute;top:7px;left:7px;display:inline-flex;align-items:center;gap:4px;padding:4px 7px;color:#fff;background:rgba(105,52,184,.88);border:1px solid rgba(255,255,255,.16);border-radius:999px;font-size:8px;font-weight:800}
.cover-variant__primary svg{width:10px;height:10px}
.cover-variant__body{display:flex;flex-direction:column;gap:9px;padding:12px}
.cover-variant__body strong{overflow:hidden;color:var(--text);font-size:11.5px;text-overflow:ellipsis;white-space:nowrap}
.cover-variant__body>span{min-height:28px;color:var(--text-faint);font-size:9px;line-height:1.4}
.cover-metadata{display:flex;flex-direction:column;gap:6px;margin:0;padding:9px;background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.05);border-radius:7px}
.cover-metadata>div{display:grid;grid-template-columns:72px minmax(0,1fr);gap:7px;align-items:start}
.cover-metadata dt{color:var(--text-faint);font-size:8px;font-weight:750;letter-spacing:.04em;text-transform:uppercase}
.cover-metadata dd{overflow:hidden;margin:0;color:var(--text-dim);font-size:9px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}
.cover-variant__actions{display:flex;flex-wrap:wrap;gap:5px}
.edition-badges{display:flex;flex-wrap:wrap;gap:5px;margin:-2px 0 8px}.edition-badges span{padding:3px 7px;border:1px solid rgba(159,107,255,.22);border-radius:999px;background:rgba(159,107,255,.08);color:#bca3ef;font-size:8px;font-weight:750;letter-spacing:.04em;text-transform:uppercase}
.variant-action{min-height:28px;display:inline-flex;align-items:center;justify-content:center;gap:5px;flex:1;padding:0 7px;color:var(--text-dim);background:#0d111a;border:1px solid rgba(255,255,255,.075);border-radius:6px;font:700 8.5px inherit;cursor:pointer}
.variant-action:hover{color:var(--accent);border-color:rgba(159,107,255,.3)}
.variant-action--danger:hover{color:#fca5a5;border-color:rgba(248,113,113,.3)}
.variant-action--save{color:#d6c3ff;border-color:rgba(159,107,255,.28);background:rgba(159,107,255,.09)}
.variant-action svg{width:10px;height:10px}
.cover-metadata-editor{display:flex;flex-direction:column;gap:9px}
.cover-metadata-editor label{display:flex;flex-direction:column;gap:4px}
.cover-metadata-editor label>span{color:var(--text-faint);font-size:8px;font-weight:750;letter-spacing:.04em;text-transform:uppercase}
.cover-metadata-editor input,.cover-metadata-editor select{width:100%;height:32px;padding:0 8px;color:var(--text);background:#05070d;border:1px solid rgba(255,255,255,.09);border-radius:6px;outline:none;font:10.5px inherit}
.cover-metadata-editor input:focus,.cover-metadata-editor select:focus{border-color:rgba(159,107,255,.65);box-shadow:0 0 0 2px rgba(159,107,255,.07)}
.cover-metadata-editor__actions{display:flex;gap:6px;margin-top:3px}
.cover-variants__empty{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:var(--text-faint);border:1px dashed rgba(255,255,255,.075);border-radius:9px;font-size:10.5px}
.cover-variants__empty svg{width:16px;height:16px}
.work-modal__footer{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:15px 26px;background:rgba(7,10,17,.97);border-top:1px solid rgba(255,255,255,.06)}
.work-modal__actions{display:flex;align-items:center;gap:9px}
.primary-button,.secondary-button,.danger-button,.link-button{min-height:38px;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:0 15px;border-radius:8px;font:700 12px inherit;cursor:pointer}
.primary-button svg,.danger-button svg,.link-button svg{width:14px;height:14px}
.primary-button{color:#fff;background:var(--accent-gradient);border:1px solid rgba(201,169,255,.22);box-shadow:0 8px 22px rgba(121,52,222,.24)}
.secondary-button{color:var(--text);background:#0d111a;border:1px solid rgba(255,255,255,.075)}
.danger-button{color:#fca5a5;background:transparent;border:1px solid transparent}
.link-button{color:var(--text-dim);background:transparent;border:1px solid transparent;padding:0 8px}
.link-button:hover{color:var(--accent)}
.primary-button:disabled,.secondary-button:disabled,.danger-button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:900px){.work-form-layout{grid-template-columns:155px minmax(0,1fr)}}
@media(max-width:700px){
  .work-modal-overlay{padding:0}
  .work-modal{width:100%;height:100%;max-height:none;border:0;border-radius:0}
  .work-modal__header,.work-modal__body,.work-modal__footer{padding-right:18px;padding-left:18px}
  .work-form-layout{grid-template-columns:1fr}
  .work-cover-panel{position:static;display:grid;grid-template-columns:130px minmax(0,1fr);gap:10px}
  .cover-dropzone--spine{aspect-ratio:2/3}
  .form-grid,.alternate-cover-form{grid-template-columns:1fr}
  .primary-cover-showcase{grid-template-columns:105px minmax(0,1fr);gap:12px}.primary-cover-showcase__visual{width:105px}.primary-cover-showcase__metadata{display:none}.alternate-section-label{align-items:flex-start;flex-direction:column}.alternate-section-label>p{text-align:left}
  .cover-variants{grid-template-columns:repeat(2,minmax(0,1fr))}
  .work-modal__footer{align-items:stretch;flex-direction:column-reverse;gap:12px}
  .work-modal__actions{width:100%;flex-wrap:wrap}
  .primary-button,.secondary-button{flex:1}
  .danger-button,.link-button{width:100%}
}
.new-edition-button{display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid rgba(159,107,255,.38);border-radius:8px;background:rgba(159,107,255,.11);color:#d9c7ff;font-size:10px;font-weight:750}.new-edition-button svg{width:14px}.edition-creator-overlay{position:fixed;inset:0;z-index:3100;display:grid;place-items:center;padding:20px;background:rgba(3,3,7,.84);backdrop-filter:blur(11px)}.alternate-cover-form.edition-creator{display:grid;width:min(720px,100%);max-height:90vh;overflow-y:auto;grid-template-columns:180px repeat(2,minmax(0,1fr));gap:13px;padding:22px;border:1px solid #3b304d;border-radius:18px;background:#0d0c13;box-shadow:0 35px 110px #000}.edition-creator__header{grid-column:1/-1;display:flex;justify-content:space-between;margin:-22px -22px 4px;padding:20px 22px;border-bottom:1px solid #282130;background:linear-gradient(110deg,#181122,#0d0c13);border-radius:18px 18px 0 0}.edition-creator__header span{color:#aa77ff;font-size:8px;font-weight:850;letter-spacing:.16em}.edition-creator__header h4{margin:4px 0 2px;font-size:17px}.edition-creator__header p{margin:0;color:#807a8a;font-size:10px}.edition-creator__header button{align-self:flex-start;border:0;background:none;color:#98919f}.edition-creator__header button svg{width:17px}.edition-image-picker{grid-row:2/span 5;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:260px;overflow:hidden;padding:8px;border:1px dashed #55406f;border-radius:11px;background:radial-gradient(circle at 50% 30%,#241737,#0a090e 70%);color:#968aa5}.edition-image-picker img{width:100%;height:225px;object-fit:contain;border-radius:7px}.edition-image-picker>span{display:grid;place-items:center;gap:7px;text-align:center}.edition-image-picker svg{width:26px;color:#a875ff}.edition-image-picker b{color:#ddd3ec;font-size:11px}.edition-image-picker small{font-size:8px}.edition-image-picker em{margin-top:9px;color:#a986d7;font-size:8px;font-style:normal;font-weight:700}.edition-creator .alternate-cover-form__help{grid-column:2/-1}.edition-creator .primary-cover-check{grid-column:2/-1}.edition-secondary-button{display:none}.edition-creator__actions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:7px;padding-top:5px;border-top:1px solid #24202c}.edition-creator__actions .alternate-upload-button{grid-column:auto;min-width:150px}.edition-creator__actions .variant-action{padding:0 14px}.edition-creator__actions svg{width:13px}@media(max-width:700px){.alternate-cover-form.edition-creator{grid-template-columns:1fr}.edition-creator__header,.edition-creator .alternate-cover-form__help,.edition-creator .primary-cover-check,.edition-creator__actions{grid-column:1}.edition-image-picker{grid-row:auto;min-height:180px}.edition-image-picker img{height:170px}}
</style>
