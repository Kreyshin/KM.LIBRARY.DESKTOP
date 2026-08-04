<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Check, Pause, Play, RotateCcw, TimerReset } from 'lucide-vue-next';
import { notifyInfo, notifySuccess } from '../services/notifications';

const STORAGE_KEY = 'karma_reading_timer_v1';
const presets = [25, 45, 60];
const selectedMinutes = ref(25);
const remainingSeconds = ref(25 * 60);
const running = ref(false);
const endsAt = ref<number | null>(null);
const sessionStartedAt = ref<number | null>(null);
let interval: ReturnType<typeof setInterval> | null = null;

const formattedTime = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60).toString().padStart(2, '0');
  const seconds = (remainingSeconds.value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});
const progress = computed(() => Math.max(0, Math.min(100, 100 - (remainingSeconds.value / (selectedMinutes.value * 60)) * 100)));
const status = computed(() => running.value ? 'Sesión en curso' : remainingSeconds.value === 0 ? 'Sesión completada' : 'Listo para leer');

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    selectedMinutes: selectedMinutes.value,
    remainingSeconds: remainingSeconds.value,
    running: running.value,
    endsAt: endsAt.value,
    sessionStartedAt: sessionStartedAt.value,
  }));
}

function tick() {
  if (!running.value || !endsAt.value) return;
  remainingSeconds.value = Math.max(0, Math.ceil((endsAt.value - Date.now()) / 1000));
  if (remainingSeconds.value === 0) completeSession();
  else persist();
}

function startOrPause() {
  if (remainingSeconds.value === 0) resetTimer();
  if (running.value) {
    tick();
    running.value = false;
    endsAt.value = null;
  } else {
    sessionStartedAt.value ||= Date.now();
    running.value = true;
    endsAt.value = Date.now() + remainingSeconds.value * 1000;
  }
  persist();
}

function selectPreset(minutes: number) {
  if (running.value) return;
  selectedMinutes.value = minutes;
  remainingSeconds.value = minutes * 60;
  sessionStartedAt.value = null;
  persist();
}

function resetTimer() {
  running.value = false;
  endsAt.value = null;
  sessionStartedAt.value = null;
  remainingSeconds.value = selectedMinutes.value * 60;
  persist();
}

function finishEarly() {
  if (!sessionStartedAt.value) return;
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - sessionStartedAt.value) / 60000));
  running.value = false;
  endsAt.value = null;
  remainingSeconds.value = 0;
  persist();
  notifyInfo('Lectura finalizada', `Registraste aproximadamente ${elapsedMinutes} min de concentración.`);
}

function completeSession() {
  running.value = false;
  endsAt.value = null;
  remainingSeconds.value = 0;
  persist();
  notifySuccess('Sesión de lectura completada', `Cumpliste tu bloque de ${selectedMinutes.value} minutos.`);
}

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (presets.includes(saved.selectedMinutes)) selectedMinutes.value = saved.selectedMinutes;
    remainingSeconds.value = Number.isFinite(saved.remainingSeconds) ? Math.max(0, saved.remainingSeconds) : selectedMinutes.value * 60;
    running.value = Boolean(saved.running && saved.endsAt);
    endsAt.value = running.value ? saved.endsAt : null;
    sessionStartedAt.value = saved.sessionStartedAt || null;
    if (running.value) tick();
  } catch { resetTimer(); }
  interval = setInterval(tick, 1000);
});

onBeforeUnmount(() => { if (interval) clearInterval(interval); });
</script>

