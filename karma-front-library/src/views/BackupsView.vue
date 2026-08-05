<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, RefreshCw, ShieldCheck, Trash2, Upload, XCircle } from 'lucide-vue-next';
import { api, type BackupItem, type BackupSettings, type BackupVerifyResult } from '../api/client';
import { notifyError, notifySuccess } from '../services/notifications';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

type RestoreStage = 'restoring' | 'waiting' | 'ready' | 'error';
const restoreOverlay = ref<{ stage: RestoreStage; message: string } | null>(null);

const INTERVAL_OPTIONS = [
  { value: 6, label: 'Cada 6 horas' },
  { value: 12, label: 'Cada 12 horas' },
  { value: 24, label: 'Cada día' },
  { value: 48, label: 'Cada 2 días' },
  { value: 168, label: 'Cada semana' },
];

const loading = ref(true);
const busy = ref(false);
const savingSettings = ref(false);
const items = ref<BackupItem[]>([]);
const settings = ref<BackupSettings>({ autoEnabled: false, intervalHours: 24, retention: 10, lastRunAt: null });
const restoreInput = ref<HTMLInputElement>();
const verifyResults = ref<Record<string, BackupVerifyResult | 'pending'>>({});
const pendingAction = ref<string>('');

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) { value /= 1024; unit = units[index]; }
  return `${value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} ${unit}`;
}

function formatDate(value: string | null) {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
}

async function refresh() {
  loading.value = true;
  try {
    const response = await api.listBackups();
    items.value = response.items;
    settings.value = response.settings;
  } catch (error: any) {
    notifyError('No se pudo cargar la lista de respaldos', error.message);
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);

async function createBackup() {
  busy.value = true;
  try {
    await api.createBackup();
    notifySuccess('Respaldo creado', 'Ya aparece en la lista y puedes descargarlo.');
    await refresh();
  } catch (error: any) {
    notifyError('No se pudo crear el respaldo', error.message);
  } finally {
    busy.value = false;
  }
}

async function saveSettings() {
  savingSettings.value = true;
  try {
    settings.value = await api.updateBackupSettings({
      autoEnabled: settings.value.autoEnabled,
      intervalHours: settings.value.intervalHours,
      retention: settings.value.retention,
    });
    notifySuccess('Preferencias guardadas', 'El respaldo automático usará esta configuración.');
  } catch (error: any) {
    notifyError('No se pudo guardar la configuración', error.message);
  } finally {
    savingSettings.value = false;
  }
}

async function downloadBackup(item: BackupItem) {
  try {
    const blob = await api.downloadBackup(`/api/system/backups/${encodeURIComponent(item.name)}`);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = item.name; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  } catch (error: any) {
    notifyError('No se pudo descargar el respaldo', error.message);
  }
}

async function verifyBackup(item: BackupItem) {
  verifyResults.value[item.name] = 'pending';
  try {
    verifyResults.value[item.name] = await api.verifyBackup(item.name);
  } catch (error: any) {
    notifyError('No se pudo verificar el respaldo', error.message);
    delete verifyResults.value[item.name];
  }
}

async function waitForServerBack() {
  const deadline = Date.now() + 45000;
  await new Promise((resolve) => setTimeout(resolve, 2000));
  while (Date.now() < deadline) {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) return true;
    } catch { /* el servidor sigue reiniciando */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function performRestore(run: () => Promise<{ restored: boolean; restarting: boolean }>) {
  restoreOverlay.value = { stage: 'restoring', message: 'Aplicando el respaldo…' };
  try {
    await run();
  } catch (error: any) {
    restoreOverlay.value = null;
    notifyError('No se pudo restaurar', error.message);
    return;
  }
  restoreOverlay.value = { stage: 'waiting', message: 'Reiniciando el servidor local…' };
  const back = await waitForServerBack();
  if (!back) {
    restoreOverlay.value = { stage: 'error', message: 'No se pudo confirmar que el servidor volvió a iniciar. Cierra y vuelve a abrir Karma Library.' };
    return;
  }
  restoreOverlay.value = { stage: 'ready', message: 'Listo. Redirigiendo al inicio de sesión…' };
  auth.clearSession();
  setTimeout(() => { window.location.href = '/login'; }, 700);
}

async function restoreExisting(item: BackupItem) {
  if (!confirm(`La restauración reemplazará todos los datos locales actuales con el respaldo "${item.name}". ¿Deseas continuar?`)) return;
  pendingAction.value = item.name;
  await performRestore(() => api.restoreBackupByName(item.name));
  pendingAction.value = '';
}

async function removeBackup(item: BackupItem) {
  if (!confirm(`Se eliminará el archivo de respaldo "${item.name}". Esto no afecta tu biblioteca actual. ¿Continuar?`)) return;
  try {
    await api.removeBackup(item.name);
    items.value = items.value.filter((entry) => entry.name !== item.name);
  } catch (error: any) {
    notifyError('No se pudo eliminar el respaldo', error.message);
  }
}

async function restoreFromFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !confirm('La restauración reemplazará todos los datos locales actuales. ¿Deseas continuar?')) { input.value = ''; return; }
  await performRestore(() => api.restoreBackup(file));
  input.value = '';
}

