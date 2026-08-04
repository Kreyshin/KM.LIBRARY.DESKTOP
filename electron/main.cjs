const { app, BrowserWindow, ipcMain, shell, utilityProcess } = require('electron');
const { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } = require('fs');
const path = require('path');

let serverProcess;
let quitting = false;
let mainWindow;
const port = 3344;
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();
app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

function connectionFile() { return path.join(app.getPath('userData'), 'connection.json'); }
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
    web: path.join(root, 'karma-front-library', 'dist'),
  };
}
function serverEnvironment() {
  const dataDir = path.join(app.getPath('userData'), 'data');
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
  const dataDir = path.join(app.getPath('userData'), 'data');
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
async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(`${url}/api/system/status`); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('El servidor local no respondió a tiempo.');
}
async function createWindow() {
  const window = new BrowserWindow({ width: 1440, height: 900, minWidth: 1080, minHeight: 680, backgroundColor: '#090b12', show: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  mainWindow = window;
  window.on('closed', () => { mainWindow = undefined; });
  window.setMenuBarVisibility(false);
  const splash = encodeURIComponent(`<!doctype html><meta charset="utf-8"><style>html,body{height:100%;margin:0;background:#090b12;color:#fff;font-family:Segoe UI,sans-serif}body{display:grid;place-items:center}.box{text-align:center}.mark{width:76px;height:76px;margin:auto;border-radius:22px;background:linear-gradient(135deg,#9f6bff,#5b21b6);display:grid;place-items:center;font-size:34px;font-weight:800;box-shadow:0 18px 55px #7c3aed55}.name{margin:22px 0 8px;font-size:25px;font-weight:750;letter-spacing:.12em}.status{color:#9ca3af}.loader{width:180px;height:3px;margin:24px auto;background:#202434;overflow:hidden;border-radius:9px}.loader:after{content:'';display:block;width:45%;height:100%;background:#9f6bff;animation:move 1s infinite ease-in-out}@keyframes move{from{transform:translateX(-110%)}to{transform:translateX(330%)}}</style><div class="box"><div class="mark">K</div><div class="name">KARMA LIBRARY</div><div class="status">Preparando tu biblioteca…</div><div class="loader"></div></div>`);
  await window.loadURL(`data:text/html;charset=utf-8,${splash}`);
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

if (hasInstanceLock) app.whenReady().then(createWindow).catch((error) => { console.error(error); app.quit(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { quitting = true; if (serverProcess) serverProcess.kill(); });
