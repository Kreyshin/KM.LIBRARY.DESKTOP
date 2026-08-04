<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, Pause, Play, RotateCcw, TimerReset } from 'lucide-vue-next';
import { api } from '../api/client';
import { useObrasStore } from '../stores/obras';
import { notifyError, notifyInfo, notifySuccess } from '../services/notifications';
import PurpleSelect from './PurpleSelect.vue';

const STORAGE_KEY = 'karma_reading_timer_v2';
const store = useObrasStore();
const presets = [25, 45, 60];
const selectedMinutes = ref(25);
const remainingSeconds = ref(25 * 60);
const running = ref(false);
const endsAt = ref<number | null>(null);
const sessionStartedAt = ref<number | null>(null);
const selectedObraId = ref('');
const selectedVolumeId = ref('');
const registering = ref(false);
const pendingRegistration = ref(false);
const registered = ref(false);
const recordedMinutes = ref(0);
let interval: ReturnType<typeof setInterval> | null = null;

const selectedObra = computed(() => store.obras.value.find((obra) => obra.id === selectedObraId.value));
const obraOptions = computed(() => [...store.obras.value]
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'))
  .map((obra) => ({ value: obra.id, label: obra.titulo, description: obra.autor || undefined })));
const volumeOptions = computed(() => (selectedObra.value?.volumes || [])
  .slice().sort((a, b) => a.number - b.number)
  .map((volume) => ({ value: volume.id, label: `Tomo ${volume.number}`, description: volume.title || undefined })));
const targetLocked = computed(() => running.value || Boolean(sessionStartedAt.value));
const elapsedSeconds = computed(() => Math.max(0, selectedMinutes.value * 60 - remainingSeconds.value));
const formattedTime = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60).toString().padStart(2, '0');
  const seconds = (remainingSeconds.value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
});
const progress = computed(() => Math.max(0, Math.min(100, 100 - (remainingSeconds.value / (selectedMinutes.value * 60)) * 100)));
const status = computed(() => registering.value ? 'Guardando lectura…' : registered.value ? 'Lectura registrada' : running.value ? 'Sesión en curso' : remainingSeconds.value === 0 ? 'Sesión completada' : 'Listo para leer');

watch(selectedObraId, () => {
  if (!volumeOptions.value.some((option) => option.value === selectedVolumeId.value)) selectedVolumeId.value = '';
  persist();
});
watch(selectedVolumeId, persist);

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    selectedMinutes: selectedMinutes.value,
    remainingSeconds: remainingSeconds.value,
    running: running.value,
    endsAt: endsAt.value,
    sessionStartedAt: sessionStartedAt.value,
    selectedObraId: selectedObraId.value,
    selectedVolumeId: selectedVolumeId.value,
    pendingRegistration: pendingRegistration.value,
    registered: registered.value,
    recordedMinutes: recordedMinutes.value,
  }));
}

function tick() {
  if (!running.value || !endsAt.value) return;
  remainingSeconds.value = Math.max(0, Math.ceil((endsAt.value - Date.now()) / 1000));
  if (remainingSeconds.value === 0) void completeSession();
  else persist();
}

function startOrPause() {
  if (!selectedObraId.value) {
    notifyInfo('Elige tu lectura', 'Selecciona una obra y, si corresponde, el tomo antes de iniciar.');
    return;
  }
  if (remainingSeconds.value === 0) resetTimer();
  if (running.value) {
    tick();
    running.value = false;
    endsAt.value = null;
  } else {
    sessionStartedAt.value ||= Date.now();
    registered.value = false;
    running.value = true;
    endsAt.value = Date.now() + remainingSeconds.value * 1000;
  }
  persist();
}

function selectPreset(minutes: number) {
  if (targetLocked.value) return;
  selectedMinutes.value = minutes;
  remainingSeconds.value = minutes * 60;
  registered.value = false;
  persist();
}

function resetTimer() {
  running.value = false;
  endsAt.value = null;
  sessionStartedAt.value = null;
  remainingSeconds.value = selectedMinutes.value * 60;
  pendingRegistration.value = false;
  registered.value = false;
  recordedMinutes.value = 0;
  persist();
}

