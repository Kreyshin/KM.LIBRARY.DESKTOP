<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import {
  ArrowRight, Award, BookCheck, BookOpen, Heart, LibraryBig,
  Search, Sparkles, Star, Users, X,
} from 'lucide-vue-next';
import { FORMATS, type Obra } from '../api/client';
import { useObrasStore } from '../stores/obras';

interface AuthorProfile {
  key: string;
  name: string;
  works: Obra[];
  volumes: number;
  owned: number;
  read: number;
  favorites: number;
  completed: number;
  averageRating: number;
  genres: { name: string; count: number }[];
  formats: string[];
}

const store = useObrasStore();
const openWorkModal = inject<(obra: Obra) => void>('openWorkModal');
const query = ref('');
const sortBy = ref<'works' | 'volumes' | 'rating' | 'name'>('works');
const selectedKey = ref('');

onMounted(() => store.load());

const authors = computed<AuthorProfile[]>(() => {
  const grouped = new Map<string, { name: string; works: Obra[] }>();
  store.obras.value.forEach((work) => {
    const name = work.autor?.trim();
    if (!name) return;
    const key = name.toLocaleLowerCase('es');
    const entry = grouped.get(key) || { name, works: [] };
    entry.works.push(work);
    grouped.set(key, entry);
  });

  return [...grouped.entries()].map(([key, entry]) => {
    const volumes = entry.works.flatMap((work) => work.volumes);
    const ratings = entry.works.map((work) => work.rating).filter((rating): rating is number => rating != null);
    const genreCounts = new Map<string, number>();
    entry.works.forEach((work) => work.genres.forEach((genre) => genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)));
    return {
      key,
      name: entry.name,
      works: [...entry.works].sort((a, b) => a.titulo.localeCompare(b.titulo)),
      volumes: volumes.length,
      owned: volumes.filter((volume) => volume.ownership !== 'NOT_OWNED').length,
      read: volumes.filter((volume) => volume.read).length,
      favorites: entry.works.filter((work) => work.favorite).length,
      completed: entry.works.filter((work) => work.status === 'COMPLETED').length,
      averageRating: ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0,
      genres: [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, count })),
      formats: [...new Set(entry.works.map((work) => FORMATS.find((format) => format.value === work.tipo)?.label || work.tipo))],
    };
  });
});

const filteredAuthors = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('es');
  const result = authors.value.filter((author) => !needle || [author.name, ...author.genres.map((genre) => genre.name), ...author.formats]
    .some((value) => value.toLocaleLowerCase('es').includes(needle)));
  return [...result].sort((a, b) => {
    if (sortBy.value === 'name') return a.name.localeCompare(b.name);
    if (sortBy.value === 'rating') return b.averageRating - a.averageRating || b.works.length - a.works.length;
    if (sortBy.value === 'volumes') return b.volumes - a.volumes || b.works.length - a.works.length;
    return b.works.length - a.works.length || b.volumes - a.volumes;
  });
});

const selectedAuthor = computed(() => authors.value.find((author) => author.key === selectedKey.value) || filteredAuthors.value[0] || null);
const totalAttributedWorks = computed(() => authors.value.reduce((sum, author) => sum + author.works.length, 0));
const totalAuthorVolumes = computed(() => authors.value.reduce((sum, author) => sum + author.volumes, 0));
const topAuthor = computed(() => [...authors.value].sort((a, b) => b.works.length - a.works.length || b.volumes - a.volumes)[0] || null);

watch(filteredAuthors, (items) => {
  if (!items.length) return;
  if (!items.some((author) => author.key === selectedKey.value)) selectedKey.value = items[0].key;
}, { immediate: true });

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

