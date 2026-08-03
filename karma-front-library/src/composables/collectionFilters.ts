import type { Demographic, FormatType, Obra, ReadingStatus, VolumeOwnership } from '../api/client';

export type OwnershipFilter = VolumeOwnership | 'ALL';

export interface CollectionFiltersState {
  query: string;
  format: FormatType | 'ALL';
  demographic: Demographic | 'ALL';
  genres: string[];
  publisher: string;
  status: ReadingStatus | 'ALL';
  ownership: OwnershipFilter;
  author: string;
  language: string;
  yearMin: string;
  yearMax: string;
  favoritesOnly: boolean;
}

export function createCollectionFilters(seed: Partial<CollectionFiltersState> = {}): CollectionFiltersState {
  return {
    query: '', format: 'ALL', demographic: 'ALL', genres: [], publisher: '', status: 'ALL',
    ownership: 'ALL', author: '', language: '', yearMin: '', yearMax: '', favoritesOnly: false,
    ...seed,
  };
}

export function matchesCollectionFilters(obra: Obra, filters: CollectionFiltersState) {
  const query = filters.query.trim().toLocaleLowerCase('es');
  const searchable = [obra.titulo, obra.originalTitle, obra.autor, obra.publisher, ...obra.genres, ...obra.tags]
    .filter(Boolean).join(' ').toLocaleLowerCase('es');
  if (query && !searchable.includes(query)) return false;
  if (filters.format !== 'ALL' && obra.tipo !== filters.format) return false;
  if (filters.demographic !== 'ALL' && obra.demographic !== filters.demographic) return false;
  if (filters.genres.length && !filters.genres.every((genre) => obra.genres.includes(genre))) return false;
  if (filters.publisher && obra.publisher !== filters.publisher) return false;
  if (filters.status !== 'ALL' && obra.status !== filters.status) return false;
  if (filters.ownership !== 'ALL' && !obra.volumes.some((volume) => volume.ownership === filters.ownership)) return false;
  if (filters.author && !(obra.autor || '').toLocaleLowerCase('es').includes(filters.author.toLocaleLowerCase('es'))) return false;
  if (filters.language && obra.language !== filters.language) return false;
  if (filters.yearMin && (obra.releaseYear || 0) < Number(filters.yearMin)) return false;
  if (filters.yearMax && (obra.releaseYear || 9999) > Number(filters.yearMax)) return false;
  if (filters.favoritesOnly && !obra.favorite) return false;
  return true;
}

export function hasActiveCollectionFilters(filters: CollectionFiltersState) {
  return Boolean(filters.query || filters.format !== 'ALL' || filters.demographic !== 'ALL' || filters.genres.length ||
    filters.publisher || filters.status !== 'ALL' || filters.ownership !== 'ALL' || filters.author || filters.language ||
    filters.yearMin || filters.yearMax || filters.favoritesOnly);
}
