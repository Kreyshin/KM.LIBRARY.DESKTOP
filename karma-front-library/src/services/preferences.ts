const READER_POPOUT_KEY = 'karma_reader_popout';

export function getReaderPopoutPreference() {
  const value = localStorage.getItem(READER_POPOUT_KEY);
  return value === null ? true : value === 'true';
}

export function setReaderPopoutPreference(value: boolean) {
  localStorage.setItem(READER_POPOUT_KEY, String(value));
}
