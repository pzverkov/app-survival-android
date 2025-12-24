import { defineConfig } from 'vite';

export default defineConfig(() => {
  // For GitHub Pages under a repo path, set VITE_BASE to "/<repo>/" in CI.
  // For custom domains, set VITE_BASE to "/".
  // Default is "/" so local builds and previews always work.
  const base = process.env.VITE_BASE ?? '/';

  return {
    base,
    server: {
      port: 5173,
      strictPort: true
    }
  };
});
