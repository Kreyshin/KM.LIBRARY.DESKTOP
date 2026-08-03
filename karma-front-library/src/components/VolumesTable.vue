<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  ImagePlus,
  Info,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
} from 'lucide-vue-next';
import {
  api,
  VOLUME_OWNERSHIP,
  VOLUME_STATUSES,
  type Obra,
  type Volume,
  type VolumeOwnership,
  type VolumeStatus,
} from '../api/client';
import { confirmAction, notifyError, notifySuccess } from '../services/notifications';

const props = defineProps<{ obraId: string; obra: Obra; volumes: Volume[] }>();
const emit = defineEmits<{ (e: 'changed'): void }>();

const openVolumeModal = inject<(o: Obra, v: Volume) => void>('openVolumeModal');

type ViewMode = 'grid' | 'table';

const view = ref<ViewMode>('grid');
const fileInputs = ref<Record<number, HTMLInputElement | null>>({});
const spineFileInputs = ref<Record<number, HTMLInputElement | null>>({});
const busy = ref<number | null>(null);
const expanded = ref<Set<number>>(new Set());

const readCount = computed(() => props.volumes.filter((v) => v.read).length);

const STATUS_CLASS: Record<VolumeStatus, string> = {
  OWNED: 'is-owned',
  READING: 'is-reading',
  NOT_READ: 'is-not-read',
};

function statusClass(status: VolumeStatus) {
  return STATUS_CLASS[status] || 'is-not-read';
}

function isExpanded(number: number) {
  return expanded.value.has(number);
}

function toggleExpand(number: number) {
  const next = new Set(expanded.value);
  if (next.has(number)) next.delete(number);
  else next.add(number);
  expanded.value = next;
}

async function patchVolume(v: Volume, data: Partial<Volume>) {
  busy.value = v.number;
  try {
    await api.updateVolume(props.obraId, v.number, data);
    emit('changed');
  } catch (cause: unknown) {
    notifyError('No se pudo actualizar el tomo', cause instanceof Error ? cause.message : undefined);
  } finally {
    busy.value = null;
  }
}

function openPicker(number: number) {
  fileInputs.value[number]?.click();
}

async function onFileChosen(e: Event, number: number) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = number;
  try {
    await api.uploadVolumeCover(props.obraId, number, file);
    emit('changed');
    notifySuccess('Portada actualizada', `Se actualizó la portada del tomo ${number}.`);
  } catch (cause: unknown) {
    notifyError('No se pudo subir la portada', cause instanceof Error ? cause.message : undefined);
  } finally {
    busy.value = null;
    const input = fileInputs.value[number];
    if (input) input.value = '';
  }
}

function openSpinePicker(number: number) {
  spineFileInputs.value[number]?.click();
}

async function onSpineFileChosen(e: Event, number: number) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  busy.value = number;
  try {
    await api.uploadVolumeSpine(props.obraId, number, file);
    emit('changed');
    notifySuccess('Lomo actualizado', `Se actualizó el lomo del tomo ${number}.`);
  } catch (cause: unknown) {
    notifyError('No se pudo subir el lomo', cause instanceof Error ? cause.message : undefined);
  } finally {
    busy.value = null;
    const input = spineFileInputs.value[number];
    if (input) input.value = '';
  }
}

async function addVolume() {
  try {
    await api.addVolume(props.obraId);
    emit('changed');
    notifySuccess('Tomo agregado', 'Se creó inicialmente como “No adquirido”.');
  } catch (cause: unknown) {
    notifyError('No se pudo agregar el tomo', cause instanceof Error ? cause.message : undefined);
  }
}

