import { computed, ref } from 'vue';
import { api, type Reader, type ReaderProfile } from '../api/client';

const TOKEN_KEY = 'karma_reader_token';
const reader = ref<Reader | null>(null);
const profile = ref<ReaderProfile | null>(null);
const profiles = ref<Reader[]>([]);
const ready = ref(false);

function persistSession(token: string, nextReader: Reader) {
  localStorage.setItem(TOKEN_KEY, token);
  reader.value = nextReader;
}

async function login(email: string, password: string) {
  const session = await api.login(email, password);
  persistSession(session.token, session.reader);
  await loadProfile();
  await loadProfiles();
}

async function register(displayName: string, email: string, password: string) {
  const session = await api.register(displayName, email, password);
  persistSession(session.token, session.reader);
  await loadProfile();
  await loadProfiles();
}

async function loadProfiles() { profiles.value = await api.profiles(); return profiles.value; }
async function createProfile(displayName: string, color: string, isKids = false) { await api.createProfile(displayName, color, isKids); return loadProfiles(); }
async function switchProfile(profileId: string) { const session = await api.switchProfile(profileId); persistSession(session.token, session.reader); profile.value = null; await loadProfile(); }

async function bootstrap() {
  if (!localStorage.getItem(TOKEN_KEY)) { ready.value = true; return; }
  try { await loadProfile(); } catch { clearSession(); } finally { ready.value = true; }
}

async function loadProfile() {
  profile.value = await api.readerProfile();
  reader.value = profile.value.reader;
  return profile.value;
}

async function updateProfile(data: Parameters<typeof api.updateReaderProfile>[0]) {
  profile.value = await api.updateReaderProfile(data);
  reader.value = profile.value.reader;
  return profile.value;
}

async function logout() {
  try { await api.logout(); } finally { clearSession(); }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  reader.value = null;
  profile.value = null;
  profiles.value = [];
}

export function useAuthStore() {
  return {
    reader, profile, profiles, ready,
    authenticated: computed(() => Boolean(reader.value && localStorage.getItem(TOKEN_KEY))),
    login, register, bootstrap, loadProfile, loadProfiles, createProfile, switchProfile, updateProfile, logout, clearSession,
  };
}
