export type FormatType = 'BOOK' | 'MANGA' | 'MANHWA' | 'MANHUA' | 'COMIC';
export type ReadingStatus = 'READING' | 'COMPLETED' | 'ON_HOLD' | 'WISHLIST' | 'DROPPED' | 'NOT_STARTED';
export type VolumeStatus = 'OWNED' | 'READING' | 'NOT_READ';
export type VolumeOwnership = 'PHYSICAL' | 'DIGITAL' | 'NOT_OWNED';
export type CoverEditionType = 'STANDARD' | 'SPECIAL' | 'LIMITED' | 'OMNIBUS' | 'COLLECTOR' | 'OTHER';
export type ReadingUnit = 'CHAPTER' | 'PAGE' | 'PERCENT';
export type Demographic = 'KODOMO' | 'SHONEN' | 'SHOJO' | 'SEINEN' | 'JOSEI' | 'GENERAL';

export const FORMATS: { value: FormatType; label: string }[] = [
  { value: 'BOOK', label: 'Libro' },
  { value: 'MANGA', label: 'Manga' },
  { value: 'MANHWA', label: 'Manhwa' },
  { value: 'MANHUA', label: 'Manhua' },
  { value: 'COMIC', label: 'Cómic' },
];

// Paleta por categoría — fuente única de verdad. Cualquier componente que muestre
// un formato (Home, Library, Shelves, WorkCard) debe leer de aquí, nunca hardcodear
// el color, para que no se vuelva a desalinear con el resto del sistema.
export const FORMAT_COLORS: Record<FormatType, { color: string; bg: string; glow: string; glyph: string }> = {
  BOOK:   { color: 'var(--fmt-book)',   bg: 'rgba(52,211,153,0.15)',  glow: 'var(--fmt-book-glow)',   glyph: '' },
  MANGA:  { color: 'var(--fmt-manga)',  bg: 'rgba(34,211,238,0.15)',  glow: 'var(--fmt-manga-glow)',  glyph: '漫画' },
  MANHWA: { color: 'var(--fmt-manhwa)', bg: 'rgba(167,139,250,0.18)', glow: 'var(--fmt-manhwa-glow)', glyph: '만화' },
  MANHUA: { color: 'var(--fmt-manhua)', bg: 'rgba(251,191,36,0.15)',  glow: 'var(--fmt-manhua-glow)', glyph: '漫画' },
  COMIC:  { color: 'var(--fmt-comic)',  bg: 'rgba(244,114,182,0.15)', glow: 'var(--fmt-comic-glow)',  glyph: '' },
};

export const STATUSES: { value: ReadingStatus; label: string }[] = [
  { value: 'READING', label: 'Leyendo' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'ON_HOLD', label: 'En pausa' },
  { value: 'WISHLIST', label: 'Lista de deseos' },
  { value: 'DROPPED', label: 'Abandonado' },
  { value: 'NOT_STARTED', label: 'Sin empezar' },
];

export const VOLUME_STATUSES: { value: VolumeStatus; label: string }[] = [
  { value: 'OWNED', label: 'Poseído' },
  { value: 'READING', label: 'Leyendo' },
  { value: 'NOT_READ', label: 'No leído' },
];

export const VOLUME_OWNERSHIP: { value: VolumeOwnership; label: string }[] = [
  { value: 'PHYSICAL', label: 'Físico' },
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'NOT_OWNED', label: 'No adquirido' },
];

export const COVER_EDITION_TYPES: { value: CoverEditionType; label: string }[] = [
  { value: 'STANDARD', label: 'Estándar' }, { value: 'SPECIAL', label: 'Especial' },
  { value: 'LIMITED', label: 'Limitada' }, { value: 'OMNIBUS', label: 'Ómnibus' },
  { value: 'COLLECTOR', label: 'Coleccionista' }, { value: 'OTHER', label: 'Otra' },
];

export const DEMOGRAPHICS: { value: Demographic; label: string; description: string }[] = [
  { value: 'KODOMO', label: 'Kodomo', description: 'Público infantil' },
  { value: 'SHONEN', label: 'Shōnen', description: 'Público juvenil masculino' },
  { value: 'SHOJO', label: 'Shōjo', description: 'Público juvenil femenino' },
  { value: 'SEINEN', label: 'Seinen', description: 'Público adulto masculino' },
  { value: 'JOSEI', label: 'Josei', description: 'Público adulto femenino' },
  { value: 'GENERAL', label: 'General', description: 'Sin audiencia específica' },
];

export const LANGUAGES = ['Español', 'Inglés', 'Japonés', 'Coreano', 'Chino', 'Otro'];

