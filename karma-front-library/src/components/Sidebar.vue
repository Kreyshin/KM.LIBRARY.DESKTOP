<script setup lang="ts">
import { useRoute } from 'vue-router';
import {
  Home, LibraryBig, LayoutGrid, Compass, BookOpenCheck,
  BarChart3, Users, Tag, Heart, Settings, UserRound,
} from 'lucide-vue-next';
import logoMark from '../assets/brand/logo-mark.png';

const route = useRoute();

const items = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/library', label: 'Librero', icon: LibraryBig },
  { to: '/shelves', label: 'Estantería', icon: LayoutGrid },
  { to: '/discover', label: 'Descubrir', icon: Compass },
  { to: '/reading-log', label: 'Registro de lectura', icon: BookOpenCheck },
  { to: '/statistics', label: 'Estadísticas', icon: BarChart3 },
  { to: '/authors', label: 'Autores', icon: Users },
  { to: '/tags', label: 'Etiquetas', icon: Tag },
  { to: '/favorites', label: 'Favoritos', icon: Heart },
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
      <div class="placeholder-card">
        Niveles, logros y rachas de lectura — próximamente en Karma Library.
      </div>
      <div class="sidebar-art"><img  alt="" /></div>
    </div>
  </aside>
</template>
