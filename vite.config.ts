import { defineConfig } from 'vite';
import type { Plugin, HtmlTagDescriptor } from 'vite';

export default defineConfig(() => {
  // For GitHub Pages under a repo path, set VITE_BASE to "/<repo>/" in CI.
  // For custom domains, set VITE_BASE to "/".
  // Default is "/" so local builds and previews always work.
  const base = process.env.VITE_BASE ?? '/';

  // GH Actions sets VITE_COMMIT_SHA explicitly; Cloudflare Workers Builds
  // exposes WORKERS_CI_COMMIT_SHA; legacy Cloudflare Pages set CF_PAGES_COMMIT_SHA.
  // We re-export to VITE_COMMIT_SHA via process.env so Vite's built-in
  // VITE_-prefix substitution handles the replacement (no manual `define`
  // needed in Vite 8+).
  process.env.VITE_COMMIT_SHA =
    process.env.VITE_COMMIT_SHA
    ?? process.env.WORKERS_CI_COMMIT_SHA
    ?? process.env.CF_PAGES_COMMIT_SHA
    ?? 'dev';

  return {
    base,
    plugins: [
      prefetchSmallLazyChunks(['integrity', 'meta'], base),
      preloadUserLocale(base),
    ],
    server: {
      port: 5173,
      strictPort: true
    },
    css: {
      transformer: 'lightningcss',
    },
    build: {
      target: 'es2022',
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
      // Vite's default modulepreload eagerly prefetches every chunk
      // reachable from the entry, which would re-bundle our lazy chunks
      // back onto the first-paint critical path. We hand-pick what to
      // warm via the plugins above instead.
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (!id.includes('/src/')) return undefined;
            // Each locale stays in its own chunk so language switches
            // fetch a single ~1-5KB file instead of the full set.
            if (id.includes('/src/locales/')) return undefined;
            // scenarios + challenges share the "meta" lazy load, and
            // both are only reached via dynamic import from main.ts.
            if (id.endsWith('/src/scenarios.ts') || id.endsWith('/src/challenges.ts')) return 'meta';
            // integrity + scoreboard are both lazy and share CryptoKey
            // helpers, so grouping them saves a round-trip. postmortem
            // is intentionally NOT here — sim.ts imports it statically,
            // so co-locating it with integrity would drag the integrity
            // chunk onto the critical path.
            if (
              id.endsWith('/src/integrity.ts') ||
              id.endsWith('/src/scoreboard.ts')
            ) return 'integrity';
            // achievements.ts is only dynamically imported; let Rollup
            // auto-chunk it. Assigning it manually caused Rollup to
            // co-pack shared constants (MODE, EVAL_PRESET) into the
            // chunk, which forced the entry to statically import it.
            return undefined;
          },
        },
      },
    },
  };
});

// Adds <link rel="prefetch"> in <head> for hand-picked lazy chunks so the
// browser warms the HTTP cache during idle time after first paint. By the
// time our dynamic import() fires inside afterFirstPaint(), the response
// is already sitting in cache — saves a round trip without costing us any
// time-to-first-paint (prefetch is low priority by spec).
function prefetchSmallLazyChunks(targetChunkNames: string[], base: string): Plugin {
  return {
    name: 'prefetch-small-lazy-chunks',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return;
        const tags: HtmlTagDescriptor[] = [];
        for (const [fileName, asset] of Object.entries(ctx.bundle)) {
          if (asset.type !== 'chunk') continue;
          if (!targetChunkNames.includes(asset.name ?? '')) continue;
          tags.push({
            tag: 'link',
            attrs: {
              rel: 'prefetch',
              as: 'script',
              href: `${base}${fileName}`,
              crossorigin: '',
            },
            injectTo: 'head',
          });
        }
        return tags;
      },
    },
  };
}

// Inlines a tiny language-detect script in <head> that adds a
// <link rel="modulepreload"> for the user's preferred locale chunk. EN is
// inlined in the entry and doesn't need this; for any other locale the
// fetch otherwise sits behind "entry downloads → entry parses → i18n glob
// fires → locale fetches" on the critical path. By running before the
// entry script, this starts the locale fetch in parallel with the entry
// download, saving one sequential round-trip for non-English first paint.
function preloadUserLocale(base: string): Plugin {
  return {
    name: 'preload-user-locale',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return;
        const localeMap: Record<string, string> = {};
        for (const [fileName, asset] of Object.entries(ctx.bundle)) {
          if (asset.type !== 'chunk') continue;
          const src = asset.facadeModuleId ?? '';
          const m = src.match(/\/src\/locales\/([^/]+)\.ts$/);
          if (!m) continue;
          localeMap[m[1]] = fileName;
        }
        if (Object.keys(localeMap).length === 0) return;

        // Keep this in sync with normalizeLocale() in src/i18n.ts. A miss
        // here just means no preload — the in-app loader still resolves
        // the right chunk via ensureLoadedChain().
        const script = `(function(){
try {
  var m = ${JSON.stringify(localeMap)};
  var keys = Object.keys(m);
  var canon = {};
  for (var i = 0; i < keys.length; i++) canon[keys[i].toLowerCase()] = keys[i];
  function norm(raw) {
    var s = (raw || '').replace(/_/g, '-').trim().toLowerCase();
    if (!s) return null;
    if (canon[s]) return canon[s];
    if (s.indexOf('zh') === 0) return 'zh-Hans';
    if (s === 'no' || s.indexOf('no-') === 0) return 'nb';
    var b = s.split('-')[0];
    if (canon[b]) return canon[b];
    if (b === 'ua') return 'uk';
    return null;
  }
  var saved = '';
  try { saved = localStorage.getItem('lang') || ''; } catch (e) {}
  var cand = saved ? [saved] : (Array.isArray(navigator.languages) && navigator.languages.length ? navigator.languages.slice() : [navigator.language || 'en']);
  for (var j = 0; j < cand.length; j++) {
    var id = norm(cand[j]);
    if (id && id !== 'en' && m[id]) {
      var l = document.createElement('link');
      l.rel = 'modulepreload';
      l.crossOrigin = '';
      l.href = ${JSON.stringify(base)} + m[id];
      document.head.appendChild(l);
      break;
    }
  }
} catch (e) {}
})();`;

        return [{
          tag: 'script',
          children: script,
          injectTo: 'head',
        }];
      },
    },
  };
}