async function removeVolume(number: number) {
  const confirmed = await confirmAction({
    title: `¿Eliminar el tomo ${number}?`,
    description: 'Sus portadas, lomo y datos de lectura se eliminarán permanentemente.',
    confirmLabel: 'Eliminar tomo',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await api.removeVolume(props.obraId, number);
    emit('changed');
    notifySuccess('Tomo eliminado');
  } catch (cause: unknown) {
    notifyError('No se pudo eliminar el tomo', cause instanceof Error ? cause.message : undefined);
  }
}

function toDateInput(v: string | null) {
  return v ? v.slice(0, 10) : '';
}

function displayCover(volume: Volume) {
  return volume.alternateCovers?.find((cover) => cover.isPrimary)?.path || volume.coverPath;
}
</script>

<template>
  <div class="vol-toolbar">
    <div class="vol-toolbar__stats">
      <strong>{{ volumes.length }}</strong> {{ volumes.length === 1 ? 'tomo' : 'tomos' }}
      <span class="vol-toolbar__dot">·</span>
      <strong>{{ readCount }}</strong> leídos
    </div>

    <div class="vol-view-toggle" role="tablist" aria-label="Vista de tomos">
      <button type="button" role="tab" :aria-selected="view === 'grid'" class="vol-view-toggle__btn" :class="{ active: view === 'grid' }" @click="view = 'grid'">
        <LayoutGrid /> Cuadrícula
      </button>
      <button type="button" role="tab" :aria-selected="view === 'table'" class="vol-view-toggle__btn" :class="{ active: view === 'table' }" @click="view = 'table'">
        <List /> Tabla
      </button>
    </div>
  </div>

  <!-- ============ VISTA CUADRÍCULA ============ -->
  <div v-if="view === 'grid'" class="vol-grid">
    <article v-for="v in volumes" :key="v.id" class="vol-card" :class="{ 'vol-card--busy': busy === v.number }">
      <div class="vol-card__book">
        <button type="button" class="vol-spine" @click="openSpinePicker(v.number)" title="Cambiar lomo">
          <img v-if="v.spinePath" :src="v.spinePath" alt="" />
          <span v-else class="vol-spine__fallback">Tomo {{ v.number }}</span>
          <span class="vol-thumb-hint vol-thumb-hint--spine"><Pencil /></span>
          <input
            :ref="el => spineFileInputs[v.number] = el as HTMLInputElement"
            type="file" accept="image/*" hidden
            @change="(e) => onSpineFileChosen(e, v.number)"
          />
        </button>

        <button type="button" class="vol-cover" @click="openPicker(v.number)" title="Cambiar portada">
          <img v-if="displayCover(v)" :src="displayCover(v)!" :alt="`Portada del tomo ${v.number}`" />
          <span v-else class="vol-cover__empty"><ImagePlus /> Portada</span>
          <span class="vol-thumb-hint"><Pencil /> Cambiar</span>
          <input
            :ref="el => fileInputs[v.number] = el as HTMLInputElement"
            type="file" accept="image/*" hidden
            @change="(e) => onFileChosen(e, v.number)"
          />
        </button>

        <button type="button" class="vol-card__delete" title="Eliminar tomo" @click="removeVolume(v.number)">
          <Trash2 />
        </button>
      </div>

      <div class="vol-card__body">
        <div class="vol-card__row">
          <div class="vol-card__title">
            <span class="vol-number">Tomo {{ v.number }}</span>
            <span class="vol-card__subtitle">{{ v.title || obra.titulo }}</span>
          </div>
          <div class="vol-card__row-actions">
            <button type="button" class="vol-info-btn" title="Ficha completa del tomo" @click="openVolumeModal?.(obra, v)"><Info /></button>
          </div>
        </div>

        <div class="vol-card__fields">
          <label class="vol-card__field">
            <span>Adquisición</span>
            <select
              class="vol-status-select vol-ownership-select"
              :class="{ 'is-not-owned': v.ownership === 'NOT_OWNED', 'is-acquired': v.ownership !== 'NOT_OWNED' }"
              :value="v.ownership"
              @change="patchVolume(v, { ownership: ($event.target as HTMLSelectElement).value as VolumeOwnership })"
            >
              <option v-for="option in VOLUME_OWNERSHIP" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>

          <label class="vol-card__field">
            <span>Estado de lectura</span>
            <select
              class="vol-status-select"
              :class="statusClass(v.status)"
              :value="v.status"
              @change="patchVolume(v, { status: ($event.target as HTMLSelectElement).value as VolumeStatus })"
            >
              <option v-for="s in VOLUME_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </label>

          <label class="vol-card__field">
            <span>Capítulos incluidos</span>
            <input
              class="vol-chapters-input"
              type="text"
              :value="v.chapters || ''"
              placeholder="Ej. capítulos 1 – 10"
              @change="patchVolume(v, { chapters: ($event.target as HTMLInputElement).value })"
            />
          </label>
        </div>

        <button type="button" class="vol-read-toggle" :class="{ on: v.read }" @click="patchVolume(v, { read: !v.read })">
          <span class="vol-read-toggle__check"><Check v-if="v.read" /></span>
          <span>{{ v.read ? 'Tomo marcado como leído' : 'Marcar este tomo como leído' }}</span>
        </button>

        <button type="button" class="vol-expand-toggle" @click="toggleExpand(v.number)">
          <span><ChevronDown :class="{ 'is-open': isExpanded(v.number) }" /> Fechas y notas</span>
          <small>{{ isExpanded(v.number) ? 'Ocultar' : 'Completar' }}</small>
        </button>

        <div v-if="isExpanded(v.number)" class="vol-card__details">
          <div class="vol-detail-field">
            <label>Inicio</label>
            <input type="date" :value="toDateInput(v.startDate)" @change="patchVolume(v, { startDate: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="vol-detail-field">
            <label>Fin</label>
            <input type="date" :value="toDateInput(v.finishDate)" @change="patchVolume(v, { finishDate: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="vol-detail-field vol-detail-field--full">
            <label>Notas</label>
            <textarea :value="v.notes || ''" placeholder="Sin notas" @change="patchVolume(v, { notes: ($event.target as HTMLTextAreaElement).value })" />
          </div>
        </div>
      </div>
    </article>

    <button type="button" class="vol-add-card" @click="addVolume">
      <Plus />
      <span>Agregar tomo</span>
    </button>
  </div>

  <!-- ============ VISTA TABLA ============ -->
  <div v-else class="vol-table-wrap">
    <table class="vol-table">
      <thead>
        <tr>
          <th class="vol-table__drag"></th>
          <th>#</th>
          <th>Portada</th>
          <th>Lomo</th>
          <th>Estado</th>
          <th>Capítulos</th>
          <th>Leído</th>
          <th>Inicio</th>
          <th>Fin</th>
          <th>Notas</th>
          <th class="vol-table__actions"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="v in volumes" :key="v.id" :class="{ 'vol-row--busy': busy === v.number }">
          <td class="vol-table__drag"><GripVertical class="vol-drag" /></td>
          <td class="vol-table__number">{{ v.number }}</td>

          <td class="vol-table__thumb-cell">
            <button type="button" class="vol-table__thumb" @click="openPicker(v.number)">
              <img v-if="displayCover(v)" :src="displayCover(v)!" :alt="`Portada del tomo ${v.number}`" />
              <span v-else class="vol-table__thumb-empty">{{ v.number }}</span>
              <span class="vol-thumb-hint"><Pencil /></span>
            </button>
            <input :ref="el => fileInputs[v.number] = el as HTMLInputElement" type="file" accept="image/*" hidden @change="(e) => onFileChosen(e, v.number)" />
          </td>

          <td class="vol-table__thumb-cell">
            <button type="button" class="vol-table__thumb vol-table__thumb--spine" @click="openSpinePicker(v.number)">
              <img v-if="v.spinePath" :src="v.spinePath" alt="" />
              <span v-else class="vol-table__thumb-empty">{{ v.number }}</span>
              <span class="vol-thumb-hint"><Pencil /></span>
            </button>
            <input :ref="el => spineFileInputs[v.number] = el as HTMLInputElement" type="file" accept="image/*" hidden @change="(e) => onSpineFileChosen(e, v.number)" />
          </td>

          <td>
            <select class="vol-status-select vol-status-select--table" :class="statusClass(v.status)" :value="v.status" @change="patchVolume(v, { status: ($event.target as HTMLSelectElement).value as VolumeStatus })">
              <option v-for="s in VOLUME_STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </td>

          <td><input class="vol-table__input" type="text" :value="v.chapters || ''" placeholder="1 – 10" @change="patchVolume(v, { chapters: ($event.target as HTMLInputElement).value })" /></td>

          <td class="vol-table__center">
            <button type="button" class="vol-read-toggle vol-read-toggle--sm" :class="{ on: v.read }" @click="patchVolume(v, { read: !v.read })">
              <Check v-if="v.read" />
            </button>
          </td>

          <td><input class="vol-table__input" type="date" :value="toDateInput(v.startDate)" @change="patchVolume(v, { startDate: ($event.target as HTMLInputElement).value })" /></td>
          <td><input class="vol-table__input" type="date" :value="toDateInput(v.finishDate)" @change="patchVolume(v, { finishDate: ($event.target as HTMLInputElement).value })" /></td>
          <td><input class="vol-table__input" type="text" :value="v.notes || ''" placeholder="—" @change="patchVolume(v, { notes: ($event.target as HTMLInputElement).value })" /></td>

          <td class="vol-table__actions">
            <button type="button" class="vol-info-btn vol-info-btn--table" title="Ficha completa del tomo" @click="openVolumeModal?.(obra, v)"><Info /></button>
            <button type="button" class="vol-del-btn" @click="removeVolume(v.number)"><Trash2 /></button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="add-volume-row" @click="addVolume"><Plus /> Agregar otro tomo</div>
  </div>
</template>

<style scoped>
.vol-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:16px; }
.vol-toolbar__stats { color:var(--text-dim); font-size:12.5px; }
.vol-toolbar__stats strong { color:var(--text); font-weight:700; }
.vol-toolbar__dot { margin:0 7px; color:var(--text-faint); }

