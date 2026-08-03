<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { Reader } from '../api/client';

const props = defineProps<{ reader: Reader; saving: boolean; error?: string }>();
const emit = defineEmits<{ (e: 'save', value: any): void; (e: 'cancel'): void }>();
const form = reactive({ displayName: '', bio: '', location: '', avatarUrl: '', readingGoal: 12, genres: '' });

watch(() => props.reader, (reader) => Object.assign(form, {
  displayName: reader.displayName,
  bio: reader.bio || '',
  location: reader.location || '',
  avatarUrl: reader.avatarUrl || '',
  readingGoal: reader.readingGoal,
  genres: reader.favoriteGenres.join(', '),
}), { immediate: true });

function submit() {
  emit('save', {
    displayName: form.displayName,
    bio: form.bio,
    location: form.location,
    avatarUrl: form.avatarUrl,
    readingGoal: Number(form.readingGoal),
    favoriteGenres: form.genres.split(',').map((genre) => genre.trim()).filter(Boolean),
  });
}
</script>

<template>
  <form class="profile-editor card" @submit.prevent="submit">
    <div class="profile-card-head"><div><h3>Editar perfil</h3><p>Personaliza cómo apareces en Karma Library.</p></div></div>
    <div class="profile-form-grid">
      <label><span>Nombre visible</span><input v-model.trim="form.displayName" required minlength="2" maxlength="60" /></label>
      <label><span>Ubicación</span><input v-model.trim="form.location" maxlength="80" placeholder="Lima, Perú" /></label>
      <label class="full"><span>Biografía</span><textarea v-model="form.bio" maxlength="280" rows="4" placeholder="Cuéntanos qué historias disfrutas…"></textarea><small>{{ form.bio.length }}/280</small></label>
      <label class="full"><span>URL del avatar</span><input v-model.trim="form.avatarUrl" type="url" placeholder="https://…" /></label>
      <label><span>Meta anual de tomos</span><input v-model.number="form.readingGoal" type="number" min="1" max="1000" /></label>
      <label><span>Géneros favoritos</span><input v-model="form.genres" placeholder="Fantasía, Misterio, Seinen" /></label>
    </div>
    <div v-if="error" class="auth-error">{{ error }}</div>
    <div class="profile-editor-actions"><button type="button" class="btn btn-secondary" @click="emit('cancel')">Cancelar</button><button class="btn btn-primary" :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar cambios' }}</button></div>
  </form>
</template>
