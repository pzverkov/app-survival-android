import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
  /**
   * GitHub Pages serves projects at:
   *   https://<user>.github.io/<repo>/
   * so assets must be built with base="/<repo>/".
   *
   * - Locally (dev), base="/" keeps things simple.
   * - In CI, you can override with VITE_BASE (recommended).
   */
  const base =
    process.env.VITE_BASE ??
    (command === 'build' ? '/app-survival-android/' : '/');

  return {
    base,
    server: {
      port: 5173,
      strictPort: true
    }
  };
});
