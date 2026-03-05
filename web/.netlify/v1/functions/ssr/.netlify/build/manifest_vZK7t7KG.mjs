import '@astrojs/internal-helpers/path';
import '@astrojs/internal-helpers/remote';
import 'piccolore';
import { l as NOOP_MIDDLEWARE_HEADER, n as decodeKey } from './chunks/astro/server_BlN3iGIO.mjs';
import 'clsx';
import 'es-module-lexer';
import 'html-escaper';

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

const codeToStatusMap = {
  // Implemented from IANA HTTP Status Code Registry
  // https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  CONTENT_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_CONTENT: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NETWORK_AUTHENTICATION_REQUIRED: 511
};
Object.entries(codeToStatusMap).reduce(
  // reverse the key-value pairs
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///D:/projects/ether/web/","cacheDir":"file:///D:/projects/ether/web/node_modules/.astro/","outDir":"file:///D:/projects/ether/web/dist/","srcDir":"file:///D:/projects/ether/web/src/","publicDir":"file:///D:/projects/ether/web/public/","buildClientDir":"file:///D:/projects/ether/web/dist/","buildServerDir":"file:///D:/projects/ether/web/.netlify/build/","adapterName":"@astrojs/netlify","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/about.JCgpm99h.css"},{"type":"external","src":"/_astro/about.rcr3b2Q6.css"}],"routeData":{"route":"/about","isIndex":false,"type":"page","pattern":"^\\/about\\/?$","segments":[[{"content":"about","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/about.astro","pathname":"/about","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/about.JCgpm99h.css"},{"type":"inline","content":".page-header[data-astro-cid-xcx2albw]{margin-bottom:0}.page-header[data-astro-cid-xcx2albw] h1[data-astro-cid-xcx2albw]{font-size:1.75rem;font-weight:700;color:var(--neon-yellow);margin:0 0 .3rem}.page-header[data-astro-cid-xcx2albw] .subtitle[data-astro-cid-xcx2albw]{color:var(--text-muted);margin:0;font-size:.9rem}\n"}],"routeData":{"route":"/analysis","isIndex":false,"type":"page","pattern":"^\\/analysis\\/?$","segments":[[{"content":"analysis","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/analysis.astro","pathname":"/analysis","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/analysis","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/analysis\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"analysis","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/analysis.ts","pathname":"/api/analysis","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/config","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/config\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"config","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/config.ts","pathname":"/api/config","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/history","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/history\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"history","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/history.ts","pathname":"/api/history","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/readings","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/readings\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"readings","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/readings.ts","pathname":"/api/readings","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/relay","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/relay\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"relay","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/relay.ts","pathname":"/api/relay","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/about.JCgpm99h.css"},{"type":"inline","content":".page-header[data-astro-cid-tal57otx]{margin-bottom:0}.page-header[data-astro-cid-tal57otx] h1[data-astro-cid-tal57otx]{font-size:1.75rem;font-weight:700;color:var(--neon-pink);margin:0 0 .3rem}.page-header[data-astro-cid-tal57otx] .subtitle[data-astro-cid-tal57otx]{color:var(--text-muted);margin:0;font-size:.9rem}\n"}],"routeData":{"route":"/history","isIndex":false,"type":"page","pattern":"^\\/history\\/?$","segments":[[{"content":"history","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/history.astro","pathname":"/history","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/about.JCgpm99h.css"},{"type":"inline","content":".page-header[data-astro-cid-swhfej32]{margin-bottom:0}.page-header[data-astro-cid-swhfej32] h1[data-astro-cid-swhfej32]{font-size:1.75rem;font-weight:700;color:var(--text-primary);margin:0 0 .3rem}.page-header[data-astro-cid-swhfej32] .subtitle[data-astro-cid-swhfej32]{color:var(--text-muted);margin:0;font-size:.9rem}\n"}],"routeData":{"route":"/settings","isIndex":false,"type":"page","pattern":"^\\/settings\\/?$","segments":[[{"content":"settings","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/settings.astro","pathname":"/settings","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/about.JCgpm99h.css"},{"type":"inline","content":".page-header[data-astro-cid-j7pv25f6]{margin-bottom:0}.page-header[data-astro-cid-j7pv25f6] h1[data-astro-cid-j7pv25f6]{font-size:1.75rem;font-weight:700;color:var(--neon-cyan);margin:0 0 .3rem}.page-header[data-astro-cid-j7pv25f6] .subtitle[data-astro-cid-j7pv25f6]{color:var(--text-muted);margin:0;font-size:.9rem}\n"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["D:/projects/ether/web/src/pages/about.astro",{"propagation":"none","containsHead":true}],["D:/projects/ether/web/src/pages/analysis.astro",{"propagation":"none","containsHead":true}],["D:/projects/ether/web/src/pages/history.astro",{"propagation":"none","containsHead":true}],["D:/projects/ether/web/src/pages/index.astro",{"propagation":"none","containsHead":true}],["D:/projects/ether/web/src/pages/settings.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astro-page:src/pages/about@_@astro":"pages/about.astro.mjs","\u0000@astro-page:src/pages/analysis@_@astro":"pages/analysis.astro.mjs","\u0000@astro-page:src/pages/api/analysis@_@ts":"pages/api/analysis.astro.mjs","\u0000@astro-page:src/pages/api/config@_@ts":"pages/api/config.astro.mjs","\u0000@astro-page:src/pages/api/history@_@ts":"pages/api/history.astro.mjs","\u0000@astro-page:src/pages/api/readings@_@ts":"pages/api/readings.astro.mjs","\u0000@astro-page:src/pages/api/relay@_@ts":"pages/api/relay.astro.mjs","\u0000@astro-page:src/pages/history@_@astro":"pages/history.astro.mjs","\u0000@astro-page:src/pages/settings@_@astro":"pages/settings.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_vZK7t7KG.mjs","D:/projects/ether/web/node_modules/unstorage/drivers/netlify-blobs.mjs":"chunks/netlify-blobs_DM36vZAS.mjs","D:/projects/ether/web/src/components/AIAnalysis":"_astro/AIAnalysis.QUIB-wjW.js","D:/projects/ether/web/src/components/SettingsPanel":"_astro/SettingsPanel.CjBruPqN.js","@astrojs/react/client.js":"_astro/client.CTd2fbS1.js","D:/projects/ether/web/src/components/HistoryCharts":"_astro/HistoryCharts.BrA1GMF-.js","D:/projects/ether/web/src/components/LiveDashboard":"_astro/LiveDashboard.CFT8uE-I.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/about.JCgpm99h.css","/_astro/about.rcr3b2Q6.css","/favicon.ico","/favicon.svg","/_astro/AIAnalysis.QUIB-wjW.js","/_astro/AreaChart.FRYZLLfB.js","/_astro/client.CTd2fbS1.js","/_astro/HistoryCharts.BrA1GMF-.js","/_astro/index.CRC3r6US.js","/_astro/index.DDwZLzXB.js","/_astro/jsx-runtime.D_zvdyIk.js","/_astro/LiveDashboard.CFT8uE-I.js","/_astro/proxy.B5vZG4xo.js","/_astro/SettingsPanel.CjBruPqN.js"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"actionBodySizeLimit":1048576,"serverIslandNameMap":[],"key":"AY0hLrJp6KJEKmOiFrFZf6+c+nsF1VBSWc89Z/p0ukg=","sessionConfig":{"driver":"netlify-blobs","options":{"name":"astro-sessions","consistency":"strong"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/netlify-blobs_DM36vZAS.mjs');

export { manifest };
