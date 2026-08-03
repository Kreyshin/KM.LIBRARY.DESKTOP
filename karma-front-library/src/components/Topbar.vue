<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Search, Plus, Bell, User, Users, LogOut, ChevronDown } from 'lucide-vue-next';
import { useAuthStore } from '../stores/auth';
import { notifyInfo } from '../services/notifications';

const emit = defineEmits<{ (e: 'quick-add'): void }>();
const router = useRouter();
const auth = useAuthStore();
const query = ref('');
const menuOpen = ref(false);
const initials = computed(() => auth.reader.value?.displayName.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'KL');

function onSearch() {
  if (!query.value.trim()) return;
  router.push({ path: '/library', query: { q: query.value.trim() } });
}

async function signOut() {
  await auth.logout();
  notifyInfo('Sesión cerrada', 'Hasta tu próxima lectura.');
  router.replace('/login');
}
</script>

<template>
  <header class="topbar">
    <div class="search-box">
      <Search />
      <input v-model="query" type="text" placeholder="Buscar obras, autores, etiquetas…" @keyup.enter="onSearch" />
      <span class="kbd">⌘K</span>
    </div>
    <div class="topbar-right">
      <button class="btn-quickadd" @click="emit('quick-add')"><Plus /> Agregar rápido</button>
      <div class="icon-btn"><Bell /></div>
      <div class="user-menu-wrap">
        <button class="user-chip" @click="menuOpen = !menuOpen">
          <div class="avatar"><img v-if="auth.reader.value?.avatarUrl" :src="auth.reader.value.avatarUrl" alt="" /><span v-else>{{ initials }}</span></div>
          <div class="user-meta"><div class="u-name">{{ auth.reader.value?.displayName || 'Mi cuenta' }}</div><div class="u-sub">Lector</div></div>
          <ChevronDown class="user-chevron" />
        </button>
        <div v-if="menuOpen" class="user-dropdown">
          <button @click="router.push('/profile'); menuOpen = false"><User />Ver mi perfil</button>
          <button @click="router.push('/profiles'); menuOpen = false"><Users />Cambiar perfil</button>
          <button class="logout-item" @click="signOut"><LogOut />Cerrar sesión</button>
        </div>
      </div>
    </div>
  </header>
</template>
