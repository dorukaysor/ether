import { c as createComponent, i as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_BlN3iGIO.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_DSwVOdUh.mjs';
import { L as LiveDashboard } from '../chunks/LiveDashboard_16Ev-m9b.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Home", "data-astro-cid-j7pv25f6": true }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<section class="page-header" data-astro-cid-j7pv25f6> <h1 data-astro-cid-j7pv25f6>Live Monitor</h1> <p class="subtitle" data-astro-cid-j7pv25f6>Real-time energy readings from your ETHER Sentry unit.</p> </section>  <div class="page-body" data-astro-cid-j7pv25f6> ${renderComponent($$result2, "LiveDashboard", LiveDashboard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "D:/projects/ether/web/src/components/LiveDashboard", "client:component-export": "default", "data-astro-cid-j7pv25f6": true })} </div> ` })} `;
}, "D:/projects/ether/web/src/pages/index.astro", void 0);

const $$file = "D:/projects/ether/web/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
