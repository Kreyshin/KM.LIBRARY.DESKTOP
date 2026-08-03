const { app, BrowserWindow, ipcMain, shell, utilityProcess } = require('electron');
const { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');

let serverProcess;
let quitting = false;
const port = 3344;

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
    serverMain: path.join(process.resourcesPath, 'server', 'dist', 'main.js'),
    prismaCli: path.join(process.resourcesPath, 'server', 'node_modules', 'prisma', 'build', 'index.js'),
    schema: path.join(process.resourcesPath, 'server', 'prisma', 'schema.prisma'),
    migrations: path.join(process.resourcesPath, 'server', 'prisma', 'migrations'),
    migrationRunner: path.join(process.resourcesPath, 'server', 'migrate.cjs'),
    prismaClient: path.join(process.resourcesPath, 'server', 'node_modules', '@prisma', 'client', 'index.js'),
    web: path.join(process.resourcesPath, 'web'),
  };
  const root = path.join(__dirname, '..');
  return {
    serverMain: path.join(root, 'karma-api-library', 'dist', 'main.js'),
    prismaCli: path.join(root, 'karma-api-library', 'node_modules', 'prisma', 'build', 'index.js'),
    schema: path.join(root, 'karma-api-library', 'prisma', 'schema.prisma'),
    migrations: path.join(root, 'karma-api-library', 'prisma', 'migrations'),
    migrationRunner: path.join(root, 'electron', 'migrate.cjs'),
    prismaClient: path.join(root, 'karma-api-library', 'node_modules', '@prisma', 'client', 'index.js'),
    web: path.join(root, 'karma-front-library', 'dist'),
  };
}
function serverEnvironment() {
  const dataDir = path.join(app.getPath('userData'), 'data');
  mkdirSync(dataDir, { recursive: true });
  return { ...process.env, KARMA_MODE: 'desktop', KARMA_DATA_DIR: dataDir, KARMA_STATIC_DIR: runtimePaths().web, HOST: '127.0.0.1', PORT: String(port), DATABASE_URL: `file:${path.join(dataDir, 'library.sqlite').replace(/\\/g, '/')}` };
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
  if (!existsSync(databasePath)) closeSync(openSync(databasePath, 'a'));
  await runUtility(paths.migrationRunner, [paths.prismaClient, paths.migrations], serverEnvironment());
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
  const connection = getConnection();
  let target = connection.mode === 'remote' ? normalizeRemoteUrl(connection.url) : '';
  if (!target) { target = `http://127.0.0.1:${port}`; await startServer(); }
  await waitForServer(target);
  const window = new BrowserWindow({ width: 1440, height: 900, minWidth: 1080, minHeight: 680, backgroundColor: '#090b12', show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  window.once('ready-to-show', () => window.show());
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

app.whenReady().then(createWindow).catch((error) => { console.error(error); app.quit(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { quitting = true; if (serverProcess) serverProcess.kill(); });
