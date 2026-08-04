<script setup lang="ts">
import { useRoute } from 'vue-router';
import {
  Home, LibraryBig, LayoutGrid, BookOpenCheck,
  BarChart3, Users, Settings, UserRound,
} from 'lucide-vue-next';
import logoMark from '../assets/brand/logo-mark.png';
import ReadingTimer from './ReadingTimer.vue';

const route = useRoute();

const items = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/library', label: 'Librero', icon: LibraryBig },
  { to: '/shelves', label: 'Estantería', icon: LayoutGrid },
  { to: '/reading-log', label: 'Registro de lectura', icon: BookOpenCheck },
  { to: '/statistics', label: 'Estadísticas', icon: BarChart3 },
  { to: '/authors', label: 'Autores', icon: Users },
  { to: '/profile', label: 'Mi perfil', icon: UserRound },
  { to: '/settings', label: 'Configuración', icon: Settings },
];
</script>

<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark-wrap">
        <img class="brand-mark" :src="logoMark" alt="Karma Corp Systems" />
      </div>
      <span class="brand-divider"></span>
      <div class="brand-text">
        <div class="name">KARMA</div>
        <div class="sub">CORP SYSTEMS</div>
      </div>
    </div>

    <nav class="nav">
      <RouterLink v-for="item in items" :key="item.to" :to="item.to" class="nav-item"
        :class="{ active: route.path === item.to }">
          <span v-if="route.path === item.to" class="nav-item-indicator"></span>
        <component :is="item.icon" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <div class="sidebar-footer">
      <ReadingTimer />
    </div>
  </aside>
</template>