async function registerSession() {
  if (!selectedObraId.value || !sessionStartedAt.value || registering.value || registered.value) return;
  registering.value = true;
  pendingRegistration.value = true;
  persist();
  const minutes = recordedMinutes.value || Math.max(1, Math.round(elapsedSeconds.value / 60));
  const progressValue = selectedObra.value?.currentChapter || 0;
  try {
    await api.createReadingSession({
      obraId: selectedObraId.value,
      ...(selectedVolumeId.value ? { volumeId: selectedVolumeId.value } : {}),
      occurredAt: new Date().toISOString(),
      minutes,
      startProgress: progressValue,
      endProgress: progressValue,
      unit: 'CHAPTER',
      rereadNumber: 1,
      completed: false,
      notes: `Sesión de ${minutes} min registrada desde el temporizador.`,
    } as any);
    pendingRegistration.value = false;
    registered.value = true;
    window.dispatchEvent(new CustomEvent('karma:reading-session-created'));
    notifySuccess('Lectura registrada', `${selectedObra.value?.titulo || 'Tu lectura'} · ${minutes} min.`);
  } catch (cause: any) {
    notifyError('No se pudo guardar la lectura', `${cause.message || 'Error desconocido'}. Puedes reintentarlo desde el temporizador.`);
  } finally {
    registering.value = false;
    persist();
  }
}

async function finishEarly() {
  if (!sessionStartedAt.value) return;
  if (running.value) tick();
  if (remainingSeconds.value === 0) return;
  recordedMinutes.value = Math.max(1, Math.round(elapsedSeconds.value / 60));
  running.value = false;
  endsAt.value = null;
  remainingSeconds.value = 0;
  persist();
  await registerSession();
}

async function completeSession() {
  if (!running.value && remainingSeconds.value === 0) return;
  running.value = false;
  endsAt.value = null;
  remainingSeconds.value = 0;
  recordedMinutes.value = selectedMinutes.value;
  persist();
  await registerSession();
}

onMounted(async () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (presets.includes(saved.selectedMinutes)) selectedMinutes.value = saved.selectedMinutes;
    remainingSeconds.value = Number.isFinite(saved.remainingSeconds) ? Math.max(0, saved.remainingSeconds) : selectedMinutes.value * 60;
    running.value = Boolean(saved.running && saved.endsAt);
    endsAt.value = running.value ? saved.endsAt : null;
    sessionStartedAt.value = saved.sessionStartedAt || null;
    selectedObraId.value = saved.selectedObraId || '';
    selectedVolumeId.value = saved.selectedVolumeId || '';
    pendingRegistration.value = Boolean(saved.pendingRegistration);
    registered.value = Boolean(saved.registered);
    recordedMinutes.value = Number.isFinite(saved.recordedMinutes) ? Math.max(0, saved.recordedMinutes) : 0;
    if (running.value) tick();
  } catch { resetTimer(); }
  await store.load();
  if (selectedObraId.value && !selectedObra.value) {
    selectedObraId.value = '';
    selectedVolumeId.value = '';
    resetTimer();
  } else if (selectedVolumeId.value && !volumeOptions.value.some((option) => option.value === selectedVolumeId.value)) {
    selectedVolumeId.value = '';
    persist();
  }
  interval = setInterval(tick, 1000);
});

onBeforeUnmount(() => { if (interval) clearInterval(interval); });
</script>

<template>
  <section class="reading-timer" :class="{ 'reading-timer--running': running, 'reading-timer--done': remainingSeconds === 0 }">
    <header><span><TimerReset /> Enfoque lector</span><small>{{ status }}</small></header>

    <div class="reading-timer__target">
      <PurpleSelect v-model="selectedObraId" :options="obraOptions" placeholder="¿Qué vas a leer?" aria-label="Obra para la sesión" searchable compact clearable :disabled="targetLocked" />
      <PurpleSelect v-if="selectedObraId && volumeOptions.length" v-model="selectedVolumeId" :options="volumeOptions" placeholder="Obra general" aria-label="Tomo para la sesión" compact clearable :disabled="targetLocked" />
    </div>

    <div class="reading-timer__clock" :style="{ '--timer-progress': `${progress * 3.6}deg` }"><div><strong>{{ formattedTime }}</strong><span>min</span></div></div>

    <div class="reading-timer__presets" aria-label="Duración de lectura">
      <button v-for="minutes in presets" :key="minutes" type="button" :class="{ active: selectedMinutes === minutes }" :disabled="targetLocked" @click="selectPreset(minutes)">{{ minutes }}</button>
    </div>

    <div class="reading-timer__actions">
      <button type="button" class="reading-timer__main" :disabled="registering" @click="startOrPause"><Pause v-if="running" /><Play v-else />{{ running ? 'Pausar' : remainingSeconds === 0 ? 'Reiniciar' : 'Iniciar' }}</button>
      <button type="button" title="Reiniciar temporizador" aria-label="Reiniciar temporizador" :disabled="registering" @click="resetTimer"><RotateCcw /></button>
      <button v-if="sessionStartedAt && remainingSeconds > 0" type="button" title="Finalizar y registrar lectura" aria-label="Finalizar y registrar lectura" :disabled="registering" @click="finishEarly"><Check /></button>
    </div>
    <button v-if="pendingRegistration && !registered && remainingSeconds === 0" type="button" class="reading-timer__retry" :disabled="registering" @click="registerSession">{{ registering ? 'Guardando…' : 'Reintentar registro' }}</button>
  </section>