function retryWaitForServer() {
  restoreOverlay.value = { stage: 'waiting', message: 'Reiniciando el servidor local…' };
  waitForServerBack().then((back) => {
    if (!back) { restoreOverlay.value = { stage: 'error', message: 'Sigue sin responder. Cierra y vuelve a abrir Karma Library.' }; return; }
    restoreOverlay.value = { stage: 'ready', message: 'Listo. Redirigiendo al inicio de sesión…' };
    auth.clearSession();
    setTimeout(() => { window.location.href = '/login'; }, 700);
  });
}
</script>

<template>
  <div v-if="restoreOverlay" class="restore-overlay">
    <div class="restore-box">
      <AlertTriangle v-if="restoreOverlay.stage === 'error'" class="restore-error-icon" />
      <div v-else class="restore-spinner-bar"><span></span></div>
      <p>{{ restoreOverlay.message }}</p>
      <button v-if="restoreOverlay.stage === 'error'" @click="retryWaitForServer">Reintentar</button>
    </div>
  </div>
  <div class="backups-page">
    <header>
      <span class="eyebrow">RESPALDOS</span>
      <h1 class="section-title">Copias de seguridad</h1>
      <p class="section-sub">Crea, programa y restaura respaldos completos de tu biblioteca (base de datos e imágenes).</p>
    </header>

    <section class="backups-grid">
      <article class="card backups-card">
        <div class="backups-card-title"><DatabaseBackup /><div><h2>Respaldo manual</h2><p>Genera un ZIP con la base de datos y las portadas.</p></div></div>
        <div class="backups-actions">
          <button :disabled="busy" @click="createBackup"><DatabaseBackup />Crear respaldo ahora</button>
          <button :disabled="busy" @click="restoreInput?.click()"><Upload />Restaurar desde archivo</button>
        </div>
        <input ref="restoreInput" hidden type="file" accept=".zip,application/zip" @change="restoreFromFile" />
      </article>

      <article class="card backups-card">
        <div class="backups-card-title"><RefreshCw /><div><h2>Respaldo automático</h2><p>Se ejecuta en segundo plano mientras la aplicación está abierta.</p></div></div>
        <label class="backups-toggle">
          <input v-model="settings.autoEnabled" type="checkbox" />
          <span>Activar respaldos automáticos</span>
        </label>
        <label class="backups-field">
          <span>Frecuencia</span>
          <select v-model.number="settings.intervalHours" :disabled="!settings.autoEnabled">
            <option v-for="option in INTERVAL_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="backups-field">
          <span>Versiones a conservar</span>
          <input v-model.number="settings.retention" type="number" min="1" max="100" :disabled="!settings.autoEnabled" />
        </label>
        <p class="backups-note">Último respaldo automático: <strong>{{ formatDate(settings.lastRunAt) }}</strong></p>
        <button :disabled="savingSettings" @click="saveSettings">Guardar preferencias</button>
      </article>
    </section>

    <section class="card backups-list-card">
      <div class="backups-list-header"><h2>Respaldos guardados</h2><span>{{ items.length }} archivo(s)</span></div>
      <p v-if="loading" class="backups-note">Cargando…</p>
      <p v-else-if="!items.length" class="backups-note">Todavía no has creado ningún respaldo.</p>
      <ul v-else class="backups-list">
        <li v-for="item in items" :key="item.name" class="backups-row">
          <div class="backups-row-info">
            <span class="backups-row-name">{{ item.name }}</span>
            <span class="backups-row-meta">{{ formatDate(item.createdAt) }} · {{ formatBytes(item.sizeBytes) }}</span>
            <span v-if="verifyResults[item.name] === 'pending'" class="backups-verify pending">Verificando…</span>
            <span v-else-if="verifyResults[item.name]" class="backups-verify" :class="(verifyResults[item.name] as BackupVerifyResult).ok ? 'ok' : 'fail'">
              <CheckCircle2 v-if="(verifyResults[item.name] as BackupVerifyResult).ok" />
              <XCircle v-else />
              {{ (verifyResults[item.name] as BackupVerifyResult).ok ? 'Íntegro' : (verifyResults[item.name] as BackupVerifyResult).issues.join(' ') }}
            </span>
          </div>
          <div class="backups-row-actions">
            <button title="Descargar" @click="downloadBackup(item)"><Download /></button>
            <button title="Verificar integridad" @click="verifyBackup(item)"><ShieldCheck /></button>
            <button title="Restaurar" :disabled="pendingAction === item.name" @click="restoreExisting(item)"><RefreshCw /></button>
            <button title="Eliminar" class="danger" @click="removeBackup(item)"><Trash2 /></button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.backups-page { display: grid; gap: 24px; }
