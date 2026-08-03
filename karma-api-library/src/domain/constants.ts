export const FORMAT_TYPES = ['BOOK', 'MANGA', 'MANHWA', 'MANHUA', 'COMIC'] as const;
export type FormatType = (typeof FORMAT_TYPES)[number];
export const READING_STATUSES = ['READING', 'COMPLETED', 'ON_HOLD', 'WISHLIST', 'DROPPED', 'NOT_STARTED'] as const;
export type ReadingStatus = (typeof READING_STATUSES)[number];
export const VOLUME_STATUSES = ['OWNED', 'READING', 'NOT_READ'] as const;
export type VolumeStatus = (typeof VOLUME_STATUSES)[number];
export const VOLUME_OWNERSHIPS = ['PHYSICAL', 'DIGITAL', 'NOT_OWNED'] as const;
export type VolumeOwnership = (typeof VOLUME_OWNERSHIPS)[number];
export const COVER_EDITION_TYPES = ['STANDARD', 'SPECIAL', 'LIMITED', 'OMNIBUS', 'COLLECTOR', 'OTHER'] as const;
export type CoverEditionType = (typeof COVER_EDITION_TYPES)[number];
export const READING_UNITS = ['CHAPTER', 'PAGE', 'PERCENT'] as const;
export type ReadingUnit = (typeof READING_UNITS)[number];
export const DEMOGRAPHICS = ['KODOMO', 'SHONEN', 'SHOJO', 'SEINEN', 'JOSEI', 'GENERAL'] as const;
export type Demographic = (typeof DEMOGRAPHICS)[number];

export function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch { return []; }
}

export function stringifyStringArray(value: string[] | undefined): string | undefined {
  return value === undefined ? undefined : JSON.stringify(value.map((item) => item.trim()).filter(Boolean));
}
