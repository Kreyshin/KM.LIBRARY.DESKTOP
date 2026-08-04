<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DatabaseBackup, Download, FolderOpen, HardDrive, Network, RotateCcw, Upload } from 'lucide-vue-next';
import { api } from '../api/client';
import { notifyError, notifySuccess } from '../services/notifications';

const busy = ref(false);
const remoteUrl = ref('');
const connectionMode = ref<'local' | 'remote'>('local');
const restoreInput = ref<HTMLInputElement>();
const isDesktop = Boolean(window.karmaDesktop);
const storageInfo = ref<{ dataDir: string; defaultDataDir: string; isCustom: boolean; files: number; bytes: number }>();

onMounted(async () => {
  if (!window.karmaDesktop) return;
  const connection = await window.karmaDesktop.getConnection();
  connectionMode.value = connection.mode;
  remoteUrl.value = connection.url;
  storageInfo.value = await window.karmaDesktop.getStorageInfo();
});

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) { value /= 1024; unit = units[index]; }
  return `${value.toLocaleString('es-PE', { maximumFractionDigits: 1 })} ${unit}`;
}

async function changeStorageDirectory() {
  if (!window.karmaDesktop || !storageInfo.value) return;
  const selection = await window.karmaDesktop.selectStorageDirectory();
  if (selection.canceled || !selection.path || selection.path === storageInfo.value.dataDir) return;
  const content = storageInfo.value.files > 0
    ? `Se moverán ${storageInfo.value.files.toLocaleString('es-PE')} archivos (${formatBytes(storageInfo.value.bytes)}), incluyendo la base de datos, imágenes y respaldos.`
    : 'La biblioteca aún no tiene contenido que mover.';
  const accepted = confirm(`${content}\n\nNueva ubicación:\n${selection.path}\n\nKarma Library se reiniciará al terminar. ¿Deseas continuar?`);
  if (!accepted) return;
  busy.value = true;
  try {
    await window.karmaDesktop.moveStorage(selection.path);
  } catch (error: any) {
    notifyError('No se pudo cambiar la ubicación', error.message);
    busy.value = false;
  }
}

async function exportBackup() {
  busy.value = true;
  try {
    const backup = await api.createBackup();
    const blob = await api.downloadBackup(backup.downloadUrl);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = backup.name; link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    notifySuccess('Respaldo creado', 'Guárdalo en otra unidad o servicio seguro.');
  } catch (error: any) { notifyError('No se pudo crear el respaldo', error.message); } finally { busy.value = false; }
}

async function restore(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !confirm('La restauración reemplazará todos los datos locales actuales. ¿Deseas continuar?')) return;
  busy.value = true;
  try { await api.restoreBackup(file); notifySuccess('Respaldo restaurado', 'Karma Library se reiniciará con los datos recuperados.'); }
  catch (error: any) { notifyError('No se pudo restaurar', error.message); busy.value = false; }
}

async function useRemote() {
  if (!window.karmaDesktop) return;
  await window.karmaDesktop.setConnection(remoteUrl.value);
}
async function useLocal() {
  if (!window.karmaDesktop) return;
  await window.karmaDesktop.setConnection('');
}
</script>

