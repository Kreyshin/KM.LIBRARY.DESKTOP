<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Check, LibraryBig, Plus, Settings2, Sparkles, Trash2, X } from 'lucide-vue-next';
import { api, type Obra, type Shelf, type ShelvesResponse } from '../api/client';
import { confirmAction, notifyError, notifySuccess } from '../services/notifications';

const props = defineProps<{ obras: Obra[] }>();
const emit = defineEmits<{
  (event: 'filter', payload: { id: string; name: string; obraIds: string[] | null; smartType: string | null }): void;
}>();

const shelves = ref<ShelvesResponse>({ custom: [], smart: [] });
const activeId = ref('all');
const loading = ref(true);
const modalMode = ref<'create' | 'manage' | null>(null);
const busy = ref(false);
const draft = ref({ name: '', description: '', color: '#8b5cf6' });

const allTabs = computed(() => [...shelves.value.custom, ...shelves.value.smart]);
const activeShelf = computed(() => allTabs.value.find((shelf) => shelf.id === activeId.value) || null);
const selectedIds = computed(() => new Set(activeShelf.value?.items.map((item) => item.obraId) || []));

async function load() {
  loading.value = true;
  try { shelves.value = await api.listShelves(); }
  catch (cause) { notifyError('No se pudieron cargar las estanterías', message(cause)); }
  finally { loading.value = false; }
}

function selectShelf(shelf: Shelf | null) {
  activeId.value = shelf?.id || 'all';
  emit('filter', { id: activeId.value, name: shelf?.name || 'Toda la biblioteca', obraIds: shelf ? shelf.items.map((item) => item.obraId) : null, smartType: shelf?.smartType || null });
}

function openCreate() {
  draft.value = { name: '', description: '', color: '#8b5cf6' };
  modalMode.value = 'create';
}

async function createShelf() {
  if (!draft.value.name.trim()) return;
  busy.value = true;
  try {
    const shelf = await api.createShelf({ name: draft.value.name.trim(), description: draft.value.description.trim() || undefined, color: draft.value.color });
    shelves.value.custom.push(shelf);
    modalMode.value = null;
    selectShelf(shelf);
    notifySuccess('Estantería creada', 'Ya aparece como una pestaña de tu biblioteca.');
  } catch (cause) { notifyError('No se pudo crear la estantería', message(cause)); }
  finally { busy.value = false; }
}

async function toggleObra(obra: Obra) {
  const shelf = activeShelf.value;
  if (!shelf || shelf.smartType || busy.value) return;
  busy.value = true;
  try {
    const updated = selectedIds.value.has(obra.id)
      ? await api.removeShelfItem(shelf.id, obra.id)
      : await api.addShelfItem(shelf.id, obra.id);
    replaceShelf(updated);
    selectShelf(updated);
  } catch (cause) { notifyError('No se pudo actualizar la estantería', message(cause)); }
  finally { busy.value = false; }
}

async function deleteShelf() {
  const shelf = activeShelf.value;
  if (!shelf || shelf.smartType) return;
  if (!(await confirmAction({ title: `¿Eliminar “${shelf.name}”?`, description: 'Las obras seguirán en tu biblioteca.', confirmLabel: 'Eliminar estantería', danger: true }))) return;
  try {
    await api.removeShelf(shelf.id);
    shelves.value.custom = shelves.value.custom.filter((item) => item.id !== shelf.id);
    modalMode.value = null;
    selectShelf(null);
    notifySuccess('Estantería eliminada');
  } catch (cause) { notifyError('No se pudo eliminar', message(cause)); }
}

function replaceShelf(updated: Shelf) {
  const index = shelves.value.custom.findIndex((shelf) => shelf.id === updated.id);
  if (index >= 0) shelves.value.custom[index] = updated;
}

function message(cause: unknown) { return cause instanceof Error ? cause.message : undefined; }

onMounted(load);
</script>