.backups-page header .eyebrow { color: var(--accent); font-size: 12px; letter-spacing: .12em; font-weight: 700; }
.backups-page header h1 { margin: .35rem 0; }
.backups-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.backups-card { padding: 24px; display: grid; gap: 16px; align-content: start; }
.backups-card-title { display: flex; gap: 14px; }
.backups-card-title > svg { color: var(--accent); width: 28px; flex-shrink: 0; }
.backups-card-title h2 { margin: 0 0 4px; }
.backups-card-title p { margin: 0; color: var(--text-dim); }
.backups-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.backups-card button, .backups-list-card button { display: inline-flex; align-items: center; gap: 8px; width: max-content; border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: var(--radius-sm); padding: 11px 15px; cursor: pointer; }
.backups-card button:hover, .backups-list-card button:hover { border-color: var(--accent); }
.backups-card button:disabled { opacity: .5; cursor: not-allowed; }
.backups-toggle { display: flex; align-items: center; gap: 10px; }
.backups-field { display: grid; gap: 8px; }
.backups-field span { color: var(--text-dim); font-size: 13px; }
.backups-field select, .backups-field input { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); padding: 10px 12px; }
.backups-note { color: var(--text-dim); margin: 0; }
.backups-list-card { padding: 24px; display: grid; gap: 16px; }
.backups-list-header { display: flex; justify-content: space-between; align-items: baseline; }
.backups-list-header h2 { margin: 0; }
.backups-list-header span { color: var(--text-faint); font-size: 13px; }
.backups-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.backups-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-sm); flex-wrap: wrap; }
.backups-row-info { display: grid; gap: 4px; min-width: 0; }
.backups-row-name { font-weight: 600; overflow-wrap: anywhere; }
.backups-row-meta { color: var(--text-dim); font-size: 13px; }
.backups-verify { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; }
.backups-verify svg { width: 14px; height: 14px; }
.backups-verify.ok { color: #6ee7b7; }
.backups-verify.fail { color: #fca5a5; }
.backups-verify.pending { color: var(--text-faint); }
.backups-row-actions { display: flex; gap: 8px; }
.backups-row-actions button { padding: 9px; border-radius: var(--radius-sm); }
.backups-row-actions button.danger:hover { border-color: #f87171; color: #f87171; }
@media (max-width: 800px) {
  .backups-grid { grid-template-columns: 1fr; }
}
.restore-overlay { position: fixed; inset: 0; background: rgba(4, 6, 13, .92); backdrop-filter: blur(4px); z-index: 1000; display: grid; place-items: center; }
.restore-box { display: grid; gap: 18px; justify-items: center; text-align: center; max-width: 360px; padding: 32px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); }
.restore-box p { margin: 0; color: var(--text); }
.restore-spinner-bar { width: 220px; height: 4px; background: var(--surface-2); border-radius: 99px; overflow: hidden; }
.restore-spinner-bar span { display: block; width: 45%; height: 100%; background: var(--accent-gradient); animation: restore-move 1s infinite ease-in-out; }
@keyframes restore-move { from { transform: translateX(-120%); } to { transform: translateX(320%); } }
.restore-error-icon { color: #fca5a5; width: 36px; height: 36px; }
.restore-box button { border: 1px solid var(--border); background: var(--surface-2); color: var(--text); border-radius: var(--radius-sm); padding: 10px 16px; cursor: pointer; }
.restore-box button:hover { border-color: var(--accent); }
</style>
