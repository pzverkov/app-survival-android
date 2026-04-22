import { defineConfig } from 'vite';

export default defineConfig(() => {
  // For GitHub Pages under a repo path, set VITE_BASE to "/<repo>/" in CI.
  // For custom domains, set VITE_BASE to "/".
  // Default is "/" so local builds and previews always work.
  const base = process.env.VITE_BASE ?? '/';

  // GH Actions sets VITE_COMMIT_SHA explicitly; Cloudflare Workers Builds
  // exposes WORKERS_CI_COMMIT_SHA; legacy Cloudflare Pages set CF_PAGES_COMMIT_SHA.
  const commitSha =
    process.env.VITE_COMMIT_SHA
    ?? process.env.WORKERS_CI_COMMIT_SHA
    ?? process.env.CF_PAGES_COMMIT_SHA
    ?? 'dev';

  return {
    base,
    plugins: [],
    define: {
      'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(commitSha),
    },
    server: {
      port: 5173,
      strictPort: true
    }
  };
});