</template>

<style scoped>
.reading-timer{position:relative;overflow:hidden;padding:12px;background:radial-gradient(circle at 50% 45%,rgba(159,107,255,.1),transparent 58%),#090c13;border:1px solid rgba(159,107,255,.18);border-radius:14px;box-shadow:0 15px 35px rgba(0,0,0,.22)}.reading-timer:before{content:"";position:absolute;inset:0 0 auto;height:1px;background:linear-gradient(90deg,transparent,rgba(192,132,252,.75),transparent)}.reading-timer header{display:flex;align-items:flex-start;justify-content:space-between;gap:6px}.reading-timer header>span{display:flex;align-items:center;gap:5px;color:#d8c6f7;font-size:9px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}.reading-timer header svg{width:12px}.reading-timer header small{max-width:82px;color:var(--text-faint);font-size:7px;text-align:right}.reading-timer__target{display:grid;gap:5px;margin-top:9px}.reading-timer__clock{width:80px;height:80px;display:grid;place-items:center;margin:8px auto 7px;border-radius:50%;background:conic-gradient(#a855f7 var(--timer-progress),rgba(255,255,255,.055) 0);box-shadow:0 0 30px rgba(124,58,237,.13);transition:background .35s ease}.reading-timer__clock:before{content:"";grid-area:1/1;width:69px;height:69px;background:radial-gradient(circle,#151020,#080b12 70%);border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)}.reading-timer__clock>div{z-index:1;grid-area:1/1;text-align:center}.reading-timer__clock strong{display:block;font-size:18px;font-variant-numeric:tabular-nums;letter-spacing:.035em}.reading-timer__clock span{color:var(--text-faint);font-size:7px;text-transform:uppercase}.reading-timer--running .reading-timer__clock{box-shadow:0 0 34px rgba(124,58,237,.25);animation:timer-breathe 2.6s ease-in-out infinite}.reading-timer--done .reading-timer__clock{background:conic-gradient(#34d399 360deg,#34d399 0)}@keyframes timer-breathe{50%{transform:scale(1.025)}}.reading-timer__presets{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.reading-timer__presets button{height:22px;color:var(--text-faint);background:rgba(255,255,255,.018);border:1px solid rgba(255,255,255,.055);border-radius:6px;font-size:8px;cursor:pointer}.reading-timer__presets button.active{color:#e8dbff;background:rgba(159,107,255,.12);border-color:rgba(159,107,255,.35)}.reading-timer__presets button:disabled{cursor:not-allowed;opacity:.55}.reading-timer__actions{display:flex;gap:5px;margin-top:6px}.reading-timer__actions button{height:28px;display:flex;align-items:center;justify-content:center;gap:5px;padding:0 8px;color:#bdb5cb;background:#0e1119;border:1px solid rgba(255,255,255,.07);border-radius:7px;font:750 8px inherit;cursor:pointer;transition:.18s ease}.reading-timer__actions button:hover:not(:disabled){color:#fff;border-color:rgba(159,107,255,.35);transform:translateY(-1px)}.reading-timer__actions button:disabled{opacity:.55}.reading-timer__actions svg{width:11px}.reading-timer__actions .reading-timer__main{flex:1;color:#fff;background:linear-gradient(135deg,#9f6bff,#6d28d9);border-color:rgba(216,180,254,.25);box-shadow:0 7px 18px rgba(109,40,217,.2)}.reading-timer__retry{width:100%;margin-top:6px;padding:6px;color:#f0e7ff;background:rgba(159,107,255,.1);border:1px solid rgba(159,107,255,.27);border-radius:7px;font:750 8px inherit;cursor:pointer}
</style>