.vol-view-toggle { display:inline-flex; gap:3px; padding:3px; background:#080b12; border:1px solid rgba(255,255,255,.075); border-radius:10px; }
.vol-view-toggle__btn { display:inline-flex; align-items:center; gap:6px; padding:7px 12px; color:var(--text-dim); background:transparent; border:0; border-radius:7px; font:600 11.5px inherit; cursor:pointer; transition:.15s; }
.vol-view-toggle__btn svg { width:14px; height:14px; }
.vol-view-toggle__btn:hover { color:var(--text); }
.vol-view-toggle__btn.active { color:#f5f1ff; background:linear-gradient(135deg,rgba(159,107,255,.22),rgba(124,58,237,.12)); box-shadow:0 0 0 1px rgba(159,107,255,.28), 0 4px 14px rgba(121,52,222,.18); }

/* ============ GRID ============ */
.vol-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; align-items:start; }

.vol-card { display:grid; grid-template-columns:minmax(178px,42%) minmax(0,1fr); background:linear-gradient(145deg,rgba(255,255,255,.014),transparent 40%),#0a0e16; border:1px solid rgba(255,255,255,.075); border-radius:14px; overflow:hidden; transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
.vol-card:hover { transform:translateY(-3px); border-color:rgba(159,107,255,.28); box-shadow:0 14px 32px rgba(0,0,0,.4), 0 0 0 1px rgba(159,107,255,.08); }
.vol-card--busy { opacity:.5; pointer-events:none; }

.vol-card__book { position:relative; display:flex; width:100%; aspect-ratio:5/7; align-self:start; background:#05070d; border-right:1px solid rgba(255,255,255,.07); }

.vol-spine { flex:0 0 22%; position:relative; padding:0; overflow:hidden; color:var(--text-faint); background:linear-gradient(180deg,#14101d,#0a0812); border:0; border-right:1px solid rgba(0,0,0,.5); cursor:pointer; box-shadow:inset -4px 0 8px rgba(0,0,0,.35); }
.vol-spine img { width:100%; height:100%; object-fit:contain; object-position:center; }
.vol-spine__fallback { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; writing-mode:vertical-rl; text-orientation:mixed; letter-spacing:.03em; color:var(--text-faint); font-size:10.5px; font-weight:700; }

.vol-cover { flex:1; position:relative; padding:0; overflow:hidden; color:var(--text-faint); background:#05070d; border:0; cursor:pointer; }
.vol-cover img { width:100%; height:100%; object-fit:contain; object-position:center; background:#05070d; }
.vol-cover__empty { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; font-size:10.5px; font-weight:600; }
.vol-cover__empty svg { width:20px; height:20px; color:var(--accent); }

.vol-thumb-hint { position:absolute; right:5px; bottom:5px; left:5px; display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 6px; color:#fff; background:rgba(4,6,13,.86); border:1px solid rgba(255,255,255,.1); border-radius:6px; font-size:9.5px; font-weight:650; opacity:0; transition:opacity .15s ease; pointer-events:none; }
.vol-thumb-hint svg { width:11px; height:11px; }
.vol-thumb-hint--spine { right:2px; left:2px; padding:4px; }
.vol-spine:hover .vol-thumb-hint,
.vol-cover:hover .vol-thumb-hint { opacity:1; }
.vol-spine:hover, .vol-cover:hover { filter:brightness(1.08); }

.vol-card__delete { position:absolute; top:6px; right:6px; z-index:2; width:24px; height:24px; display:flex; align-items:center; justify-content:center; color:#fca5a5; background:rgba(4,6,13,.72); border:1px solid rgba(255,255,255,.1); border-radius:7px; opacity:0; transition:opacity .15s ease, background .15s ease; cursor:pointer; }
.vol-card__delete svg { width:12px; height:12px; }
.vol-card:hover .vol-card__delete { opacity:1; }
.vol-card__delete:hover { background:rgba(248,113,113,.18); border-color:rgba(248,113,113,.35); }

.vol-card__body { min-width:0; display:flex; flex-direction:column; gap:14px; padding:17px 18px; }
.vol-card__row { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; padding-bottom:12px; border-bottom:1px solid rgba(255,255,255,.065); }
.vol-card__title { min-width:0; display:flex; flex-direction:column; gap:4px; }
.vol-card__subtitle { overflow:hidden; color:var(--text-faint); font-size:10.5px; line-height:1.35; text-overflow:ellipsis; white-space:nowrap; }
.vol-card__row-actions { display:flex; align-items:center; gap:6px; }
.vol-number { color:var(--text); font-size:15px; font-weight:750; }

.vol-info-btn { display:flex; align-items:center; justify-content:center; width:30px; height:30px; flex-shrink:0; color:var(--text-faint); background:#080b12; border:1px solid rgba(255,255,255,.08); border-radius:8px; cursor:pointer; transition:.15s; }
.vol-info-btn svg { width:14px; height:14px; }
.vol-info-btn:hover { color:var(--accent); border-color:rgba(159,107,255,.4); background:rgba(159,107,255,.08); }
.vol-info-btn--table { margin-right:4px; }

.vol-read-toggle { width:100%; min-height:38px; display:flex; align-items:center; gap:9px; padding:7px 10px; color:var(--text-dim); background:#080b12; border:1px solid rgba(255,255,255,.08); border-radius:8px; font:650 10.5px inherit; cursor:pointer; text-align:left; transition:.15s; }
.vol-read-toggle__check { width:18px; height:18px; display:grid; place-items:center; flex-shrink:0; border:1px solid rgba(255,255,255,.14); border-radius:5px; }
.vol-read-toggle svg { width:12px; height:12px; }
.vol-read-toggle.on { color:#0d1f18; background:var(--success); border-color:var(--success); }
.vol-read-toggle.on .vol-read-toggle__check { border-color:rgba(13,31,24,.28); background:rgba(13,31,24,.1); }
.vol-read-toggle--sm { padding:0; width:26px; height:26px; justify-content:center; border-radius:7px; }
.vol-read-toggle--sm svg { width:13px; height:13px; }

.vol-card__fields { display:flex; flex-direction:column; gap:12px; }
.vol-card__field { display:flex; flex-direction:column; gap:6px; }
.vol-card__field>span { color:var(--text-faint); font-size:9px; font-weight:750; letter-spacing:.055em; text-transform:uppercase; }
.vol-status-select { width:100%; height:38px; padding:0 10px; color:var(--text); background:#080b12; border:1px solid rgba(255,255,255,.08); border-radius:8px; font:600 11px inherit; outline:none; cursor:pointer; }
.vol-status-select.is-owned { color:var(--success); border-color:rgba(52,211,153,.35); }
.vol-status-select.is-reading { color:#d7c4ff; border-color:rgba(159,107,255,.4); box-shadow:0 0 0 1px rgba(159,107,255,.12); }
.vol-status-select.is-not-read { color:var(--text-faint); }
.vol-ownership-select.is-not-owned { color:#fbbf24; border-color:rgba(251,191,36,.3); }
.vol-ownership-select.is-acquired { color:var(--success); border-color:rgba(52,211,153,.35); }

.vol-chapters-input { width:100%; height:38px; padding:0 10px; color:var(--text); background:#080b12; border:1px solid rgba(255,255,255,.08); border-radius:8px; font:11px inherit; outline:none; }
.vol-chapters-input:focus, .vol-status-select:focus { border-color:rgba(159,107,255,.6); box-shadow:0 0 0 3px rgba(159,107,255,.08); }

.vol-expand-toggle { display:flex; align-items:center; justify-content:space-between; gap:8px; width:100%; margin-top:auto; padding:10px 0 0; color:var(--text-faint); background:transparent; border:0; border-top:1px solid rgba(255,255,255,.055); font:650 10px inherit; cursor:pointer; }
.vol-expand-toggle>span { display:flex; align-items:center; gap:6px; }.vol-expand-toggle small { color:#8f6ac9; font-size:9px; }
.vol-expand-toggle svg { width:13px; height:13px; transition:transform .15s ease; }
.vol-expand-toggle svg.is-open { transform:rotate(180deg); }
.vol-expand-toggle:hover { color:var(--text-dim); }

.vol-card__details { display:flex; flex-wrap:wrap; gap:8px; padding-top:6px; border-top:1px dashed rgba(255,255,255,.08); }
.vol-detail-field { display:flex; flex-direction:column; gap:3px; flex:1 1 70px; }
.vol-detail-field--full { flex-basis:100%; }
.vol-detail-field label { color:var(--text-faint); font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
.vol-detail-field input, .vol-detail-field textarea { width:100%; padding:6px 7px; color:var(--text); background:#080b12; border:1px solid rgba(255,255,255,.08); border-radius:6px; font:11px inherit; outline:none; }
.vol-detail-field textarea { min-height:52px; resize:vertical; }

.vol-add-card { min-height:290px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:var(--text-faint); background:rgba(255,255,255,.012); border:1px dashed rgba(159,107,255,.32); border-radius:14px; cursor:pointer; transition:.15s; }
.vol-add-card svg { width:28px; height:28px; color:var(--accent); }
.vol-add-card span { font-size:12px; font-weight:650; }
.vol-add-card:hover { border-color:var(--accent); color:var(--text); background:rgba(159,107,255,.05); }

/* ============ TABLA ============ */
.vol-table-wrap { border:1px solid rgba(255,255,255,.065); border-radius:12px; overflow:hidden; }
.vol-table { width:100%; border-collapse:collapse; background:#0a0e16; }
.vol-table thead th { position:sticky; top:0; z-index:1; padding:9px 10px; color:var(--text-faint); background:#080b12; border-bottom:1px solid rgba(255,255,255,.075); font-size:9.5px; font-weight:700; text-transform:uppercase; letter-spacing:.05em; text-align:left; white-space:nowrap; }
.vol-table__drag { width:34px; }
.vol-table__actions { width:60px; white-space:nowrap; }
.vol-table tbody tr { border-bottom:1px solid rgba(255,255,255,.045); transition:background .12s ease; }
.vol-table tbody tr:hover { background:rgba(159,107,255,.035); }
.vol-table tbody tr:last-child { border-bottom:0; }
.vol-table td { padding:7px 10px; vertical-align:middle; }
.vol-table__number { color:var(--text); font-size:12px; font-weight:700; }
.vol-table__center { text-align:center; }
.vol-drag { width:14px; height:14px; color:var(--text-faint); cursor:grab; }

.vol-table__thumb-cell { padding:6px 10px; }
.vol-table__thumb { position:relative; width:34px; height:48px; padding:0; overflow:hidden; color:var(--text-faint); background:#05070d; border:1px solid rgba(255,255,255,.08); border-radius:6px; cursor:pointer; }
.vol-table__thumb img { width:100%; height:100%; object-fit:contain; object-position:center; background:#05070d; }
.vol-table__thumb--spine { width:20px; }
.vol-table__thumb-empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700; }
.vol-table__thumb .vol-thumb-hint { right:1px; bottom:1px; left:1px; padding:2px; font-size:0; }
.vol-table__thumb .vol-thumb-hint svg { width:9px; height:9px; }
.vol-table__thumb:hover .vol-thumb-hint { opacity:1; }

.vol-status-select--table { height:28px; font-size:10.5px; }
.vol-table__input { width:100%; min-width:76px; height:28px; padding:0 8px; color:var(--text); background:#080b12; border:1px solid rgba(255,255,255,.08); border-radius:6px; font:11.5px inherit; outline:none; }
.vol-table__input:focus { border-color:rgba(159,107,255,.6); box-shadow:0 0 0 3px rgba(159,107,255,.08); }

.vol-del-btn { display:flex; align-items:center; justify-content:center; width:26px; height:26px; color:var(--text-faint); background:transparent; border:1px solid transparent; border-radius:7px; cursor:pointer; }
.vol-del-btn svg { width:13px; height:13px; }
.vol-del-btn:hover { color:#fca5a5; background:rgba(248,113,113,.08); border-color:rgba(248,113,113,.25); }
.vol-row--busy { opacity:.5; pointer-events:none; }

.add-volume-row { display:flex; align-items:center; justify-content:center; gap:7px; padding:11px; color:var(--text-faint); background:rgba(255,255,255,.012); border-top:1px dashed rgba(159,107,255,.22); font:650 11.5px inherit; cursor:pointer; transition:.15s; }
.add-volume-row svg { width:14px; height:14px; color:var(--accent); }
.add-volume-row:hover { color:var(--text); background:rgba(159,107,255,.05); }

@media (max-width:880px) {
  .vol-grid { grid-template-columns:1fr; }
}

@media (max-width:560px) {
  .vol-grid { gap:12px; }
  .vol-card { grid-template-columns:132px minmax(0,1fr); }
  .vol-card__body { gap:11px; padding:13px; }
  .vol-number { font-size:13px; }
  .vol-toolbar { flex-direction:column; align-items:flex-start; gap:10px; }
}

@media (max-width:410px) {
  .vol-card { grid-template-columns:1fr; }
  .vol-card__book { max-height:390px; border-right:0; border-bottom:1px solid rgba(255,255,255,.07); }
}
</style>
