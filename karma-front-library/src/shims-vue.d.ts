declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Window {
  karmaDesktop?: {
    getConnection(): Promise<{ mode: 'local' | 'remote'; url: string }>;
    setConnection(url: string): Promise<{ mode: 'local' | 'remote'; url: string }>;
    getStorageInfo(): Promise<{ dataDir: string; defaultDataDir: string; isCustom: boolean; files: number; bytes: number }>;
    selectStorageDirectory(): Promise<{ canceled: boolean; path: string }>;
    moveStorage(directory: string): Promise<{ from: string; to: string; moved: boolean; files: number; bytes: number }>;
    platform: string;
  };
}
