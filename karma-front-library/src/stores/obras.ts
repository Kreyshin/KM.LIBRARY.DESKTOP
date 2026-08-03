import { computed, ref } from 'vue';
import { api, type Obra } from '../api/client';

// Store simple compartido en memoria (sin Pinia, para mantener las dependencias livianas).
const obras = ref<Obra[]>([]);
const loading = ref(true);
const error = ref('');
const loaded = ref(false);

async function load(force = false) {
  if (loaded.value && !force) return;
  loading.value = true;
  error.value = '';
  try {
    obras.value = await api.list();
    loaded.value = true;
  } catch (e: any) {
    error.value = e.message || 'No se pudo conectar con el backend';
  } finally {
    loading.value = false;
  }
}

function upsert(obra: Obra) {
  const idx = obras.value.findIndex((x) => x.id === obra.id);
  if (idx >= 0) obras.value[idx] = obra;
  else obras.value.push(obra);
}

function remove(id: string) {
  obras.value = obras.value.filter((x) => x.id !== id);
}

const distinctAuthors = computed(() => {
  const set = new Set(obras.value.map((o) => o.autor).filter(Boolean) as string[]);
  return set.size;
});

const distinctGenres = computed(() => {
  const set = new Set<string>();
  obras.value.forEach((o) => o.genres.forEach((g) => set.add(g)));
  return Array.from(set).sort();
});

export function useObrasStore() {
  return { obras, loading, error, load, upsert, remove, distinctAuthors, distinctGenres };
}
