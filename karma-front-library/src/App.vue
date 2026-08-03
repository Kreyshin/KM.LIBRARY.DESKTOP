<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppShell from './layouts/AppShell.vue';
import { useAuthStore } from './stores/auth';
import { Toaster } from 'vue-sonner';
import 'vue-sonner/style.css';
import ConfirmDialog from './components/ConfirmDialog.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

onMounted(async () => {
  await auth.bootstrap();
  if (!auth.authenticated.value && route.name !== 'login') {
    router.replace({ name: 'login', query: { redirect: route.fullPath } });
  }
});
</script>

<template>
  <div v-if="!auth.ready.value" class="app-loading"><span></span><p>Preparando tu biblioteca…</p></div>
  <router-view v-else-if="route.meta.public || route.meta.standalone" />
  <AppShell v-else />
  <ConfirmDialog />
  <Toaster
    theme="dark"
    position="top-right"
    :visible-toasts="5"
    :duration="4200"
    close-button
    container-aria-label="Notificaciones de Karma Library"
  />
</template>
