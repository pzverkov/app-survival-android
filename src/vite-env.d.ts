/// <reference types="vite/client" />

// Extend Vite ImportMetaEnv with our build-time variables.
// We also explicitly include common Vite fields so typechecking works even if
// vite/client types are not resolved in some environments.
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;

  readonly VITE_COMMIT_SHA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