<template>
  <section class="shelf-tabs-shell" aria-label="Estanterías de la biblioteca">
    <div class="shelf-tabs-scroll">
      <button class="shelf-tab" :class="{ active: activeId === 'all' }" type="button" @click="selectShelf(null)"><LibraryBig /><span>Toda la biblioteca</span></button>
      <button v-for="shelf in shelves.custom" :key="shelf.id" class="shelf-tab" :class="{ active: activeId === shelf.id }" :style="{ '--tab-color': shelf.color }" type="button" @click="selectShelf(shelf)"><i /><span>{{ shelf.name }}</span><b>{{ shelf.items.length }}</b></button>
      <span v-if="shelves.custom.length && shelves.smart.length" class="tab-divider" />
      <button v-for="shelf in shelves.smart" :key="shelf.id" class="shelf-tab shelf-tab--smart" :class="{ active: activeId === shelf.id }" type="button" @click="selectShelf(shelf)"><Sparkles /><span>{{ shelf.name }}</span><b>{{ shelf.items.length }}</b></button>
    </div>
    <div class="shelf-tab-actions">
      <button v-if="activeShelf && !activeShelf.smartType" type="button" class="manage-shelf" @click="modalMode = 'manage'"><Settings2 /> Organizar</button>
      <button type="button" class="new-shelf" @click="openCreate"><Plus /> Nueva</button>
    </div>
  </section>

  <Teleport to="body">
    <div v-if="modalMode" class="shelf-modal-overlay" @click.self="modalMode = null">
      <section class="shelf-modal" role="dialog" aria-modal="true">
        <header><div><span>{{ modalMode === 'create' ? 'NUEVA ESTANTERÍA' : 'ORGANIZAR' }}</span><h2>{{ modalMode === 'create' ? 'Crea un rincón de tu biblioteca' : activeShelf?.name }}</h2><p>{{ modalMode === 'create' ? 'Aparecerá como una pestaña para llegar a tus obras en un clic.' : 'Elige qué obras viven en este estante.' }}</p></div><button type="button" aria-label="Cerrar" @click="modalMode = null"><X /></button></header>

        <form v-if="modalMode === 'create'" class="create-shelf-form" @submit.prevent="createShelf">
          <label><span>Nombre</span><input v-model="draft.name" required maxlength="80" autofocus placeholder="Ej. Favoritos, pendientes, prestar…" /></label>
          <label><span>Descripción <em>opcional</em></span><textarea v-model="draft.description" maxlength="240" rows="3" placeholder="¿Qué reúne esta estantería?" /></label>
          <label class="color-field"><span>Color de identificación</span><input v-model="draft.color" type="color" /><b :style="{ color: draft.color }">{{ draft.name || 'Mi estantería' }}</b></label>
          <footer><button type="button" class="secondary" @click="modalMode = null">Cancelar</button><button type="submit" class="primary" :disabled="busy || !draft.name.trim()"><Plus /> Crear estantería</button></footer>
        </form>

        <div v-else class="manage-shelf-list">
          <button v-for="obra in props.obras" :key="obra.id" type="button" :class="{ selected: selectedIds.has(obra.id) }" @click="toggleObra(obra)">
            <span class="manage-cover"><img v-if="obra.coverPath" :src="obra.coverPath" :alt="obra.titulo" /><LibraryBig v-else /></span>
            <span><strong>{{ obra.titulo }}</strong><small>{{ obra.autor || 'Autor no registrado' }} · {{ obra.volumes.length }} tomos</small></span>
            <i><Check /></i>
          </button>
          <footer><button type="button" class="danger" @click="deleteShelf"><Trash2 /> Eliminar estantería</button><button type="button" class="primary" @click="modalMode = null">Listo</button></footer>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.shelf-tabs-shell{position:sticky;top:66px;z-index:20;display:flex;align-items:center;gap:12px;margin:20px 0;padding:10px;border:1px solid #292438;border-radius:15px;background:rgba(10,9,16,.94);box-shadow:0 12px 35px #0007;backdrop-filter:blur(16px)}.shelf-tabs-scroll{display:flex;align-items:center;gap:6px;min-width:0;overflow-x:auto;scrollbar-width:none}.shelf-tabs-scroll::-webkit-scrollbar{display:none}.shelf-tab{--tab-color:#9f6bff;display:flex;flex:0 0 auto;align-items:center;gap:7px;height:38px;padding:0 12px;border:1px solid transparent;border-radius:9px;background:transparent;color:#817c91;font-size:12px;font-weight:650}.shelf-tab:hover{background:#17131f;color:#d6cfe3}.shelf-tab.active{border-color:color-mix(in srgb,var(--tab-color) 35%,transparent);background:color-mix(in srgb,var(--tab-color) 13%,#0d0b12);color:#f2edfa;box-shadow:inset 0 -2px var(--tab-color)}.shelf-tab svg{width:15px}.shelf-tab i{width:7px;height:7px;border-radius:50%;background:var(--tab-color);box-shadow:0 0 8px var(--tab-color)}.shelf-tab b{padding:2px 6px;border-radius:12px;background:#ffffff0c;color:#a9a1b8;font-size:9px}.shelf-tab--smart{--tab-color:#c084fc}.tab-divider{width:1px;height:24px;background:#2b2636}.shelf-tab-actions{display:flex;gap:7px;margin-left:auto}.new-shelf,.manage-shelf{display:flex;align-items:center;gap:6px;height:38px;padding:0 12px;border-radius:9px;font-weight:700;white-space:nowrap}.new-shelf{border:1px solid #8050dd;background:#7841dc;color:#fff}.manage-shelf{border:1px solid #302a3e;background:#15121c;color:#b5aec2}.new-shelf svg,.manage-shelf svg{width:15px}.shelf-modal-overlay{position:fixed;inset:0;z-index:2500;display:grid;place-items:center;padding:20px;background:#030307c9;backdrop-filter:blur(12px)}.shelf-modal{width:min(620px,100%);max-height:min(760px,90vh);overflow:hidden;border:1px solid #393047;border-radius:20px;background:#0d0c13;box-shadow:0 32px 100px #000}.shelf-modal>header{display:flex;justify-content:space-between;padding:23px 25px;border-bottom:1px solid #24202e;background:linear-gradient(120deg,#171122,#0d0c13)}.shelf-modal header span{color:#a875ff;font-size:9px;font-weight:800;letter-spacing:.16em}.shelf-modal h2{margin:5px 0 3px;font-size:21px}.shelf-modal header p{margin:0;color:#858092;font-size:12px}.shelf-modal header button{align-self:flex-start;border:0;background:none;color:#938c9f}.shelf-modal header svg{width:18px}.create-shelf-form{display:grid;gap:17px;padding:24px}.create-shelf-form label{display:grid;gap:7px}.create-shelf-form label>span{color:#a9a2b5;font-size:11px;font-weight:700}.create-shelf-form em{color:#625d6c;font-style:normal;font-weight:400}.create-shelf-form input[type=text],.create-shelf-form textarea{padding:11px 12px;border:1px solid #302a3b;border-radius:9px;background:#08070c;color:#eee;outline:none}.create-shelf-form input:focus,.create-shelf-form textarea:focus{border-color:#8b5cf6;box-shadow:0 0 0 3px #8b5cf612}.color-field{grid-template-columns:auto 42px 1fr;align-items:center}.color-field>span{grid-column:1/-1}.color-field input{width:40px;height:36px;padding:2px;border:1px solid #302a3b;border-radius:8px;background:#08070c}.color-field b{font-size:13px}.create-shelf-form footer,.manage-shelf-list footer{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}.primary,.secondary,.danger{display:flex;align-items:center;gap:7px;padding:10px 15px;border-radius:9px;font-weight:700}.primary{border:1px solid #8050dd;background:#7841dc;color:#fff}.secondary{border:1px solid #302b39;background:#131019;color:#aaa}.danger{margin-right:auto;border:1px solid #4b2530;background:#241016;color:#fb8b9e}.primary svg,.danger svg{width:15px}.manage-shelf-list{max-height:590px;overflow:auto;padding:16px}.manage-shelf-list>button{display:grid;grid-template-columns:42px 1fr 28px;align-items:center;gap:11px;width:100%;padding:8px;border:1px solid transparent;border-radius:10px;background:transparent;color:#ddd;text-align:left}.manage-shelf-list>button:hover{background:#15121b}.manage-shelf-list>button.selected{border-color:#4d376e;background:#181123}.manage-cover{display:grid;place-items:center;width:38px;height:48px;overflow:hidden;border-radius:5px;background:#211b2b}.manage-cover img{width:100%;height:100%;object-fit:cover}.manage-cover svg{width:16px;color:#71677d}.manage-shelf-list strong,.manage-shelf-list small{display:block}.manage-shelf-list strong{font-size:12px}.manage-shelf-list small{margin-top:3px;color:#777181;font-size:10px}.manage-shelf-list>button i{display:grid;place-items:center;width:22px;height:22px;border:1px solid #393342;border-radius:50%;color:transparent}.manage-shelf-list>button.selected i{border-color:#8b5cf6;background:#7c3fe0;color:#fff}.manage-shelf-list i svg{width:13px}.manage-shelf-list footer{position:sticky;bottom:-16px;padding:14px 4px 2px;background:#0d0c13}@media(max-width:760px){.shelf-tabs-shell{top:58px}.shelf-tab-actions .manage-shelf{width:38px;padding:0;justify-content:center;font-size:0}.shelf-tab-actions{flex:0 0 auto}.shelf-tab-actions .new-shelf{font-size:0}.shelf-tab-actions .new-shelf svg{margin:0}.shelf-modal{max-height:94vh}}
</style>