function authorHue(name: string) {
  return [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 70 + 255;
}

function progress(author: AuthorProfile) {
  return author.volumes ? Math.round((author.read / author.volumes) * 100) : 0;
}

function selectAuthor(author: AuthorProfile) {
  selectedKey.value = author.key;
  document.querySelector('.author-spotlight')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
</script>

<template>
  <div class="authors-page">
    <header class="authors-hero">
      <div>
        <span class="authors-eyebrow"><Sparkles /> Archivo creativo</span>
        <h1>Autores</h1>
        <p>Descubre quién construye tu biblioteca y recorre su obra como una colección viva.</p>
      </div>
      <div class="authors-hero__mark"><Users /></div>
    </header>

    <section class="authors-overview" aria-label="Resumen de autores">
      <article><span><Users /></span><div><strong>{{ authors.length }}</strong><small>autores registrados</small></div></article>
      <article><span><BookOpen /></span><div><strong>{{ totalAttributedWorks }}</strong><small>obras con autor</small></div></article>
      <article><span><LibraryBig /></span><div><strong>{{ totalAuthorVolumes }}</strong><small>tomos catalogados</small></div></article>
      <article><span><Award /></span><div><strong>{{ topAuthor?.name || '—' }}</strong><small>mayor presencia</small></div></article>
    </section>

    <div class="authors-toolbar">
      <label class="authors-search">
        <Search />
        <input v-model="query" type="search" placeholder="Buscar autor, género o formato…" aria-label="Buscar autores" />
        <button v-if="query" type="button" aria-label="Limpiar búsqueda" @click="query = ''"><X /></button>
      </label>
      <select v-model="sortBy" aria-label="Ordenar autores">
        <option value="works">Más obras</option>
        <option value="volumes">Más tomos</option>
        <option value="rating">Mejor valorados</option>
        <option value="name">Nombre A–Z</option>
      </select>
      <span>{{ filteredAuthors.length }} {{ filteredAuthors.length === 1 ? 'autor' : 'autores' }}</span>
    </div>

    <div v-if="store.loading.value" class="authors-loading" aria-label="Cargando autores">
      <i v-for="index in 6" :key="index" />
    </div>

    <section v-else-if="!authors.length" class="authors-empty">
      <div><Users /><Sparkles /></div>
      <h2>Tu mapa de autores está esperando</h2>
      <p>Agrega el autor al editar cada obra. Esta sección organizará automáticamente sus títulos, tomos, géneros y progreso.</p>
      <RouterLink to="/library">Ir al Librero <ArrowRight /></RouterLink>
    </section>

    <section v-else-if="!filteredAuthors.length" class="authors-empty authors-empty--compact">
      <div><Search /></div><h2>No encontramos ese autor</h2><p>Prueba con otro nombre, género o formato.</p>
      <button type="button" @click="query = ''">Limpiar búsqueda</button>
    </section>

    <template v-else>
      <section v-if="selectedAuthor" class="author-spotlight" :style="{ '--author-hue': authorHue(selectedAuthor.name) }">
        <div class="author-spotlight__identity">
          <div class="author-avatar">{{ initials(selectedAuthor.name) }}</div>
          <div>
            <span>En foco</span>
            <h2>{{ selectedAuthor.name }}</h2>
            <p>{{ selectedAuthor.formats.join(' · ') || 'Colección personal' }}</p>
          </div>
        </div>

        <div class="author-spotlight__metrics">
          <div><strong>{{ selectedAuthor.works.length }}</strong><span>obras</span></div>
          <div><strong>{{ selectedAuthor.volumes }}</strong><span>tomos</span></div>
          <div><strong>{{ selectedAuthor.completed }}</strong><span>completadas</span></div>
          <div><strong>{{ selectedAuthor.averageRating ? selectedAuthor.averageRating.toFixed(1) : '—' }}</strong><span><Star /> valoración</span></div>
        </div>

        <div class="author-spotlight__progress">
          <header><span>Lectura de su colección</span><strong>{{ progress(selectedAuthor) }}%</strong></header>
          <div><i :style="{ width: `${progress(selectedAuthor)}%` }" /></div>
          <footer><span><BookCheck /> {{ selectedAuthor.read }} tomos leídos</span><span><Heart /> {{ selectedAuthor.favorites }} favoritas</span></footer>
        </div>

        <div class="author-spotlight__genres">
          <span v-for="genre in selectedAuthor.genres" :key="genre.name">{{ genre.name }} <b>{{ genre.count }}</b></span>
          <small v-if="!selectedAuthor.genres.length">Sin géneros registrados</small>
        </div>

        <RouterLink class="author-library-link" :to="{ path: '/library', query: { author: selectedAuthor.name } }">Ver en Librero <ArrowRight /></RouterLink>
      </section>

      <section class="authors-section">
        <header><div><span>Directorio</span><h2>Tu constelación de autores</h2></div><p>Selecciona una tarjeta para explorar su colección.</p></header>
        <div class="authors-grid">
          <button v-for="author in filteredAuthors" :key="author.key" type="button" class="author-card" :class="{ active: selectedAuthor?.key === author.key }" :style="{ '--author-hue': authorHue(author.name) }" @click="selectAuthor(author)">
            <span class="author-card__avatar">{{ initials(author.name) }}</span>
            <span class="author-card__info"><strong>{{ author.name }}</strong><small>{{ author.works.length }} {{ author.works.length === 1 ? 'obra' : 'obras' }} · {{ author.volumes }} tomos</small></span>
            <span class="author-card__covers">
              <template v-for="work in author.works.slice(0, 3)" :key="work.id">
                <img v-if="work.thumbnailPath || work.coverPath" :src="work.thumbnailPath || work.coverPath || undefined" alt="" loading="lazy" />
                <i v-else>{{ work.titulo.slice(0, 1) }}</i>
              </template>
            </span>
            <span class="author-card__meta"><span v-if="author.averageRating"><Star fill="currentColor" />{{ author.averageRating.toFixed(1) }}</span><span>{{ progress(author) }}% leído</span></span>
          </button>
        </div>
      </section>

      <section v-if="selectedAuthor" class="author-works">
        <header><div><span>Bibliografía personal</span><h2>Obras de {{ selectedAuthor.name }}</h2></div><span>{{ selectedAuthor.works.length }} títulos</span></header>
        <div class="author-work-rail">
          <button v-for="work in selectedAuthor.works" :key="work.id" type="button" @click="openWorkModal?.(work)">
            <span class="author-work-cover">
              <img v-if="work.thumbnailPath || work.coverPath" :src="work.thumbnailPath || work.coverPath || undefined" :alt="`Portada de ${work.titulo}`" loading="lazy" />
              <i v-else><BookOpen /></i>
              <em v-if="work.favorite"><Heart fill="currentColor" /></em>
            </span>
            <strong>{{ work.titulo }}</strong>
            <small>{{ FORMATS.find((format) => format.value === work.tipo)?.label }} · {{ work.volumes.length }} tomos</small>
          </button>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.authors-page{display:grid;gap:20px}.authors-hero{position:relative;min-height:180px;display:flex;align-items:center;justify-content:space-between;overflow:hidden;padding:32px 38px;border:1px solid rgba(171,117,255,.2);border-radius:18px;background:radial-gradient(circle at 78% 35%,rgba(168,85,247,.23),transparent 25%),linear-gradient(125deg,#161022,#0a0c13 62%);box-shadow:0 24px 70px rgba(0,0,0,.22)}.authors-hero:after{content:"";position:absolute;right:-55px;bottom:-100px;width:280px;height:280px;border:1px solid rgba(192,132,252,.12);border-radius:50%;box-shadow:0 0 0 35px rgba(192,132,252,.025),0 0 0 75px rgba(192,132,252,.018)}.authors-eyebrow{display:flex;align-items:center;gap:7px;margin-bottom:9px;color:#c9a8ff;font-size:9px;font-weight:850;letter-spacing:.16em;text-transform:uppercase}.authors-eyebrow svg{width:13px}.authors-hero h1{margin:0 0 7px;font-size:34px;letter-spacing:-.035em}.authors-hero p{max-width:520px;margin:0;color:#aaa1b8;font-size:12px;line-height:1.6}.authors-hero__mark{position:relative;z-index:1;width:82px;height:82px;display:grid;place-items:center;color:#dec8ff;background:linear-gradient(145deg,rgba(168,85,247,.24),rgba(91,33,182,.1));border:1px solid rgba(216,180,254,.27);border-radius:25px;box-shadow:0 20px 55px rgba(91,33,182,.24);transform:rotate(4deg)}.authors-hero__mark svg{width:38px;height:38px}.authors-overview{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.authors-overview article{min-width:0;display:flex;align-items:center;gap:11px;padding:14px 15px;background:var(--surface);border:1px solid var(--border);border-radius:12px}.authors-overview article>span{flex:0 0 34px;height:34px;display:grid;place-items:center;color:#b989ff;background:rgba(159,107,255,.09);border:1px solid rgba(159,107,255,.16);border-radius:10px}.authors-overview svg{width:16px}.authors-overview strong{display:block;overflow:hidden;color:var(--text);font-size:17px;line-height:1.2;text-overflow:ellipsis;white-space:nowrap}.authors-overview small{display:block;margin-top:3px;color:var(--text-faint);font-size:8.5px}.authors-toolbar{display:flex;align-items:center;gap:10px}.authors-search{min-width:0;max-width:520px;flex:1;display:flex;align-items:center;gap:8px;height:40px;padding:0 11px;background:var(--surface);border:1px solid var(--border);border-radius:10px}.authors-search:focus-within{border-color:rgba(168,85,247,.65);box-shadow:0 0 0 3px rgba(168,85,247,.1)}.authors-search>svg{width:15px;color:var(--text-faint)}.authors-search input{min-width:0;flex:1;color:var(--text);background:transparent;border:0;outline:0;font:11px inherit}.authors-search button{display:grid;place-items:center;padding:3px;color:var(--text-faint);background:transparent;border:0;cursor:pointer}.authors-search button svg{width:13px}.authors-toolbar select{height:40px;padding:0 31px 0 11px;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:10px;font:10.5px inherit}.authors-toolbar>span{margin-left:auto;color:var(--text-faint);font-size:9.5px}.authors-loading{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.authors-loading i{height:130px;border-radius:14px;background:linear-gradient(90deg,var(--surface),rgba(159,107,255,.08),var(--surface));background-size:220%;animation:author-loading 1.3s infinite}@keyframes author-loading{to{background-position:-220%}}.authors-empty{min-height:390px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:35px;text-align:center;background:radial-gradient(circle,rgba(159,107,255,.09),transparent 48%),var(--surface);border:1px dashed var(--border-strong);border-radius:18px}.authors-empty>div{position:relative;width:76px;height:76px;display:grid;place-items:center;margin-bottom:18px;color:#b989ff;background:rgba(159,107,255,.1);border:1px solid rgba(159,107,255,.22);border-radius:23px}.authors-empty>div svg{width:30px}.authors-empty>div svg+svg{position:absolute;top:-6px;right:-7px;width:19px;color:#ead8ff}.authors-empty h2{margin:0 0 7px;font-size:18px}.authors-empty p{max-width:480px;margin:0 0 17px;color:var(--text-faint);font-size:11px;line-height:1.6}.authors-empty a,.authors-empty button{display:flex;align-items:center;gap:7px;padding:10px 14px;color:#fff;text-decoration:none;background:var(--accent-gradient);border:1px solid rgba(216,180,254,.25);border-radius:9px;font:750 10.5px inherit}.authors-empty a svg{width:14px}.authors-empty--compact{min-height:260px}.author-spotlight{position:relative;display:grid;grid-template-columns:minmax(220px,1.1fr) 1.4fr;gap:18px;overflow:hidden;padding:25px;background:radial-gradient(circle at 10% 30%,hsla(var(--author-hue),75%,56%,.15),transparent 29%),linear-gradient(125deg,#14101e,#0b0d14 58%);border:1px solid hsla(var(--author-hue),75%,68%,.23);border-radius:18px;box-shadow:0 25px 70px rgba(0,0,0,.22)}.author-spotlight__identity{display:flex;align-items:center;gap:15px}.author-avatar{flex:0 0 70px;height:70px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,hsla(var(--author-hue),82%,65%,.75),hsla(calc(var(--author-hue) - 35),75%,35%,.78));border:1px solid rgba(255,255,255,.18);border-radius:22px;box-shadow:0 16px 38px hsla(var(--author-hue),80%,40%,.22);font-size:20px;font-weight:850}.author-spotlight__identity span,.authors-section>header span,.author-works>header div>span{color:#b989ff;font-size:8px;font-weight:850;letter-spacing:.14em;text-transform:uppercase}.author-spotlight__identity h2{margin:4px 0 3px;font-size:22px}.author-spotlight__identity p{margin:0;color:var(--text-faint);font-size:9.5px}.author-spotlight__metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.author-spotlight__metrics>div{padding:11px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.055);border-radius:10px}.author-spotlight__metrics strong{display:block;font-size:17px}.author-spotlight__metrics span{display:flex;align-items:center;gap:4px;margin-top:3px;color:var(--text-faint);font-size:8px}.author-spotlight__metrics svg{width:9px}.author-spotlight__progress{align-self:end}.author-spotlight__progress header,.author-spotlight__progress footer{display:flex;align-items:center;justify-content:space-between;color:var(--text-faint);font-size:8.5px}.author-spotlight__progress header strong{color:#d9c3ff}.author-spotlight__progress>div{height:5px;margin:8px 0;overflow:hidden;background:rgba(255,255,255,.06);border-radius:999px}.author-spotlight__progress i{display:block;height:100%;background:linear-gradient(90deg,#7c3aed,#c084fc);border-radius:inherit}.author-spotlight__progress footer{justify-content:flex-start;gap:14px}.author-spotlight__progress footer span{display:flex;align-items:center;gap:4px}.author-spotlight__progress footer svg{width:10px}.author-spotlight__genres{display:flex;align-items:center;flex-wrap:wrap;gap:6px}.author-spotlight__genres span{padding:5px 8px;color:#d7c1fb;background:rgba(159,107,255,.08);border:1px solid rgba(159,107,255,.16);border-radius:999px;font-size:8.5px}.author-spotlight__genres b{margin-left:3px;color:#8d77ae}.author-spotlight__genres small{color:var(--text-faint)}.author-library-link{position:absolute;right:25px;bottom:23px;display:flex;align-items:center;gap:7px;color:#ceb6f8;font-size:9px;font-weight:750;text-decoration:none}.author-library-link svg{width:13px;transition:transform .18s}.author-library-link:hover svg{transform:translateX(3px)}.authors-section,.author-works{padding:21px;background:var(--surface);border:1px solid var(--border);border-radius:16px}.authors-section>header,.author-works>header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:16px}.authors-section>header h2,.author-works>header h2{margin:4px 0 0;font-size:15px}.authors-section>header p,.author-works>header>span{margin:0;color:var(--text-faint);font-size:9px}.authors-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.author-card{min-width:0;display:grid;grid-template-columns:45px minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px;text-align:left;color:var(--text);background:rgba(255,255,255,.012);border:1px solid var(--border);border-radius:12px;cursor:pointer;transition:transform .18s,border-color .18s,background .18s,box-shadow .18s}.author-card:hover{transform:translateY(-2px);background:rgba(159,107,255,.045);border-color:hsla(var(--author-hue),75%,65%,.3);box-shadow:0 13px 32px rgba(0,0,0,.2)}.author-card.active{background:linear-gradient(125deg,hsla(var(--author-hue),75%,50%,.11),rgba(159,107,255,.035));border-color:hsla(var(--author-hue),75%,68%,.42)}.author-card__avatar{width:45px;height:45px;display:grid;place-items:center;color:#fff;background:linear-gradient(145deg,hsla(var(--author-hue),80%,62%,.68),hsla(calc(var(--author-hue) - 35),70%,34%,.72));border-radius:13px;font-size:12px;font-weight:850}.author-card__info{min-width:0}.author-card__info strong,.author-card__info small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.author-card__info strong{font-size:11px}.author-card__info small{margin-top:4px;color:var(--text-faint);font-size:8px}.author-card__covers{height:38px;display:flex;align-items:center;padding-left:8px}.author-card__covers img,.author-card__covers i{width:27px;height:38px;display:grid;place-items:center;margin-left:-8px;object-fit:cover;color:#a990cb;background:#21182d;border:2px solid #11131a;border-radius:4px;font-size:8px;font-style:normal}.author-card__meta{grid-column:2/-1;display:flex;align-items:center;justify-content:space-between;color:var(--text-faint);font-size:8px}.author-card__meta span{display:flex;align-items:center;gap:3px}.author-card__meta svg{width:9px;color:#fbbf24}.author-work-rail{display:grid;grid-template-columns:repeat(auto-fill,minmax(115px,1fr));gap:12px}.author-work-rail>button{min-width:0;padding:0;text-align:left;color:var(--text);background:transparent;border:0;cursor:pointer}.author-work-cover{position:relative;display:block;aspect-ratio:2/3;overflow:hidden;margin-bottom:8px;background:linear-gradient(145deg,#1c1527,#0a0d14);border:1px solid var(--border);border-radius:9px;transition:transform .18s,box-shadow .18s}.author-work-rail>button:hover .author-work-cover{transform:translateY(-3px);box-shadow:0 15px 32px rgba(0,0,0,.35)}.author-work-cover img{width:100%;height:100%;object-fit:cover}.author-work-cover>i{height:100%;display:grid;place-items:center;color:#8f72bd}.author-work-cover>i svg{width:25px}.author-work-cover em{position:absolute;top:6px;right:6px;width:23px;height:23px;display:grid;place-items:center;color:#f0a9d9;background:rgba(10,8,14,.82);border-radius:7px}.author-work-cover em svg{width:12px}.author-work-rail>button>strong,.author-work-rail>button>small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.author-work-rail>button>strong{font-size:10px}.author-work-rail>button>small{margin-top:4px;color:var(--text-faint);font-size:8px}@media(max-width:1100px){.authors-overview{grid-template-columns:repeat(2,1fr)}.authors-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.authors-hero{min-height:150px;padding:25px}.authors-hero__mark{display:none}.authors-overview{grid-template-columns:1fr 1fr}.authors-toolbar{align-items:stretch;flex-direction:column}.authors-search{max-width:none;width:100%}.authors-toolbar select{width:100%}.authors-toolbar>span{margin:0}.author-spotlight{grid-template-columns:1fr;padding:20px}.author-library-link{position:static;justify-self:start}.authors-grid{grid-template-columns:1fr}.author-work-rail{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:480px){.authors-hero h1{font-size:29px}.authors-overview{grid-template-columns:1fr}.author-spotlight__metrics{grid-template-columns:1fr 1fr}.author-work-rail{grid-template-columns:repeat(2,minmax(0,1fr))}.authors-section,.author-works{padding:15px}.author-card__covers{display:none}.author-card{grid-template-columns:42px minmax(0,1fr)}.author-card__meta{grid-column:2}}
</style>
