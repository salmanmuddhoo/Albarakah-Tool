/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STAFF_PASSCODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
