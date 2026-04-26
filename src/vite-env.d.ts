/// <reference types="vite/client" />

// Extend Vite ImportMetaEnv with our build-time variables. We also explicitly
// include common Vite fields so typechecking works even if vite/client types
// are not resolved in some environments.
interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;

  readonly VITE_COMMIT_SHA?: string;
  readonly VITE_E2E?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// e2e-only: Playwright sets VITE_E2E=1 and the app stamps these globals on
// `window` so test specs can inspect / drive the simulation directly.
// `__E2E__` is the deterministic-mode flag, the others are debug surfaces.
declare global {
  interface Window {
    __E2E__?: boolean;
    __SIM__?: unknown;
    __VIEW__?: unknown;
    __PULSE__?: unknown;
    __i18nMissing?: Set<string>;
    requestIdleCallback?: (
      cb: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
      opts?: { timeout: number }
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  }

  // View Transitions API — not yet in lib.dom for all TS targets.
  interface Document {
    startViewTransition?: (cb: () => void | Promise<void>) => {
      finished: Promise<void>;
      ready: Promise<void>;
      updateCallbackDone: Promise<void>;
    };
  }
}

export {};