export const SUGGESTED_GENRES = [
  'Fantasía', 'Acción', 'Aventura', 'Ciencia Ficción', 'Drama', 'Terror', 'Comedia',
  'Romance', 'Vida Cotidiana', 'Histórico', 'Seinen', 'Shounen', 'Misterio', 'Otro',
];

export interface VolumeCoverVariant {
  id: string;
  path: string;
  language: string | null;
  publisher: string | null;
  edition: string | null;
  country: string | null;
  isbn: string | null;
  publishDate: string | null;
  spinePath: string | null;
  thumbnailPath: string | null;
  editionType: CoverEditionType;
  label: string | null;
  isPrimary: boolean;
  createdAt?: string;
}

export interface Volume {
  id: string;
  number: number;
  status: VolumeStatus;
  read: boolean;
  chapters: string | null;
  startDate: string | null;
  finishDate: string | null;
  notes: string | null;
  coverPath: string | null;
  thumbnailPath: string | null;
  spinePath: string | null;
  title: string | null;
  isbn: string | null;
  publisher: string | null;
  publishDate: string | null;
  ownership: VolumeOwnership;
  alternateCovers: VolumeCoverVariant[];
}

export interface Obra {
  id: string;
  titulo: string;
  originalTitle: string | null;
  autor: string | null;
  illustrator: string | null;
  publisher: string | null;
  releaseYear: number | null;
  tipo: FormatType;
  demographic: Demographic | null;
  genres: string[];
  language: string | null;
  status: ReadingStatus;
  currentVolume: number | null;
  currentChapter: number | null;
  totalChapters: number | null;
  tags: string[];
  rating: number | null;
  description: string | null;
  personalReview: string | null;
  notes: string | null;
  favorite: boolean;
  coverPath: string | null;
  thumbnailPath: string | null;
  createdAt: string;
  volumes: Volume[];
}

export interface Reader {
  id: string;
  email: string;
  displayName: string;
  bio: string | null;
  location: string | null;
  favoriteGenres: string[];
  avatarUrl: string | null;
  readingGoal: number;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  color?: string;
  isKids?: boolean;
  position?: number;
}

export interface ReaderStats {
  totalWorks: number;
  totalVolumes: number;
  readVolumes: number;
  completed: number;
  reading: number;
  favorites: number;
  completedThisYear: number;
  averageRating: number;
  topGenres: { name: string; count: number }[];
}

export interface ReaderProfile { reader: Reader; stats: ReaderStats; }
export interface AuthResponse { token: string; expiresAt: string; reader: Reader; }

export interface ReadingSession {
  id: string; occurredAt: string; minutes: number; startProgress: number | null; endProgress: number | null;
  unit: ReadingUnit; rereadNumber: number; completed: boolean; notes: string | null; createdAt: string;
  obraId: string; volumeId: string | null;
  obra: Pick<Obra, 'id' | 'titulo' | 'coverPath' | 'tipo'>;
  volume: (Pick<Volume, 'id' | 'number' | 'title' | 'coverPath' | 'alternateCovers'>) | null;
}

export interface ReadingStats {
  totalSessions: number; totalMinutes: number; pagesRead: number; chaptersRead: number; completedSessions: number;
  thisMonth: number; currentStreak: number; longestStreak: number; activity: { date: string; minutes: number; sessions: number }[];
}

export interface ShelfItem { id: string; position: number; obraId: string; obra: Obra; }
export interface Shelf { id: string; name: string; description: string | null; color: string; smartType: string | null; items: ShelfItem[]; }
export interface ShelvesResponse { custom: Shelf[]; smart: Shelf[]; }
export interface Genre { id: string; name: string; slug: string; isStandard: boolean; createdAt: string; }

export type DigitalMediaType = 'EPUB' | 'PDF' | 'CBZ' | 'IMAGE_FOLDER';
export interface DigitalFile {
  id: string; label: string | null; originalName: string; storedPath: string;
  mediaType: DigitalMediaType; format: string; sizeBytes: number; pageCount: number | null;
  manifestJson: string; createdAt: string; volumeId: string;
}
export interface DigitalProgress { currentPage: number; totalPages: number | null; percent: number; locator: string | null; }

export interface BackupItem { name: string; sizeBytes: number; createdAt: string; }
export interface BackupSettings { autoEnabled: boolean; intervalHours: number; retention: number; lastRunAt: string | null; }
export interface BackupsResponse { items: BackupItem[]; settings: BackupSettings; }
export interface BackupVerifyResult { ok: boolean; issues: string[]; checkedAt: string; entryCount: number; }

export type ObraInput = Partial<Omit<Obra, 'id' | 'createdAt' | 'volumes' | 'coverPath'>> & {
  totalVolumes?: number;
};

const BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('karma_reader_token');
  const res = await fetch(`${BASE}${path}`, {
    headers: options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
      : { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = text || res.statusText;
    if (res.status === 413) {
      message = 'La imagen supera el límite permitido de 8 MB.';
    } else if (res.status === 502 || res.status === 503) {
      message = 'El servicio de imágenes no está disponible. Intenta nuevamente en unos segundos.';
    }
    try {
      const parsed = JSON.parse(text);
      message = Array.isArray(parsed.message) ? parsed.message.join(' ') : parsed.message || message;
    } catch { /* la respuesta no era JSON */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (displayName: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ displayName, email, password }) }),
  profiles: () => request<Reader[]>('/auth/profiles'),
  createProfile: (displayName: string, color: string, isKids = false) =>
    request<Reader>('/auth/profiles', { method: 'POST', body: JSON.stringify({ displayName, color, isKids }) }),
  switchProfile: (profileId: string) => request<AuthResponse>(`/auth/profiles/${profileId}/switch`, { method: 'POST' }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  readerProfile: () => request<ReaderProfile>('/readers/me'),
  updateReaderProfile: (data: Partial<Pick<Reader, 'displayName' | 'bio' | 'location' | 'favoriteGenres' | 'avatarUrl' | 'readingGoal'>>) =>
    request<ReaderProfile>('/readers/me', { method: 'PATCH', body: JSON.stringify(data) }),
  list: () => request<Obra[]>('/obras'),
  get: (id: string) => request<Obra>(`/obras/${id}`),
  create: (data: ObraInput) => request<Obra>('/obras', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: ObraInput) =>
    request<Obra>(`/obras/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ deleted: boolean }>(`/obras/${id}`, { method: 'DELETE' }),
  resizeVolumes: (id: string, total: number) =>
    request<Obra>(`/obras/${id}/total-volumes`, { method: 'PATCH', body: JSON.stringify({ total }) }),
  addVolume: (id: string) => request<Obra>(`/obras/${id}/volumes`, { method: 'POST' }),
  removeVolume: (id: string, number: number) =>
    request<Obra>(`/obras/${id}/volumes/${number}`, { method: 'DELETE' }),
  updateVolume: (id: string, number: number, data: Partial<Volume>) =>
    request<Volume>(`/obras/${id}/volumes/${number}`, { method: 'PATCH', body: JSON.stringify(data) }),
  uploadObraCover: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Obra>(`/obras/${id}/cover`, { method: 'POST', body: form });
  },
  uploadVolumeCover: (id: string, number: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Volume>(`/obras/${id}/volumes/${number}/cover`, { method: 'POST', body: form });
  },
  uploadVolumeSpine: (id: string, number: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Volume>(`/obras/${id}/volumes/${number}/spine`, { method: 'POST', body: form });
  },
  uploadVolumeAlternateCover: (
    id: string,
    number: number,
    file: File,
    metadata: {
      language?: string;
      publisher?: string;
      edition?: string;
      country?: string;
      isbn?: string;
      publishDate?: string;
      editionType?: CoverEditionType;
      label?: string;
      isPrimary?: boolean;
    } = {},
  ) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        form.append(key, String(value));
      }
    });

    return request<Volume>(
      `/obras/${id}/volumes/${number}/alternate-covers`,
      { method: 'POST', body: form },
    );
  },
  updateVolumeAlternateCover: (
    id: string,
    number: number,
    coverId: string,
    data: Partial<Omit<VolumeCoverVariant, 'id' | 'path' | 'createdAt'>>,
  ) =>
    request<Volume>(
      `/obras/${id}/volumes/${number}/alternate-covers/${coverId}`,
      { method: 'PATCH', body: JSON.stringify(data) },
    ),
  removeVolumeAlternateCover: (
    id: string,
    number: number,
    coverId: string,
  ) =>
    request<Volume>(
      `/obras/${id}/volumes/${number}/alternate-covers/${coverId}`,
      { method: 'DELETE' },
    ),
  replaceVolumeAlternateCover: (id: string, number: number, coverId: string, file: File) => {
    const form = new FormData(); form.append('file', file);
    return request<Volume>(`/obras/${id}/volumes/${number}/alternate-covers/${coverId}/image`, { method: 'POST', body: form });
  },
  uploadVolumeAlternateSpine: (id: string, number: number, coverId: string, file: File) => {
    const form = new FormData(); form.append('file', file);
    return request<Volume>(`/obras/${id}/volumes/${number}/alternate-covers/${coverId}/spine`, { method: 'POST', body: form });
  },
  setPrimaryVolumeCover: (
    id: string,
    number: number,
    coverId: string | null,
  ) =>
    request<Volume>(
      `/obras/${id}/volumes/${number}/primary-cover`,
      {
        method: 'PATCH',
        body: JSON.stringify({ coverId }),
      },
    ),
  listReadingSessions: () => request<ReadingSession[]>('/reading-sessions'),
  readingStats: () => request<ReadingStats>('/reading-sessions/stats'),
  createReadingSession: (data: Partial<ReadingSession> & { obraId: string }) => request<ReadingSession>('/reading-sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateReadingSession: (id: string, data: Partial<ReadingSession>) => request<ReadingSession>(`/reading-sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeReadingSession: (id: string) => request<{ deleted: boolean }>(`/reading-sessions/${id}`, { method: 'DELETE' }),
  listShelves: () => request<ShelvesResponse>('/shelves'),
  listGenres: () => request<Genre[]>('/genres'),
  createGenre: (name: string) => request<Genre>('/genres', { method: 'POST', body: JSON.stringify({ name }) }),
  createShelf: (data: { name: string; description?: string; color?: string }) => request<Shelf>('/shelves', { method: 'POST', body: JSON.stringify(data) }),
  updateShelf: (id: string, data: Partial<Pick<Shelf, 'name' | 'description' | 'color'>>) => request<Shelf>(`/shelves/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  removeShelf: (id: string) => request<{ deleted: boolean }>(`/shelves/${id}`, { method: 'DELETE' }),
  addShelfItem: (id: string, obraId: string) => request<Shelf>(`/shelves/${id}/items`, { method: 'POST', body: JSON.stringify({ obraId }) }),
  removeShelfItem: (id: string, obraId: string) => request<Shelf>(`/shelves/${id}/items/${obraId}`, { method: 'DELETE' }),
  reorderShelfItems: (id: string, obraIds: string[]) => request<Shelf>(`/shelves/${id}/reorder`, { method: 'PATCH', body: JSON.stringify({ obraIds }) }),
  listDigitalFiles: (obraId: string, number: number) => request<DigitalFile[]>(`/obras/${obraId}/volumes/${number}/digital-files`),
  uploadDigitalFiles: (obraId: string, number: number, files: File[], label?: string) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    if (label) form.append('label', label);
    return request<DigitalFile>(`/obras/${obraId}/volumes/${number}/digital-files`, { method: 'POST', body: form });
  },
  removeDigitalFile: (obraId: string, number: number, fileId: string) =>
    request<{ deleted: boolean }>(`/obras/${obraId}/volumes/${number}/digital-files/${fileId}`, { method: 'DELETE' }),
  appendDigitalPages: (obraId: string, number: number, fileId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return request<DigitalFile>(`/obras/${obraId}/volumes/${number}/digital-files/${fileId}/pages`, { method: 'POST', body: form });
  },
  reorderDigitalPages: (obraId: string, number: number, fileId: string, order: string[]) =>
    request<DigitalFile>(`/obras/${obraId}/volumes/${number}/digital-files/${fileId}/pages/order`, { method: 'PUT', body: JSON.stringify({ order }) }),
  getDigitalProgress: (obraId: string, number: number, fileId: string) =>
    request<DigitalProgress>(`/obras/${obraId}/volumes/${number}/digital-files/${fileId}/progress`),
  saveDigitalProgress: (obraId: string, number: number, fileId: string, data: Partial<DigitalProgress>) =>
    request<DigitalProgress>(`/obras/${obraId}/volumes/${number}/digital-files/${fileId}/progress`, { method: 'PUT', body: JSON.stringify(data) }),
  createBackup: () => request<{ name: string; downloadUrl: string }>('/system/backups', { method: 'POST' }),
  listBackups: () => request<BackupsResponse>('/system/backups'),
  updateBackupSettings: (data: Partial<BackupSettings>) => request<BackupSettings>('/system/backups/settings', { method: 'PUT', body: JSON.stringify(data) }),
  verifyBackup: (name: string) => request<BackupVerifyResult>(`/system/backups/${encodeURIComponent(name)}/verify`),
  restoreBackupByName: (name: string) => request<{ restored: boolean; restarting: boolean }>(`/system/backups/${encodeURIComponent(name)}/restore`, { method: 'POST' }),
  removeBackup: (name: string) => request<{ deleted: boolean }>(`/system/backups/${encodeURIComponent(name)}`, { method: 'DELETE' }),
  restoreBackup: (file: File) => { const form = new FormData(); form.append('file', file); return request<{ restored: boolean; restarting: boolean }>('/system/restore', { method: 'POST', body: form }); },
  downloadBackup: async (downloadUrl: string) => {
    const token = localStorage.getItem('karma_reader_token');
    const response = await fetch(downloadUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error('No se pudo descargar el respaldo.');
    return response.blob();
  },
};
