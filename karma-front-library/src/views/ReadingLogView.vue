<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { BookOpenCheck, CalendarDays, CheckCircle2, Clock3, Flame, Plus, RotateCcw, Trash2 } from 'lucide-vue-next';
import { api, type ReadingSession, type ReadingStats, type ReadingUnit } from '../api/client';
import { useObrasStore } from '../stores/obras';
import { confirmAction, notifyError, notifySuccess } from '../services/notifications';
import DatePicker from '../components/DatePicker.vue';

const store = useObrasStore();
const sessions = ref<ReadingSession[]>([]);
const stats = ref<ReadingStats | null>(null);
const loading = ref(true);
const saving = ref(false);
const showForm = ref(false);
const form = reactive({ obraId: '', volumeId: '', occurredAt: new Date().toISOString().slice(0, 10), minutes: 30, startProgress: 0, endProgress: 0, unit: 'CHAPTER' as ReadingUnit, rereadNumber: 1, completed: false, notes: '' });

const selectedObra = computed(() => store.obras.value.find((obra) => obra.id === form.obraId));
const maxActivity = computed(() => Math.max(1, ...(stats.value?.activity.map((item) => item.minutes) || [1])));
const unitLabels: Record<ReadingUnit, string> = { CHAPTER: 'capítulos', PAGE: 'páginas', PERCENT: '%' };

onMounted(async () => { await store.load(); await load(); });

async function load() {
  loading.value = true;
  try { [sessions.value, stats.value] = await Promise.all([api.listReadingSessions(), api.readingStats()]); }
  catch (cause: any) { notifyError('No se pudo cargar el registro', cause.message); }
  finally { loading.value = false; }
}

function chooseObra() { form.volumeId = ''; }

async function submit() {
  if (!form.obraId) return notifyError('Selecciona una obra');
  saving.value = true;
  try {
    await api.createReadingSession({ ...form, volumeId: form.volumeId || null, occurredAt: `${form.occurredAt}T12:00:00.000Z`, notes: form.notes || null } as any);
    notifySuccess('Lectura registrada', 'Tu actividad y racha fueron actualizadas.');
    Object.assign(form, { volumeId: '', minutes: 30, startProgress: form.endProgress, endProgress: form.endProgress, completed: false, notes: '' });
    showForm.value = false;
    await load();
  } catch (cause: any) { notifyError('No se pudo registrar la lectura', cause.message); }
  finally { saving.value = false; }
}

async function remove(session: ReadingSession) {
  const accepted = await confirmAction({ title: '¿Eliminar esta sesión?', description: `Se retirará del historial de “${session.obra.titulo}”.`, confirmLabel: 'Eliminar sesión', danger: true });
  if (!accepted) return;
  try { await api.removeReadingSession(session.id); notifySuccess('Sesión eliminada'); await load(); }
  catch (cause: any) { notifyError('No se pudo eliminar la sesión', cause.message); }
}

function sessionProgress(session: ReadingSession) {
  if (session.startProgress === null && session.endProgress === null) return 'Sin progreso numérico';
  return `${session.startProgress ?? 0} → ${session.endProgress ?? 0} ${unitLabels[session.unit]}`;
}
</script>

