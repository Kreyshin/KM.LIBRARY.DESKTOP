<script setup lang="ts">
import { provide, ref } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import Topbar from '../components/Topbar.vue';
import AddWorkModal from '../components/AddWorkModal.vue';
import VolumeModal from '../components/VolumeModal.vue';
import { useObrasStore } from '../stores/obras';

const router = useRouter();
const store = useObrasStore();
store.load();

const modalOpen = ref(false);

function openQuickAdd() {
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
}

// Expone la creación de obras a las vistas hijas vía provide/inject (ver obra existente = /obras/:id)
provide('openWorkModal', openQuickAdd);

const volumeModalOpen = ref(false);
const editingVolumeObra = ref<null | any>(null);
const editingVolume = ref<null | any>(null);

function openVolumeModal(obra: any, volume: any) {
  editingVolumeObra.value = obra;
  editingVolume.value = volume;
  volumeModalOpen.value = true;
}

function closeVolumeModal() {
  volumeModalOpen.value = false;
  editingVolumeObra.value = null;
  editingVolume.value = null;
}

function onVolumeUpdated(obra: any) {
  store.upsert(obra);
  editingVolumeObra.value = obra;
  editingVolume.value = obra.volumes.find((volume: any) => volume.number === editingVolume.value?.number) || null;
}

function openObraFromVolume() {
  const obra = editingVolumeObra.value;
  closeVolumeModal();
  if (obra) router.push({ name: 'obra', params: { id: obra.id } });
}

provide('openVolumeModal', openVolumeModal);
</script>

<template>
  <div class="shell">
    <Sidebar />
    <div class="main">
      <Topbar @quick-add="openQuickAdd" />
      <div class="content">
        <router-view />
      </div>
    </div>

    <AddWorkModal
      v-if="modalOpen"
      @close="closeModal"
      @created="closeModal"
    />

    <VolumeModal
      v-if="volumeModalOpen"
      :obra="editingVolumeObra"
      :volume="editingVolume"
      @close="closeVolumeModal"
      @deleted="closeVolumeModal"
      @updated="onVolumeUpdated"
      @open-obra="openObraFromVolume"
    />
  </div>
</template>
