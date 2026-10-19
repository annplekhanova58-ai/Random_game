/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIXED_WINNER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
