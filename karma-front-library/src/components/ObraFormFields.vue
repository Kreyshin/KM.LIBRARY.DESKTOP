<script setup lang="ts">
import { computed, ref } from 'vue';
import { BookOpen, Check, ImagePlus, Star, Trash2, UploadCloud } from 'lucide-vue-next';
import {
  FORMATS,
  DEMOGRAPHICS,
  LANGUAGES,
  STATUSES,
  type FormatType,
  type Demographic,
  type ReadingStatus,
} from '../api/client';
import TagInput from './TagInput.vue';
import PurpleSelect from './PurpleSelect.vue';

export interface ObraFormValue {
  titulo: string;
  originalTitle: string;
  autor: string;
  illustrator: string;
  publisher: string;
  releaseYear: string;
  tipo: FormatType;
  demographic: Demographic | '';
  genres: string[];
  language: string;
  status: ReadingStatus;
  currentVolume: string;
  currentChapter: string;
  totalChapters: string;
  tags: string[];
  rating: number;
  description: string;
  personalReview: string;
  notes: string;
}

const f = defineModel<ObraFormValue>({ required: true });
defineProps<{ coverPreview: string | null; genreSuggestions: string[] }>();
const emit = defineEmits<{
  (e: 'cover-chosen', file: File): void;
  (e: 'cover-error', message: string): void;
  (e: 'remove-cover'): void;
  (e: 'create-genre', name: string): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const supportsDemographic = computed(() => ['MANGA', 'MANHWA', 'MANHUA'].includes(f.value.tipo));
const languageOptions = LANGUAGES.map((language) => ({ value: language, label: language }));

function pickCover() {
  fileInput.value?.click();
}

function onCoverChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    emit('cover-error', 'Selecciona un archivo de imagen válido.');
    input.value = '';
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    emit('cover-error', 'La portada no debe superar los 5 MB.');
    input.value = '';
    return;
  }

  emit('cover-chosen', file);
  input.value = '';
}
</script>

<template>
  <div class="work-form-layout">
    <aside class="work-cover-panel">
      <button type="button" class="cover-dropzone" @click="pickCover">
        <img v-if="coverPreview" :src="coverPreview" alt="Vista previa de portada" />

        <div v-else class="cover-dropzone__empty">
          <div class="cover-dropzone__icon"><UploadCloud /></div>
          <strong>Subir portada</strong>
          <span>JPG, PNG o WebP</span>
          <small>Máximo 5 MB</small>
        </div>

        <div v-if="coverPreview" class="cover-dropzone__replace">
          <ImagePlus /> Cambiar portada
        </div>
      </button>

      <button v-if="coverPreview" type="button" class="cover-remove" @click="$emit('remove-cover')">
        <Trash2 /> Quitar portada
      </button>

      <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" hidden @change="onCoverChosen" />

      <div class="cover-help">
        <BookOpen />
        <p>Usa una portada vertical. Los tomos podrán tener portadas propias.</p>
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
          <div class="field"><label>Géneros</label><TagInput v-model="f.genres" :suggestions="genreSuggestions" allow-create placeholder="Busca un género o escribe uno nuevo…" @create="$emit('create-genre', $event)" /></div>
          <div class="field"><label>Idioma</label><PurpleSelect v-model="f.language" :options="languageOptions" placeholder="Selecciona un idioma" aria-label="Idioma de la obra" searchable clearable /></div>
          <div class="field"><label>Estado *</label><PurpleSelect v-model="f.status" :options="STATUSES" aria-label="Estado de lectura de la obra" /></div>
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

