import { renderers } from './renderers.mjs';
import { s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CvSoi7hX.mjs';
import { manifest } from './manifest_vZK7t7KG.mjs';
import { createExports } from '@astrojs/netlify/ssr-function.js';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/about.astro.mjs');
const _page2 = () => import('./pages/analysis.astro.mjs');
const _page3 = () => import('./pages/api/analysis.astro.mjs');
const _page4 = () => import('./pages/api/config.astro.mjs');
const _page5 = () => import('./pages/api/history.astro.mjs');
const _page6 = () => import('./pages/api/readings.astro.mjs');
const _page7 = () => import('./pages/api/relay.astro.mjs');
const _page8 = () => import('./pages/history.astro.mjs');
const _page9 = () => import('./pages/settings.astro.mjs');
const _page10 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/about.astro", _page1],
    ["src/pages/analysis.astro", _page2],
    ["src/pages/api/analysis.ts", _page3],
    ["src/pages/api/config.ts", _page4],
    ["src/pages/api/history.ts", _page5],
    ["src/pages/api/readings.ts", _page6],
    ["src/pages/api/relay.ts", _page7],
    ["src/pages/history.astro", _page8],
    ["src/pages/settings.astro", _page9],
    ["src/pages/index.astro", _page10]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "6444a7dc-f344-4b46-9754-75fc33ee5512"
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