<template>
  <section class="reading-timer" :class="{ 'reading-timer--running': running, 'reading-timer--done': remainingSeconds === 0 }">
    <header>
      <span><TimerReset /> Enfoque lector</span>
      <small>{{ status }}</small>
    </header>

    <div class="reading-timer__clock" :style="{ '--timer-progress': `${progress * 3.6}deg` }">
      <div><strong>{{ formattedTime }}</strong><span>min</span></div>
    </div>

    <div class="reading-timer__presets" aria-label="Duración de lectura">
      <button v-for="minutes in presets" :key="minutes" type="button" :class="{ active: selectedMinutes === minutes }" :disabled="running" @click="selectPreset(minutes)">{{ minutes }}</button>
    </div>

    <div class="reading-timer__actions">
      <button type="button" class="reading-timer__main" @click="startOrPause"><Pause v-if="running" /><Play v-else />{{ running ? 'Pausar' : remainingSeconds === 0 ? 'Reiniciar' : 'Iniciar' }}</button>
      <button type="button" title="Reiniciar temporizador" aria-label="Reiniciar temporizador" @click="resetTimer"><RotateCcw /></button>
      <button v-if="sessionStartedAt && remainingSeconds > 0" type="button" title="Finalizar lectura" aria-label="Finalizar lectura" @click="finishEarly"><Check /></button>
    </div>
  </section>
</template>

<style scoped>
.reading-timer{position:relative;overflow:hidden;padding:13px;background:radial-gradient(circle at 50% 38%,rgba(159,107,255,.1),transparent 55%),#090c13;border:1px solid rgba(159,107,255,.18);border-radius:14px;box-shadow:0 15px 35px rgba(0,0,0,.22)}.reading-timer:before{content:"";position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(192,132,252,.75),transparent)}.reading-timer header{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}.reading-timer header>span{display:flex;align-items:center;gap:5px;color:#d8c6f7;font-size:9px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.reading-timer header svg{width:12px}.reading-timer header small{color:var(--text-faint);font-size:7.5px}.reading-timer__clock{width:92px;height:92px;display:grid;place-items:center;margin:10px auto 8px;border-radius:50%;background:conic-gradient(#a855f7 var(--timer-progress),rgba(255,255,255,.055) 0);box-shadow:0 0 30px rgba(124,58,237,.13);transition:background .35s ease}.reading-timer__clock:before{content:"";grid-area:1/1;width:80px;height:80px;background:radial-gradient(circle,#151020,#080b12 70%);border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}.reading-timer__clock>div{z-index:1;grid-area:1/1;text-align:center}.reading-timer__clock strong{display:block;font-size:21px;font-variant-numeric:tabular-nums;letter-spacing:.035em}.reading-timer__clock span{color:var(--text-faint);font-size:7px;text-transform:uppercase}.reading-timer--running .reading-timer__clock{box-shadow:0 0 34px rgba(124,58,237,.25);animation:timer-breathe 2.6s ease-in-out infinite}.reading-timer--done .reading-timer__clock{background:conic-gradient(#34d399 360deg,#34d399 0)}@keyframes timer-breathe{50%{transform:scale(1.025)}}.reading-timer__presets{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.reading-timer__presets button{height:23px;color:var(--text-faint);background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.055);border-radius:6px;font-size:8px;cursor:pointer}.reading-timer__presets button.active{color:#e8dbff;background:rgba(159,107,255,.12);border-color:rgba(159,107,255,.35)}.reading-timer__presets button:disabled{cursor:not-allowed;opacity:.55}.reading-timer__actions{display:flex;gap:5px;margin-top:7px}.reading-timer__actions button{height:29px;display:flex;align-items:center;justify-content:center;gap:5px;padding:0 8px;color:#bdb5cb;background:#0e1119;border:1px solid rgba(255,255,255,.07);border-radius:7px;font:750 8px inherit;cursor:pointer;transition:.18s ease}.reading-timer__actions button:hover{color:#fff;border-color:rgba(159,107,255,.35);transform:translateY(-1px)}.reading-timer__actions svg{width:11px}.reading-timer__actions .reading-timer__main{flex:1;color:#fff;background:linear-gradient(135deg,#9f6bff,#6d28d9);border-color:rgba(216,180,254,.25);box-shadow:0 7px 18px rgba(109,40,217,.2)}
</style>
