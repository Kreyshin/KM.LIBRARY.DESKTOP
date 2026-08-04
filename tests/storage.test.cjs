const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } = require('fs');
const { tmpdir } = require('os');
const path = require('path');
const test = require('node:test');
const { createStorageManager } = require('../electron/storage.cjs');

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'karma-storage-'));
  const userData = path.join(root, 'AppData');
  mkdirSync(path.join(userData, 'data', 'uploads', 'work-1'), { recursive: true });
  writeFileSync(path.join(userData, 'data', 'library.sqlite'), 'database');
  writeFileSync(path.join(userData, 'data', 'uploads', 'work-1', 'cover.webp'), 'image');
  return { root, userData, manager: createStorageManager(userData) };
}

test('moves and verifies all existing data before changing location', () => {
  const item = fixture();
  try {
    const target = path.join(item.root, 'External', 'Karma Library');
    const result = item.manager.migrate(target);
    assert.equal(result.moved, true);
    assert.equal(item.manager.getCurrentDir(), target);
    assert.equal(readFileSync(path.join(target, 'library.sqlite'), 'utf8'), 'database');
    assert.equal(readFileSync(path.join(target, 'uploads', 'work-1', 'cover.webp'), 'utf8'), 'image');
    assert.equal(item.manager.getInfo().files, 2);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('refuses to merge two non-empty data folders', () => {
  const item = fixture();
  try {
    const target = path.join(item.root, 'Existing');
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, 'unrelated.txt'), 'keep');
    assert.throws(() => item.manager.migrate(target), /no está vacía/);
    assert.equal(readFileSync(path.join(item.userData, 'data', 'library.sqlite'), 'utf8'), 'database');
    assert.equal(readFileSync(path.join(target, 'unrelated.txt'), 'utf8'), 'keep');
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('rejects nested destinations to avoid recursive copies', () => {
  const item = fixture();
  try {
    assert.throws(() => item.manager.migrate(path.join(item.userData, 'data', 'nested')), /no puede estar dentro/);
  } finally { rmSync(item.root, { recursive: true, force: true }); }
});

test('requires an empty destination even for a new library', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'karma-storage-empty-'));
  try {
    const userData = path.join(root, 'AppData');
    const target = path.join(root, 'Documents');
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, 'personal.txt'), 'do not mix');
    assert.throws(() => createStorageManager(userData).migrate(target), /no está vacía/);
    assert.equal(readFileSync(path.join(target, 'personal.txt'), 'utf8'), 'do not mix');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('rejects the application installation directory and its children', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'karma-storage-install-'));
  try {
    const installDir = path.join(root, 'Programs', 'Karma Library');
    const manager = createStorageManager(path.join(root, 'AppData'), { forbiddenDirs: [installDir] });
    assert.throws(() => manager.migrate(installDir), /carpeta donde está instalado/);
    assert.throws(() => manager.migrate(path.join(installDir, 'data')), /carpeta donde está instalado/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
