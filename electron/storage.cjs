const {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} = require('fs');
const path = require('path');

function samePath(left, right) {
  return path.resolve(left).toLocaleLowerCase() === path.resolve(right).toLocaleLowerCase();
}

function isInside(candidate, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function inspectDirectory(directory) {
  if (!existsSync(directory)) return { files: 0, bytes: 0 };
  const pending = [directory];
  let files = 0;
  let bytes = 0;
  while (pending.length) {
    const current = pending.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile()) {
        files += 1;
        bytes += lstatSync(entryPath).size;
      }
    }
  }
  return { files, bytes };
}

function createStorageManager(userDataDir, options = {}) {
  const defaultDataDir = path.join(userDataDir, 'data');
  const locationFile = path.join(userDataDir, 'data-location.txt');
  const pendingFile = path.join(userDataDir, 'pending-data-location.txt');
  const forbiddenDirs = (options.forbiddenDirs || []).map((directory) => path.resolve(directory));

  function normalizeTarget(value) {
    const target = String(value || '').trim();
    if (!target || !path.isAbsolute(target)) throw new Error('Selecciona una ruta absoluta válida.');
    const resolved = path.resolve(target);
    if (samePath(resolved, path.parse(resolved).root)) throw new Error('Selecciona una carpeta dentro de la unidad, no la raíz completa.');
    if (samePath(resolved, userDataDir)) throw new Error('Selecciona una carpeta distinta de AppData.');
    if (forbiddenDirs.some((directory) => samePath(resolved, directory) || isInside(resolved, directory))) {
      throw new Error('No guardes la biblioteca dentro de la carpeta donde está instalado el programa. Una desinstalación podría eliminar tus datos.');
    }
    return resolved;
  }

  function readLocation(file) {
    try { return normalizeTarget(readFileSync(file, 'utf8')); } catch { return ''; }
  }

  function getCurrentDir() {
    return readLocation(locationFile) || defaultDataDir;
  }

  function getPendingDir() {
    return readLocation(pendingFile);
  }

  function clearPending() {
    rmSync(pendingFile, { force: true });
  }

  function writeLocation(target) {
    mkdirSync(userDataDir, { recursive: true });
    const temporary = `${locationFile}.tmp`;
    writeFileSync(temporary, target, 'utf8');
    rmSync(locationFile, { force: true });
    renameSync(temporary, locationFile);
  }

  function getInfo() {
    const dataDir = getCurrentDir();
    return { dataDir, defaultDataDir, isCustom: !samePath(dataDir, defaultDataDir), ...inspectDirectory(dataDir) };
  }

  function migrate(rawTarget) {
    const source = getCurrentDir();
    const target = normalizeTarget(rawTarget);
    const sourceInfo = inspectDirectory(source);
    if (samePath(source, target)) {
      writeLocation(target);
      clearPending();
      return { from: source, to: target, moved: false, ...sourceInfo };
    }
    if (isInside(target, source) || isInside(source, target)) {
      throw new Error('La carpeta nueva no puede estar dentro de la carpeta actual ni contenerla.');
    }

    const targetInfo = inspectDirectory(target);
    if (targetInfo.files > 0) {
      throw new Error('La carpeta elegida no está vacía. Selecciona una carpeta nueva o vacía para evitar mezclar bibliotecas.');
    }

    mkdirSync(path.dirname(target), { recursive: true });
    if (sourceInfo.files === 0) {
      mkdirSync(target, { recursive: true });
      writeLocation(target);
      clearPending();
      if (existsSync(source)) rmSync(source, { recursive: true, force: true });
      return { from: source, to: target, moved: false, ...targetInfo };
    }

    const staging = `${target}.karma-migrating-${process.pid}-${Date.now()}`;
    try {
      cpSync(source, staging, { recursive: true, errorOnExist: true, force: false });
      const copiedInfo = inspectDirectory(staging);
      if (copiedInfo.files !== sourceInfo.files || copiedInfo.bytes !== sourceInfo.bytes) {
        throw new Error('La verificación de los archivos copiados no coincidió con el origen.');
      }
      if (existsSync(target)) rmSync(target, { recursive: true, force: true });
      renameSync(staging, target);
      writeLocation(target);
      rmSync(source, { recursive: true, force: true });
      clearPending();
      return { from: source, to: target, moved: true, ...sourceInfo };
    } catch (error) {
      rmSync(staging, { recursive: true, force: true });
      throw error;
    }
  }

  return { clearPending, getCurrentDir, getInfo, getPendingDir, migrate, normalizeTarget };
}

module.exports = { createStorageManager, inspectDirectory };
