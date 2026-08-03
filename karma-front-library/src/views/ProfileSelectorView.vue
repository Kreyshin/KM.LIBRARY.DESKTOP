<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Plus, Users } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import logoMark from '../assets/brand/logo-mark.png';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const loading = ref(true);
const adding = ref(false);
const name = ref('');
const color = ref('#9F6BFF');
const error = ref('');
const colors = ['#9F6BFF', '#22D3EE', '#34D399', '#F472B6', '#FBBF24', '#FB7185'];

onMounted(async () => {
  try { await auth.loadProfiles(); } catch (value: any) { error.value = value.message; } finally { loading.value = false; }
});
async function choose(id: string) {
  loading.value = true;
  try { await auth.switchProfile(id); await router.replace('/'); } catch (value: any) { error.value = value.message; loading.value = false; }
}
async function addProfile() {
  if (name.value.trim().length < 2) return;
  loading.value = true;
  try { await auth.createProfile(name.value, color.value); name.value = ''; adding.value = false; } catch (value: any) { error.value = value.message; } finally { loading.value = false; }
}
</script>

<template>
  <main class="profiles-page">
    <div class="profiles-brand"><img :src="logoMark" alt="" /><b>KARMA LIBRARY</b></div>
    <section>
      <Users class="profiles-icon" /><h1>¿Quién está leyendo?</h1><p>Elige un perfil para separar el progreso, las estanterías y las estadísticas.</p>
      <div v-if="error" class="profiles-error">{{ error }}</div>
      <div class="profile-grid">
        <button v-for="item in auth.profiles.value" :key="item.id" class="profile-choice" :disabled="loading" @click="choose(item.id)">
          <span class="profile-avatar-choice" :style="{ background: item.color || '#9F6BFF' }">{{ item.displayName.slice(0, 2).toUpperCase() }}</span>
          <strong>{{ item.displayName }}</strong><small v-if="item.isKids">Infantil</small>
        </button>
        <button class="profile-choice add-choice" @click="adding = true"><span><Plus /></span><strong>Agregar perfil</strong></button>
      </div>
    </section>
    <form v-if="adding" class="profile-create-card" @submit.prevent="addProfile">
      <h2>Nuevo perfil</h2><input v-model.trim="name" required minlength="2" maxlength="60" placeholder="Nombre del lector" />
      <div class="profile-colors"><button v-for="option in colors" :key="option" type="button" :class="{ selected: color === option }" :style="{ background: option }" @click="color = option"></button></div>
      <div><button type="button" @click="adding = false">Cancelar</button><button class="primary" :disabled="loading">Crear perfil</button></div>
    </form>
  </main>
</template>

<style scoped>
.profiles-page{min-height:100vh;background:#090b12;color:#fff;padding:32px;display:grid;place-items:center;text-align:center}.profiles-brand{position:absolute;left:32px;top:28px;display:flex;align-items:center;gap:10px;letter-spacing:.12em}.profiles-brand img{width:34px}.profiles-icon{width:42px;height:42px;color:#a78bfa}.profiles-page h1{font-size:clamp(2rem,5vw,4rem);margin:14px 0 8px}.profiles-page p{color:#9ca3af}.profile-grid{display:flex;flex-wrap:wrap;justify-content:center;gap:28px;margin-top:42px}.profile-choice{background:transparent;border:0;color:#d1d5db;display:grid;gap:12px;justify-items:center;cursor:pointer}.profile-choice:hover{color:#fff;transform:translateY(-4px)}.profile-avatar-choice,.add-choice span{width:128px;height:128px;border-radius:22px;display:grid;place-items:center;font-size:36px;font-weight:800;box-shadow:0 15px 45px #0008}.add-choice span{background:#181b25;color:#9ca3af}.profile-choice small{color:#9ca3af}.profile-create-card{position:fixed;inset:0;margin:auto;width:min(420px,90vw);height:max-content;background:#151824;border:1px solid #2b3041;border-radius:22px;padding:28px;box-shadow:0 30px 90px #000;display:grid;gap:20px}.profile-create-card input{background:#090b12;border:1px solid #363b4d;border-radius:10px;padding:14px;color:#fff}.profile-colors{display:flex;gap:12px;justify-content:center}.profile-colors button{width:34px;height:34px;border:3px solid transparent;border-radius:50%}.profile-colors .selected{border-color:#fff}.profile-create-card>div:last-child{display:flex;justify-content:flex-end;gap:12px}.profile-create-card>div:last-child button{padding:10px 16px;border-radius:9px;border:0}.primary{background:#8b5cf6;color:#fff}.profiles-error{color:#fda4af;margin-top:16px}
</style>
