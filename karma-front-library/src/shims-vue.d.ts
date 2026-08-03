declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface Window {
  karmaDesktop?: {
    getConnection(): Promise<{ mode: 'local' | 'remote'; url: string }>;
    setConnection(url: string): Promise<{ mode: 'local' | 'remote'; url: string }>;
    platform: string;
  };
}