<style scoped>
.work-form-layout{display:grid;grid-template-columns:190px minmax(0,1fr);gap:22px;align-items:start}
.work-cover-panel{position:sticky;top:0;display:flex;flex-direction:column;gap:10px}
.cover-dropzone{position:relative;width:100%;aspect-ratio:2/3;padding:0;overflow:hidden;color:var(--text-faint);background:radial-gradient(circle at 50% 35%,rgba(159,107,255,.09),transparent 58%),#0b0f18;border:1px dashed rgba(159,107,255,.38);border-radius:12px;cursor:pointer;transition:.16s}
.cover-dropzone:hover{border-color:var(--accent);box-shadow:0 0 25px rgba(139,70,245,.13);transform:translateY(-2px)}
.cover-dropzone>img{width:100%;height:100%;display:block;object-fit:contain;object-position:center;background:#05070d;animation:karma-form-image-reveal .3s ease-out both}
.cover-dropzone__empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:18px;text-align:center}
.cover-dropzone__icon{width:44px;height:44px;display:grid;place-items:center;margin-bottom:4px;color:var(--accent);background:rgba(159,107,255,.1);border:1px solid rgba(159,107,255,.22);border-radius:12px}
.cover-dropzone__icon svg{width:22px;height:22px}
.cover-dropzone__empty strong{color:var(--text);font-size:12.5px}
.cover-dropzone__empty span{color:var(--text-dim);font-size:11px}
.cover-dropzone__empty small{font-size:10px}
.cover-dropzone__replace{position:absolute;right:8px;bottom:8px;left:8px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;color:#fff;background:rgba(4,6,13,.82);border:1px solid rgba(255,255,255,.1);border-radius:8px;font-size:11px;font-weight:650}
.cover-dropzone__replace svg,.cover-remove svg{width:14px;height:14px}
.cover-remove{display:flex;align-items:center;justify-content:center;gap:7px;padding:8px 10px;color:var(--text-dim);background:transparent;border:1px solid var(--border);border-radius:8px;font:11.5px inherit;cursor:pointer}
.cover-remove:hover{color:#fca5a5;border-color:rgba(248,113,113,.28);background:rgba(248,113,113,.06)}
.cover-help{display:flex;align-items:flex-start;gap:8px;padding:11px;color:var(--text-faint);background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.055);border-radius:9px}
.cover-help svg{width:15px;height:15px;flex-shrink:0;color:var(--accent)}
.cover-help p{margin:0;font-size:10.5px;line-height:1.5}
@keyframes karma-form-image-reveal{from{opacity:0;transform:scale(1.025);filter:blur(3px)}to{opacity:1;transform:scale(1);filter:blur(0)}}
.form-section{padding:17px;margin-bottom:14px;background:linear-gradient(145deg,rgba(255,255,255,.012),transparent 36%),#0a0e16;border:1px solid rgba(255,255,255,.06);border-radius:12px}
.form-section__header{margin-bottom:15px}
.form-section__header>div{display:flex;align-items:center;gap:10px}
.form-section__header>div>span{width:28px;height:28px;display:grid;place-items:center;flex-shrink:0;color:var(--accent);background:rgba(159,107,255,.08);border:1px solid rgba(159,107,255,.2);border-radius:8px;font-size:10px;font-weight:800}
.form-section__header h3{margin:0 0 2px;font-size:13px}
.form-section__header p{margin:0;color:var(--text-faint);font-size:10.5px}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
.form-grid--classification{margin-top:14px}
.field--full{grid-column:1/-1}
.field>label{display:block;margin-bottom:6px;color:var(--text-dim);font-size:10.5px;font-weight:700}
.field input,.field select,.field textarea{width:100%;color:var(--text);background:#080b12;border:1px solid rgba(255,255,255,.075);border-radius:8px;outline:none;font:12.5px inherit}
.field input,.field select{height:38px;padding:0 11px}
.field textarea{min-height:92px;padding:10px 11px;resize:vertical;line-height:1.5}
.field input:focus,.field select:focus,.field textarea:focus{border-color:rgba(159,107,255,.72);box-shadow:0 0 0 3px rgba(159,107,255,.08)}
.format-toggle-row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.format-toggle{min-height:38px;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 10px;color:var(--text-dim);background:#080b12;border:1px solid rgba(255,255,255,.075);border-radius:8px;font:650 11.5px inherit;cursor:pointer}
.format-toggle.active{color:#efe8ff;background:linear-gradient(135deg,rgba(159,107,255,.17),rgba(124,58,237,.09));border-color:rgba(159,107,255,.7)}
.format-toggle svg{width:13px;height:13px;color:var(--accent)}
.rating-row{margin-bottom:14px}
.star-picker{display:flex;align-items:center;gap:4px}
.star-picker button{width:28px;height:28px;display:grid;place-items:center;padding:0;color:var(--text-faint);background:transparent;border:0;cursor:pointer}
.star-picker button svg{width:20px;height:20px}
.star-picker button.filled{color:var(--warning)}
.star-picker button.filled svg{fill:currentColor}
.star-picker>span{margin-left:8px;color:var(--text-faint);font-size:11px}
.char-count{margin-top:4px;color:var(--text-faint);font-size:9.5px;text-align:right}
.demographic-field{padding:13px;border:1px solid rgba(159,107,255,.13);border-radius:10px;background:rgba(159,107,255,.025)}
.demographic-field>p{margin:-2px 0 10px;color:var(--text-faint);font-size:9.5px}
.demographic-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.demographic-options button{display:grid;gap:2px;padding:8px 10px;border:1px solid rgba(255,255,255,.07);border-radius:8px;background:#080b12;color:var(--text-dim);text-align:left}
.demographic-options button strong{font-size:10.5px}
.demographic-options button span{font-size:8px;color:var(--text-faint)}
.demographic-options button.active{border-color:rgba(159,107,255,.65);background:rgba(159,107,255,.12);color:#f0e8ff;box-shadow:0 0 0 2px rgba(159,107,255,.05)}
@media(max-width:900px){.work-form-layout{grid-template-columns:155px minmax(0,1fr);gap:16px}.format-toggle-row{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.work-form-layout{grid-template-columns:1fr}.work-cover-panel{position:static;display:grid;grid-template-columns:130px minmax(0,1fr)}.cover-dropzone{grid-row:span 2}.form-grid{grid-template-columns:1fr}.format-toggle-row{grid-template-columns:repeat(2,minmax(0,1fr))}.demographic-options{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
