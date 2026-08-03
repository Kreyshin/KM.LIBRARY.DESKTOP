<script setup lang="ts">
import { provide, ref } from 'vue';
import Sidebar from '../components/Sidebar.vue';
import Topbar from '../components/Topbar.vue';
import AddWorkModal from '../components/AddWorkModal.vue';
import VolumeModal from '../components/VolumeModal.vue';
import { useObrasStore } from '../stores/obras';

const store = useObrasStore();
store.load();

const modalOpen = ref(false);
const editingObra = ref<null | any>(null); // null = modo creación

function openQuickAdd() {
  editingObra.value = null;
  modalOpen.value = true;
}

function openEdit(obra: any) {
  editingObra.value = obra;
  modalOpen.value = true;
}

function closeModal() {
  modalOpen.value = false;
  editingObra.value = null;
}

// Expone openEdit a las vistas hijas vía provide/inject
provide('openWorkModal', openEdit);

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

function openObraFromVolume() {
  const obra = editingVolumeObra.value;
  closeVolumeModal();
  if (obra) openEdit(obra);
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
      :obra="editingObra"
      @close="closeModal"
      @created="closeModal"
      @deleted="closeModal"
    />

    <VolumeModal
      v-if="volumeModalOpen"
      :obra="editingVolumeObra"
      :volume="editingVolume"
      @close="closeVolumeModal"
      @deleted="closeVolumeModal"
      @open-obra="openObraFromVolume"
    />
  </div>
</template>