<template>
  <div class="settings-page">
    <header><span class="eyebrow">CONFIGURACIÓN</span><h1>Datos y conexión</h1><p>Controla dónde vive tu biblioteca y crea copias que puedas llevar a otra PC.</p></header>
    <section class="settings-grid">
      <article class="card settings-card">
        <div class="settings-card-title"><DatabaseBackup /><div><h2>Respaldos</h2><p>Incluye la base SQLite y todas las imágenes.</p></div></div>
        <div class="settings-actions"><button :disabled="busy" @click="exportBackup"><Download />Exportar biblioteca</button><button :disabled="busy" @click="restoreInput?.click()"><Upload />Restaurar respaldo</button></div>
        <input ref="restoreInput" hidden type="file" accept=".zip,application/zip" @change="restore" />
      </article>
      <article class="card settings-card">
        <div class="settings-card-title"><HardDrive /><div><h2>Modo local</h2><p>SQLite e imágenes se guardan únicamente en esta computadora.</p></div></div>
        <span class="mode-pill" :class="{ active: connectionMode === 'local' }">{{ connectionMode === 'local' ? 'Activo' : 'Disponible' }}</span>
        <button v-if="isDesktop && connectionMode !== 'local'" @click="useLocal"><RotateCcw />Volver al modo local</button>
      </article>
      <article v-if="isDesktop" class="card settings-card settings-wide">
        <div class="settings-card-title"><FolderOpen /><div><h2>Ubicación de la biblioteca</h2><p>Elige otra unidad para evitar que las imágenes y la base de datos llenen el disco C.</p></div></div>
        <div v-if="storageInfo" class="storage-location">
          <span>Carpeta actual</span>
          <code>{{ storageInfo.dataDir }}</code>
          <small>{{ storageInfo.files.toLocaleString('es-PE') }} archivos · {{ formatBytes(storageInfo.bytes) }}{{ storageInfo.isCustom ? ' · Ubicación personalizada' : ' · Ubicación predeterminada' }}</small>
        </div>
        <p class="settings-note"><strong>Al cambiarla:</strong> la base SQLite, las imágenes, los respaldos y la configuración privada se copiarán y verificarán antes de eliminarse de la ubicación anterior. Usa una carpeta dedicada y vacía, fuera de la carpeta donde instalaste el programa.</p>
        <button :disabled="busy || !storageInfo" @click="changeStorageDirectory"><FolderOpen />Cambiar carpeta y mover datos</button>
      </article>
      <article class="card settings-card settings-wide">
        <div class="settings-card-title"><Network /><div><h2>Servidor familiar LAN</h2><p>Conecta esta aplicación a una instalación central que esté ejecutándose en tu NAS o PC anfitriona.</p></div></div>
        <template v-if="isDesktop"><label>URL del servidor<input v-model.trim="remoteUrl" type="url" placeholder="http://192.168.1.50:3344" /></label><button :disabled="!remoteUrl" @click="useRemote"><Network />Conectar y reiniciar</button></template>
        <p v-else class="settings-note">En navegador ya estás utilizando el servidor que entregó esta página.</p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.settings-page{display:grid;gap:24px}.settings-page header h1{font-size:2.2rem;margin:.35rem 0}.settings-page header p,.settings-card p{color:var(--text-muted,#9ca3af)}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.settings-card{padding:24px;display:grid;gap:20px;align-content:start}.settings-wide{grid-column:1/-1}.settings-card-title{display:flex;gap:14px}.settings-card-title>svg{color:#a78bfa;width:28px}.settings-card h2{margin:0 0 4px}.settings-card p{margin:0}.settings-actions{display:flex;gap:12px}.settings-card button{display:inline-flex;align-items:center;gap:8px;width:max-content;border:1px solid #3b4255;background:#232839;color:#fff;border-radius:10px;padding:11px 15px;cursor:pointer}.settings-card button:hover{border-color:#8b5cf6}.settings-card button:disabled{opacity:.5}.settings-card label{display:grid;gap:8px}.settings-card input{background:#0c0f17;border:1px solid #353b4d;border-radius:10px;color:#fff;padding:13px}.mode-pill{width:max-content;border-radius:999px;background:#252a38;color:#aab1c2;padding:6px 11px}.mode-pill.active{background:#12392d;color:#6ee7b7}.settings-note{padding:14px;background:#111520;border-radius:10px}.settings-note strong{color:#e5e7eb}.storage-location{display:grid;gap:7px;padding:15px;border:1px solid #343a4b;background:#0c0f17;border-radius:11px}.storage-location span,.storage-location small{color:#9ca3af}.storage-location code{overflow-wrap:anywhere;color:#ddd6fe;font-family:"Cascadia Code",Consolas,monospace}@media(max-width:800px){.settings-grid{grid-template-columns:1fr}.settings-wide{grid-column:auto}.settings-actions{flex-direction:column}}
</style>
