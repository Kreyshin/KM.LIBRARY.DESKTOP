const { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const api = path.join(root, 'karma-api-library');
const runtime = path.join(root, '.runtime');
const install = path.join(runtime, 'install');
const server = path.join(runtime, 'server');
const packaged = path.join(runtime, 'package');

rmSync(runtime, { recursive: true, force: true });
mkdirSync(path.join(install, 'prisma'), { recursive: true });
mkdirSync(server, { recursive: true });
mkdirSync(packaged, { recursive: true });

const sourcePackage = JSON.parse(readFileSync(path.join(api, 'package.json'), 'utf8'));
writeFileSync(path.join(install, 'package.json'), JSON.stringify({
  name: sourcePackage.name,
  version: sourcePackage.version,
  private: true,
  dependencies: sourcePackage.dependencies,
}, null, 2));
cpSync(path.join(api, 'package-lock.json'), path.join(install, 'package-lock.json'));
cpSync(path.join(api, 'prisma', 'schema.prisma'), path.join(install, 'prisma', 'schema.prisma'));

const installArgs = ['install', '--omit=dev', '--legacy-peer-deps', '--no-audit', '--no-fund'];
const installed = process.platform === 'win32'
  ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm.cmd ${installArgs.join(' ')}`], { cwd: install, stdio: 'inherit' })
  : spawnSync('npm', installArgs, { cwd: install, stdio: 'inherit' });
if (installed.error) throw installed.error;
if (installed.status !== 0) process.exit(installed.status || 1);

// @prisma/client necesita el cliente generado por el build, pero no el CLI de Prisma.
const generatedClient = path.join(api, 'node_modules', '.prisma');
if (!existsSync(generatedClient)) throw new Error('Falta el cliente generado. Ejecuta npm run build primero.');
cpSync(generatedClient, path.join(install, 'node_modules', '.prisma'), { recursive: true, force: true });

// electron-builder reserva el nombre node_modules y lo poda de extraResources.
// Conservamos este runtime ya reducido bajo un nombre neutral.
renameSync(path.join(install, 'node_modules'), path.join(server, 'modules'));
cpSync(path.join(api, 'dist'), path.join(server, 'dist'), { recursive: true });
cpSync(path.join(api, 'prisma'), path.join(server, 'prisma'), { recursive: true });
cpSync(path.join(api, 'package.json'), path.join(server, 'package.json'));
cpSync(path.join(root, 'electron', 'migrate.cjs'), path.join(server, 'migrate.cjs'));
cpSync(path.join(root, 'electron', 'server-bootstrap.cjs'), path.join(server, 'server-bootstrap.cjs'));

const blankDatabase = path.join(server, 'blank.sqlite');
const migrated = spawnSync(process.execPath, [
  path.join(root, 'electron', 'migrate.cjs'),
  path.join(server, 'modules', '@prisma', 'client', 'index.js'),
  path.join(server, 'prisma', 'migrations'),
], {
  cwd: root,
  env: { ...process.env, NODE_PATH: path.join(server, 'modules'), DATABASE_URL: `file:${blankDatabase.replace(/\\/g, '/')}` },
  stdio: 'inherit',
});
if (migrated.status !== 0) process.exit(migrated.status || 1);

const asar = spawnSync(process.execPath, [
  require.resolve('@electron/asar/bin/asar.js'),
  'pack',
  server,
  path.join(packaged, 'server.asar'),
  '--unpack',
  '*.node',
], { cwd: root, stdio: 'inherit' });
if (asar.error) throw asar.error;
if (asar.status !== 0) process.exit(asar.status || 1);

rmSync(install, { recursive: true, force: true });
rmSync(server, { recursive: true, force: true });
console.log(`Runtime de producción preparado en ${packaged}`);
