import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { title: 'Iniciar sesión', public: true } },
  { path: '/profiles', name: 'profiles', component: () => import('../views/ProfileSelectorView.vue'), meta: { title: 'Elegir perfil', standalone: true } },
  { path: '/', name: 'home', component: () => import('../views/HomeView.vue'), meta: { title: 'Inicio' } },
  { path: '/library', name: 'library', component: () => import('../views/LibraryView.vue'), meta: { title: 'Librero' } },
  { path: '/shelves', name: 'shelves', component: () => import('../views/ShelvesView.vue'), meta: { title: 'Estantería' } },
  { path: '/discover', name: 'discover', component: () => import('../views/ComingSoonView.vue'), meta: { title: 'Descubrir' } },
  { path: '/reading-log', name: 'reading-log', component: () => import('../views/ReadingLogView.vue'), meta: { title: 'Registro de lectura' } },
  { path: '/statistics', name: 'statistics', component: () => import('../views/StatisticsView.vue'), meta: { title: 'Estadísticas' } },
  { path: '/authors', name: 'authors', component: () => import('../views/ComingSoonView.vue'), meta: { title: 'Autores' } },
  { path: '/tags', name: 'tags', component: () => import('../views/ComingSoonView.vue'), meta: { title: 'Etiquetas' } },
  { path: '/favorites', name: 'favorites', component: () => import('../views/LibraryView.vue'), meta: { title: 'Favoritos' } },
  { path: '/settings', name: 'settings', component: () => import('../views/SettingsView.vue'), meta: { title: 'Configuración' } },
  { path: '/profile', name: 'profile', component: () => import('../views/ReaderProfileView.vue'), meta: { title: 'Perfil del lector' } },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authenticated = Boolean(localStorage.getItem('karma_reader_token'));
  if (!to.meta.public && !authenticated) return { name: 'login', query: { redirect: to.fullPath } };
  if (to.name === 'login' && authenticated) return { name: 'home' };
  document.title = `${String(to.meta.title || 'Karma Library')} · Karma Library`;
  return true;
});
