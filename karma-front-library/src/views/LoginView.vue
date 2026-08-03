<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowRight, BookOpen, Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-vue-next';
import logoMark from '../assets/brand/logo-mark.png';
import { useAuthStore } from '../stores/auth';
import { notifyError, notifySuccess } from '../services/notifications';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const mode = ref<'login' | 'register'>('login');
const displayName = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const error = ref('');

const title = computed(() => mode.value === 'login' ? 'Bienvenido de vuelta' : 'Crea tu perfil lector');

function switchMode(next: 'login' | 'register') {
  mode.value = next;
  error.value = '';
}

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    if (mode.value === 'login') await auth.login(email.value, password.value);
    else await auth.register(displayName.value, email.value, password.value);
    notifySuccess(mode.value === 'login' ? 'Bienvenido de vuelta' : 'Perfil lector creado', mode.value === 'login' ? 'Tu biblioteca está lista.' : 'Ya puedes comenzar a construir tu biblioteca.');
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect : '/';
    await router.replace(mode.value === 'login' ? '/profiles' : redirect);
  } catch (e: any) {
    error.value = e.message || 'No se pudo completar el acceso.';
    notifyError('No se pudo iniciar la sesión', error.value);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-story">
      <div class="login-brand">
        <img :src="logoMark" alt="Karma Library" />
        <div><strong>KARMA</strong><span>LIBRARY</span></div>
      </div>
      <div class="login-story-copy">
        <div class="login-kicker"><BookOpen /> Tu historia, organizada</div>
        <h1>Cada página deja una huella.</h1>
        <p>Reúne tus libros, mangas y cómics. Sigue tu progreso y construye un perfil tan único como tus lecturas.</p>
        <div class="login-quote">“Un lector vive mil vidas antes de morir.”<small>— George R. R. Martin</small></div>
      </div>
      <div class="login-orb orb-one"></div><div class="login-orb orb-two"></div>
    </section>

    <section class="login-panel">
      <div class="login-card">
        <div class="login-mobile-brand"><img :src="logoMark" alt="" /><b>KARMA LIBRARY</b></div>
        <span class="eyebrow">{{ mode === 'login' ? 'ACCESO DE LECTOR' : 'NUEVO LECTOR' }}</span>
        <h2>{{ title }}</h2>
        <p class="login-intro">{{ mode === 'login' ? 'Ingresa para continuar construyendo tu biblioteca.' : 'Empieza a registrar las historias que te acompañan.' }}</p>

        <form class="auth-form" @submit.prevent="submit">
          <label v-if="mode === 'register'">
            <span>Nombre visible</span>
            <div class="auth-input"><UserRound /><input v-model.trim="displayName" required minlength="2" maxlength="60" placeholder="¿Cómo quieres que te llamemos?" /></div>
          </label>
          <label>
            <span>Correo electrónico</span>
            <div class="auth-input"><Mail /><input v-model.trim="email" required type="email" autocomplete="email" placeholder="lector@correo.com" /></div>
          </label>
          <label>
            <span>Contraseña</span>
            <div class="auth-input"><LockKeyhole /><input v-model="password" required :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" minlength="8" placeholder="Mínimo 8 caracteres" />
              <button type="button" class="password-toggle" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="showPassword = !showPassword"><EyeOff v-if="showPassword" /><Eye v-else /></button>
            </div>
          </label>
          <div v-if="error" class="auth-error">{{ error }}</div>
          <button class="auth-submit" :disabled="loading"><span>{{ loading ? 'Procesando…' : mode === 'login' ? 'Entrar a mi biblioteca' : 'Crear mi cuenta' }}</span><ArrowRight v-if="!loading" /></button>
        </form>

        <p class="auth-switch">{{ mode === 'login' ? '¿Aún no tienes perfil?' : '¿Ya tienes una cuenta?' }}
          <button @click="switchMode(mode === 'login' ? 'register' : 'login')">{{ mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión' }}</button>
        </p>
      </div>
    </section>
  </main>
</template>
