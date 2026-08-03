<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { BookOpen, BookOpenCheck, Heart, Layers3, MapPin, Pencil, Star, Target } from 'lucide-vue-next';
import ProfileEditor from '../components/ProfileEditor.vue';
import ReaderStatCard from '../components/ReaderStatCard.vue';
import { useAuthStore } from '../stores/auth';
import { notifyError, notifySuccess } from '../services/notifications';

const auth = useAuthStore();
const editing = ref(false);
const loading = ref(!auth.profile.value);
const saving = ref(false);
const error = ref('');

onMounted(async () => {
  try { await auth.loadProfile(); } catch (e: any) { error.value = e.message; } finally { loading.value = false; }
});

const reader = computed(() => auth.profile.value?.reader);
const stats = computed(() => auth.profile.value?.stats);
const initials = computed(() => reader.value?.displayName.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'KL');
const memberSince = computed(() => reader.value ? new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric' }).format(new Date(reader.value.createdAt)) : '');
const goalProgress = computed(() => stats.value && reader.value ? Math.min(100, Math.round(stats.value.completedThisYear / reader.value.readingGoal * 100)) : 0);
const statCards = computed(() => stats.value ? [
  { label: 'Obras en biblioteca', value: stats.value.totalWorks, icon: BookOpen, tone: '#9F6BFF' },
  { label: 'Tomos registrados', value: stats.value.totalVolumes, icon: Layers3, tone: '#22D3EE' },
  { label: 'Tomos leídos', value: stats.value.readVolumes, icon: BookOpenCheck, tone: '#34D399' },
  { label: 'Obras favoritas', value: stats.value.favorites, icon: Heart, tone: '#F472B6' },
] : []);

async function saveProfile(value: any) {
  saving.value = true; error.value = '';
  try { await auth.updateProfile(value); editing.value = false; notifySuccess('Perfil actualizado', 'Tus preferencias de lector se guardaron.'); }
  catch (e: any) { error.value = e.message || 'No se pudo guardar el perfil.'; notifyError('No se pudo guardar el perfil', error.value); }
  finally { saving.value = false; }
}
</script>

<template>
  <div class="reader-profile-page">
    <div v-if="loading" class="profile-loading card">Cargando perfil del lector…</div>
    <template v-else-if="reader && stats">
      <section class="profile-hero card">
        <div class="profile-cover-pattern"></div>
        <div class="profile-avatar-wrap">
          <img v-if="reader.avatarUrl" :src="reader.avatarUrl" :alt="reader.displayName" class="profile-avatar" />
          <div v-else class="profile-avatar profile-avatar-fallback">{{ initials }}</div>
        </div>
        <div class="profile-identity">
          <span class="eyebrow">PERFIL DEL LECTOR</span>
          <h1>{{ reader.displayName }}</h1>
          <p v-if="reader.bio">{{ reader.bio }}</p><p v-else class="profile-empty-copy">Agrega una biografía para contar qué historias te apasionan.</p>
          <div class="profile-meta"><span v-if="reader.location"><MapPin />{{ reader.location }}</span><span><BookOpen />Lector desde {{ memberSince }}</span></div>
        </div>
        <button class="profile-edit-button" @click="editing = !editing"><Pencil />{{ editing ? 'Cerrar edición' : 'Editar perfil' }}</button>
      </section>

      <ProfileEditor v-if="editing" :reader="reader" :saving="saving" :error="error" @save="saveProfile" @cancel="editing = false" />

      <section class="reader-stats-grid"><ReaderStatCard v-for="card in statCards" :key="card.label" v-bind="card" /></section>

      <section class="profile-content-grid">
        <article class="card profile-detail-card goal-card">
          <div class="profile-card-head"><div><span class="eyebrow">META {{ new Date().getFullYear() }}</span><h3>Reto de lectura</h3></div><Target /></div>
          <div class="goal-number"><strong>{{ stats.completedThisYear }}</strong><span>/ {{ reader.readingGoal }} tomos</span></div>
          <div class="goal-track"><span :style="{ width: goalProgress + '%' }"></span></div>
          <p>{{ goalProgress }}% completado · {{ Math.max(0, reader.readingGoal - stats.completedThisYear) }} tomos para alcanzar tu meta</p>
        </article>

        <article class="card profile-detail-card">
          <div class="profile-card-head"><div><span class="eyebrow">TU BIBLIOTECA</span><h3>Panorama lector</h3></div><Star /></div>
          <div class="reading-overview">
            <div><strong>{{ stats.reading }}</strong><span>Leyendo ahora</span></div>
            <div><strong>{{ stats.completed }}</strong><span>Completadas</span></div>
            <div><strong>{{ stats.averageRating || '—' }}</strong><span>Valoración media</span></div>
          </div>
        </article>

        <article class="card profile-detail-card profile-genres-card">
          <div class="profile-card-head"><div><span class="eyebrow">PREFERENCIAS</span><h3>Géneros destacados</h3></div></div>
          <div v-if="stats.topGenres.length" class="genre-ranking"><div v-for="(genre, index) in stats.topGenres" :key="genre.name"><span class="genre-rank">0{{ index + 1 }}</span><b>{{ genre.name }}</b><span class="genre-bar"><i :style="{ width: `${genre.count / stats.topGenres[0].count * 100}%` }"></i></span><small>{{ genre.count }}</small></div></div>
          <div v-else class="profile-no-data">Añade géneros a tus obras para descubrir tus preferencias.</div>
          <div v-if="reader.favoriteGenres.length" class="favorite-genre-chips"><span v-for="genre in reader.favoriteGenres" :key="genre">{{ genre }}</span></div>
        </article>
      </section>
    </template>
    <div v-else class="error-banner">{{ error || 'No se pudo cargar el perfil.' }}</div>
  </div>
</template>
