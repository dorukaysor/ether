import { c as createComponent, j as renderHead, e as addAttribute, r as renderTemplate, k as renderSlot, f as createAstro } from './astro/server_BlN3iGIO.mjs';
import 'piccolore';
import 'clsx';
/* empty css                         */

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title = "ETHER" } = Astro2.props;
  const navLinks = [
    { href: "/", label: "Home", icon: "fa-house" },
    { href: "/history", label: "History", icon: "fa-clock-rotate-left" },
    { href: "/analysis", label: "AI Analysis", icon: "fa-brain" },
    { href: "/settings", label: "Settings", icon: "fa-gear" },
    { href: "/about", label: "About", icon: "fa-circle-info" }
  ];
  const currentPath = Astro2.url.pathname;
  return renderTemplate`<html lang="en" data-astro-cid-sckkx6r4> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title} — ETHER</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"><!-- FontAwesome 6 Free — loaded globally for all React islands --><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck4w1K5lAa+0+hQR3bFNFWnhg==" crossorigin="anonymous" referrerpolicy="no-referrer">${renderHead()}</head> <body data-astro-cid-sckkx6r4> <!-- Navbar --> <nav class="navbar" data-astro-cid-sckkx6r4> <a href="/" class="logo" data-astro-cid-sckkx6r4> <span class="logo-e" data-astro-cid-sckkx6r4>E</span>THER
</a> <ul class="nav-links" data-astro-cid-sckkx6r4> ${navLinks.map((link) => renderTemplate`<li data-astro-cid-sckkx6r4> <a${addAttribute(link.href, "href")}${addAttribute(`nav-link ${currentPath === link.href || link.href !== "/" && currentPath.startsWith(link.href) ? "active" : ""}`, "class")} data-astro-cid-sckkx6r4> <i${addAttribute(`fa-solid ${link.icon}`, "class")} data-astro-cid-sckkx6r4></i> ${link.label} </a> </li>`)} </ul> </nav> <!-- Page content --> <main class="page-content" data-astro-cid-sckkx6r4> ${renderSlot($$result, $$slots["default"])} </main> </body></html>`;
}, "D:/projects/ether/web/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