<template>
  <div class="reading-log-page">
    <header class="reading-log-header">
      <div><span class="reading-kicker">DIARIO PERSONAL</span><h1>Registro de lectura</h1><p>Captura cada sesión y convierte tu constancia en una historia visible.</p></div>
      <button class="reading-add-button" @click="showForm = !showForm"><Plus />Registrar lectura</button>
    </header>

    <section v-if="stats" class="reading-stats">
      <article><Flame /><div><strong>{{ stats.currentStreak }}</strong><span>días de racha</span></div><small>Récord: {{ stats.longestStreak }}</small></article>
      <article><Clock3 /><div><strong>{{ Math.floor(stats.totalMinutes / 60) }}h {{ stats.totalMinutes % 60 }}m</strong><span>tiempo total</span></div></article>
      <article><BookOpenCheck /><div><strong>{{ stats.chaptersRead }}</strong><span>capítulos avanzados</span></div></article>
      <article><CalendarDays /><div><strong>{{ stats.thisMonth }}</strong><span>sesiones este mes</span></div></article>
    </section>

    <form v-if="showForm" class="reading-session-form card" @submit.prevent="submit">
      <div class="reading-form-heading"><div><span>NUEVA ENTRADA</span><h2>¿Qué leíste hoy?</h2></div><button type="button" @click="showForm = false">Cerrar</button></div>
      <div class="reading-form-grid">
        <label><span>Obra</span><select v-model="form.obraId" required @change="chooseObra"><option value="">Seleccionar…</option><option v-for="obra in store.obras.value" :key="obra.id" :value="obra.id">{{ obra.titulo }}</option></select></label>
        <label><span>Tomo (opcional)</span><select v-model="form.volumeId"><option value="">Obra general</option><option v-for="volume in selectedObra?.volumes || []" :key="volume.id" :value="volume.id">Tomo {{ volume.number }}{{ volume.title ? ` · ${volume.title}` : '' }}</option></select></label>
        <label><span>Fecha</span><DatePicker v-model="form.occurredAt" required aria-label="Fecha de la sesión de lectura" /></label>
        <label><span>Duración (minutos)</span><input v-model.number="form.minutes" type="number" min="0" max="1440" /></label>
        <label><span>Unidad</span><select v-model="form.unit"><option value="CHAPTER">Capítulos</option><option value="PAGE">Páginas</option><option value="PERCENT">Porcentaje</option></select></label>
        <label><span>Progreso inicial</span><input v-model.number="form.startProgress" type="number" min="0" /></label>
        <label><span>Progreso final</span><input v-model.number="form.endProgress" type="number" min="0" /></label>
        <label><span>N.º de lectura</span><input v-model.number="form.rereadNumber" type="number" min="1" max="100" /></label>
        <label class="reading-form-notes"><span>Notas</span><textarea v-model="form.notes" maxlength="1000" placeholder="Una frase, una impresión, algo para recordar…"></textarea></label>
        <label class="reading-completed"><input v-model="form.completed" type="checkbox" /><CheckCircle2 />Marcar tomo como terminado</label>
      </div>
      <div class="reading-form-actions"><button type="button" @click="showForm = false">Cancelar</button><button :disabled="saving">{{ saving ? 'Guardando…' : 'Guardar sesión' }}</button></div>
    </form>

    <section v-if="stats" class="reading-activity card">
      <div class="reading-section-head"><div><span>ÚLTIMOS 14 DÍAS</span><h2>Ritmo de lectura</h2></div><strong>{{ stats.pagesRead }} páginas</strong></div>
      <div class="activity-bars"><div v-for="day in stats.activity" :key="day.date" class="activity-day"><span :style="{ height: `${Math.max(day.minutes ? 8 : 2, day.minutes / maxActivity * 100)}%` }" :title="`${day.minutes} minutos`"></span><small>{{ new Date(`${day.date}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'narrow' }) }}</small></div></div>
    </section>

    <section class="reading-history">
      <div class="reading-section-head"><div><span>HISTORIAL</span><h2>Sesiones recientes</h2></div><strong>{{ sessions.length }} registros</strong></div>
      <div v-if="loading" class="reading-empty">Cargando sesiones…</div>
      <div v-else-if="!sessions.length" class="reading-empty"><BookOpenCheck /><h3>Tu diario está esperando</h3><p>Registra tu primera lectura para comenzar a construir estadísticas y rachas.</p></div>
      <article v-for="session in sessions" :key="session.id" class="reading-session-card card">
        <div class="reading-session-date"><strong>{{ new Date(session.occurredAt).getDate() }}</strong><span>{{ new Date(session.occurredAt).toLocaleDateString('es-PE', { month: 'short' }) }}</span></div>
        <div class="reading-session-cover"><img v-if="session.volume?.alternateCovers.find(c => c.isPrimary)?.thumbnailPath || session.volume?.coverPath || session.obra.coverPath" :src="session.volume?.alternateCovers.find(c => c.isPrimary)?.thumbnailPath || session.volume?.coverPath || session.obra.coverPath || ''" alt="" /><BookOpenCheck v-else /></div>
        <div class="reading-session-info"><span>{{ session.volume ? `Tomo ${session.volume.number}` : 'Lectura general' }}</span><h3>{{ session.obra.titulo }}</h3><p>{{ sessionProgress(session) }}</p><small v-if="session.notes">“{{ session.notes }}”</small></div>
        <div class="reading-session-metrics"><span><Clock3 />{{ session.minutes }} min</span><span v-if="session.rereadNumber > 1"><RotateCcw />Relectura {{ session.rereadNumber }}</span><span v-if="session.completed" class="completed"><CheckCircle2 />Finalizado</span></div>
        <button class="reading-session-delete" title="Eliminar sesión" @click="remove(session)"><Trash2 /></button>
      </article>
    </section>
  </div>
</template>

<style scoped>
.reading-log-page{max-width:1240px;margin:0 auto}.reading-log-header{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;margin-bottom:22px}.reading-kicker,.reading-section-head span,.reading-form-heading span{color:var(--accent);font-size:9px;font-weight:850;letter-spacing:.13em}.reading-log-header h1{margin:7px 0 5px;font-size:28px}.reading-log-header p{margin:0;color:var(--text-dim)}.reading-add-button{height:40px;display:flex;align-items:center;gap:7px;padding:0 16px;color:#fff;background:var(--accent-gradient);border:0;border-radius:9px;font-weight:750;cursor:pointer;box-shadow:var(--glow-accent)}.reading-add-button svg{width:15px}.reading-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.reading-stats article{min-height:94px;display:flex;align-items:center;gap:12px;padding:16px;background:#0a0e16;border:1px solid var(--border);border-radius:12px}.reading-stats svg{width:22px;color:#b783ff}.reading-stats strong,.reading-stats span{display:block}.reading-stats strong{font-size:20px}.reading-stats span,.reading-stats small{color:var(--text-faint);font-size:9.5px}.reading-stats small{margin-left:auto}.reading-session-form{margin-bottom:18px;padding:22px;border-color:rgba(159,107,255,.25)}.reading-form-heading,.reading-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.reading-form-heading h2,.reading-section-head h2{margin:4px 0 0;font-size:16px}.reading-form-heading button{color:var(--text-dim);background:none;border:0;cursor:pointer}.reading-form-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.reading-form-grid label>span{display:block;margin-bottom:6px;color:var(--text-dim);font-size:10px;font-weight:700}.reading-form-grid input,.reading-form-grid select,.reading-form-grid textarea{width:100%;height:38px;padding:0 10px;color:var(--text);background:#070a11;border:1px solid var(--border);border-radius:8px;outline:none}.reading-form-grid textarea{height:74px;padding:9px;resize:vertical}.reading-form-notes{grid-column:1/-1}.reading-completed{grid-column:1/-1;display:flex;align-items:center;gap:8px;color:var(--text-dim);font-size:11px}.reading-completed input{width:16px;height:16px;accent-color:var(--accent)}.reading-completed svg{width:15px}.reading-form-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.reading-form-actions button{height:37px;padding:0 14px;color:var(--text);background:#10141e;border:1px solid var(--border);border-radius:8px;cursor:pointer}.reading-form-actions button:last-child{color:#fff;background:var(--accent-gradient);border:0}.reading-activity{padding:20px;margin-bottom:24px}.reading-section-head strong{color:var(--text-dim);font-size:11px}.activity-bars{height:145px;display:flex;align-items:flex-end;gap:8px;padding-top:10px}.activity-day{height:100%;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:7px}.activity-day>span{width:min(24px,75%);min-height:2px;border-radius:5px 5px 2px 2px;background:linear-gradient(180deg,#bd93ff,#7137d4);box-shadow:0 0 13px rgba(159,107,255,.2)}.activity-day small{color:var(--text-faint);font-size:8px}.reading-session-card{display:grid;grid-template-columns:45px 46px minmax(0,1fr) auto 30px;align-items:center;gap:13px;margin-bottom:9px;padding:11px 13px}.reading-session-date{text-align:center}.reading-session-date strong,.reading-session-date span{display:block}.reading-session-date strong{font-size:18px}.reading-session-date span{color:var(--text-faint);font-size:8px;text-transform:uppercase}.reading-session-cover{width:42px;height:58px;display:grid;place-items:center;overflow:hidden;color:var(--text-faint);background:#070a11;border-radius:6px}.reading-session-cover img{width:100%;height:100%;object-fit:contain}.reading-session-cover svg{width:17px}.reading-session-info>span{color:var(--accent);font-size:8px;font-weight:800}.reading-session-info h3{margin:2px 0;font-size:12.5px}.reading-session-info p{margin:0;color:var(--text-dim);font-size:10px}.reading-session-info small{display:block;margin-top:5px;color:var(--text-faint);font-style:italic}.reading-session-metrics{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.reading-session-metrics span{display:flex;align-items:center;gap:4px;padding:5px 7px;color:var(--text-dim);background:#080b12;border:1px solid var(--border);border-radius:6px;font-size:8.5px}.reading-session-metrics svg{width:11px}.reading-session-metrics .completed{color:var(--success)}.reading-session-delete{display:grid;place-items:center;width:28px;height:28px;color:var(--text-faint);background:none;border:0;border-radius:7px;cursor:pointer}.reading-session-delete:hover{color:#fca5a5;background:rgba(248,113,113,.08)}.reading-session-delete svg{width:13px}.reading-empty{padding:45px;text-align:center;color:var(--text-faint);border:1px dashed var(--border);border-radius:12px}.reading-empty svg{width:28px}.reading-empty h3{color:var(--text);margin:10px 0 5px}.reading-empty p{margin:0}@media(max-width:900px){.reading-stats{grid-template-columns:1fr 1fr}.reading-form-grid{grid-template-columns:1fr 1fr}.reading-session-card{grid-template-columns:40px 42px 1fr 28px}.reading-session-metrics{grid-column:2/-1;justify-content:flex-start}}@media(max-width:600px){.reading-log-header{align-items:flex-start;flex-direction:column}.reading-stats,.reading-form-grid{grid-template-columns:1fr}.reading-session-cover{display:none}.reading-session-card{grid-template-columns:38px 1fr 28px}.reading-session-metrics{grid-column:2/-1}.reading-stats article{min-height:74px}}
</style>
