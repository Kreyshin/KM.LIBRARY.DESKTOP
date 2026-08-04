const { app, BrowserWindow, dialog, ipcMain, shell, utilityProcess } = require('electron');
const { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } = require('fs');
const path = require('path');
const { createStorageManager } = require('./storage.cjs');

let serverProcess;
let quitting = false;
let mainWindow;
let storageManager;
const port = 3344;
const deleteLibraryDataMode = process.argv.includes('--delete-library-data');
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

function connectionFile() { return path.join(app.getPath('userData'), 'connection.json'); }
function storage() {
  if (!storageManager) storageManager = createStorageManager(app.getPath('userData'), {
    forbiddenDirs: app.isPackaged ? [path.dirname(process.execPath)] : [],
  });
  return storageManager;
}
function getDataDir() { return storage().getCurrentDir(); }
function getConnection() {
  try { return JSON.parse(readFileSync(connectionFile(), 'utf8')); } catch { return { mode: 'local', url: '' }; }
}
function normalizeRemoteUrl(value) {
  const raw = String(value || '').trim().replace(/\/$/, '');
  if (!raw) return '';
  const parsed = new URL(raw);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('La URL debe comenzar con http:// o https://');
  return parsed.origin;
}
function runtimePaths() {
  if (app.isPackaged) return {
    serverMain: path.join(process.resourcesPath, 'server.asar', 'server-bootstrap.cjs'),
    migrations: path.join(process.resourcesPath, 'server.asar', 'prisma', 'migrations'),
    migrationRunner: path.join(process.resourcesPath, 'server.asar', 'migrate.cjs'),
    prismaClient: path.join(process.resourcesPath, 'server.asar', 'modules', '@prisma', 'client', 'index.js'),
    modulePath: path.join(process.resourcesPath, 'server.asar', 'modules'),
    blankDatabase: path.join(process.resourcesPath, 'server.asar', 'blank.sqlite'),
    brandLogo: path.join(process.resourcesPath, 'brand', 'logo-mark.png'),
    web: path.join(process.resourcesPath, 'web'),
  };
  const root = path.join(__dirname, '..');
  return {
    serverMain: path.join(root, 'karma-api-library', 'dist', 'main.js'),
    migrations: path.join(root, 'karma-api-library', 'prisma', 'migrations'),
    migrationRunner: path.join(root, 'electron', 'migrate.cjs'),
    prismaClient: path.join(root, 'karma-api-library', 'node_modules', '@prisma', 'client', 'index.js'),
    modulePath: path.join(root, 'karma-api-library', 'node_modules'),
    blankDatabase: path.join(root, '.runtime', 'server', 'blank.sqlite'),
    brandLogo: path.join(root, 'build', 'logo-splash.png'),
    web: path.join(root, 'karma-front-library', 'dist'),
  };
}
function serverEnvironment() {
  const dataDir = getDataDir();
  mkdirSync(dataDir, { recursive: true });
  const paths = runtimePaths();
  return { ...process.env, NODE_PATH: paths.modulePath, KARMA_MODE: 'desktop', KARMA_DATA_DIR: dataDir, KARMA_STATIC_DIR: paths.web, HOST: '127.0.0.1', PORT: String(port), DATABASE_URL: `file:${path.join(dataDir, 'library.sqlite').replace(/\\/g, '/')}` };
}
function runUtility(modulePath, args, environment) {
  return new Promise((resolve, reject) => {
    const child = utilityProcess.fork(modulePath, args, { env: environment, stdio: 'pipe' });
    let output = '';
    child.stdout?.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { output += chunk.toString(); });
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(output || `El proceso terminó con código ${code}.`)));
  });
}
async function migrate() {
  const paths = runtimePaths();
  const dataDir = getDataDir();
  mkdirSync(dataDir, { recursive: true });
  const databasePath = path.join(dataDir, 'library.sqlite');
  const markerPath = path.join(dataDir, '.migration-version');
  const migrationNames = readdirSync(paths.migrations, { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const latestMigration = migrationNames.at(-1) || 'none';

  if (!existsSync(databasePath) || statSync(databasePath).size === 0) {
    if (existsSync(paths.blankDatabase)) {
      copyFileSync(paths.blankDatabase, databasePath);
      writeFileSync(markerPath, latestMigration);
      return;
    }
    writeFileSync(databasePath, '');
  }
  if (existsSync(markerPath) && readFileSync(markerPath, 'utf8').trim() === latestMigration) return;
  await runUtility(paths.migrationRunner, [paths.prismaClient, paths.migrations], serverEnvironment());
  writeFileSync(markerPath, latestMigration);
}
async function startServer() {
  await migrate();
  serverProcess = utilityProcess.fork(runtimePaths().serverMain, [], { env: serverEnvironment(), stdio: 'pipe', serviceName: 'Karma Library API' });
  serverProcess.stdout?.on('data', (chunk) => { if (!app.isPackaged) process.stdout.write(chunk); });
  serverProcess.stderr?.on('data', (chunk) => process.stderr.write(chunk));
  serverProcess.on('exit', (code) => {
    if (!quitting && code !== 42) console.error(`Karma Library API terminó con código ${code}.`);
    serverProcess = undefined;
    if (!quitting && code === 42) setTimeout(() => void startServer(), 500);
  });
}
async function stopServer() {
  const child = serverProcess;
  if (!child) return;
  serverProcess = undefined;
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    child.once('exit', finish);
    child.kill();
    setTimeout(finish, 2000);
  });
}
async function applyPendingStorageLocation() {
  const pending = storage().getPendingDir();
  if (!pending) return;
  try {
    storage().migrate(pending);
  } catch (error) {
    storage().clearPending();
    dialog.showErrorBox(
      'No se pudo cambiar la carpeta de datos',
      `${error.message}\n\nSe continuará utilizando:\n${getDataDir()}`,
    );
  }
}
async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(`${url}/api/system/status`); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('El servidor local no respondió a tiempo.');
}
async function createWindow() {
  const paths = runtimePaths();
  const window = new BrowserWindow({ width: 1440, height: 900, minWidth: 1080, minHeight: 680, backgroundColor: '#090b12', icon: paths.brandLogo, show: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  mainWindow = window;
  window.on('closed', () => { mainWindow = undefined; });
  window.setMenuBarVisibility(false);
  const logo = `data:image/png;base64,${readFileSync(paths.brandLogo).toString('base64')}`;
  const splash = encodeURIComponent(`<!doctype html><meta charset="utf-8"><style>html,body{height:100%;margin:0;background:radial-gradient(circle at 50% 38%,#211238 0,#090b12 43%,#07080d 100%);color:#fff;font-family:Segoe UI,sans-serif}body{display:grid;place-items:center}.box{text-align:center}.mark{width:112px;height:112px;margin:auto;border:1px solid #a855f766;border-radius:30px;object-fit:cover;box-shadow:0 22px 70px #7c3aed77}.name{margin:24px 0 8px;font-size:25px;font-weight:750;letter-spacing:.12em}.status{color:#aaa4b7}.loader{width:190px;height:3px;margin:24px auto;background:#242032;overflow:hidden;border-radius:9px}.loader:after{content:'';display:block;width:45%;height:100%;background:linear-gradient(90deg,#7c3aed,#c084fc);animation:move 1s infinite ease-in-out}@keyframes move{from{transform:translateX(-110%)}to{transform:translateX(330%)}}</style><div class="box"><img class="mark" src="${logo}" alt="Karma Library"><div class="name">KARMA LIBRARY</div><div class="status">Preparando tu biblioteca…</div><div class="loader"></div></div>`);
  await window.loadURL(`data:text/html;charset=utf-8,${splash}`);
  await applyPendingStorageLocation();
  const connection = getConnection();
  let target = connection.mode === 'remote' ? normalizeRemoteUrl(connection.url) : '';
  if (!target) { target = `http://127.0.0.1:${port}`; await startServer(); }
  await waitForServer(target);
  window.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  await window.loadURL(target);
}

ipcMain.handle('connection:get', () => getConnection());
ipcMain.handle('connection:set', (_event, value) => {
  const url = normalizeRemoteUrl(value);
  const connection = url ? { mode: 'remote', url } : { mode: 'local', url: '' };
  writeFileSync(connectionFile(), JSON.stringify(connection, null, 2));
  app.relaunch(); app.exit(0);
  return connection;
});
ipcMain.handle('storage:get', () => storage().getInfo());
ipcMain.handle('storage:select', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona la carpeta para tu biblioteca',
    defaultPath: getDataDir(),
    buttonLabel: 'Usar esta carpeta',
    properties: ['openDirectory', 'createDirectory'],
  });
  return { canceled: result.canceled, path: result.filePaths[0] || '' };
});
ipcMain.handle('storage:move', async (_event, target) => {
  const hadServer = Boolean(serverProcess);
  if (hadServer) await stopServer();
  try {
    const result = storage().migrate(target);
    app.relaunch();
    app.exit(0);
    return result;
  } catch (error) {
    if (hadServer) await startServer();
    throw error;
  }
});

if (hasInstanceLock && deleteLibraryDataMode) {
  app.whenReady()
    .then(() => { storage().deleteAllData(); app.exit(0); })
    .catch((error) => { console.error(error); app.exit(1); });
} else if (hasInstanceLock) {
  app.whenReady().then(createWindow).catch((error) => { console.error(error); app.quit(); });
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { quitting = true; if (serverProcess) serverProcess.kill(); });
