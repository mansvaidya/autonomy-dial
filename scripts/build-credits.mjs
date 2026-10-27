// Regenerates credits.html from src/catalog.js: node scripts/build-credits.mjs
import { writeFileSync } from 'node:fs';
import { PRODUCTS } from '../src/catalog.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rows = [];
for (const p of PRODUCTS) for (const im of [p.img, p.img2].filter(Boolean)) {
  const c = im.credit;
  rows.push(`<tr><td>${esc(p.brand ? p.brand + ' ' : '')}${esc(p.name)}</td><td><a href="${esc(c.page)}">${esc(c.title)}</a></td><td>${esc(c.author)}</td><td>${esc(c.license)}</td><td>${esc(c.site)}</td></tr>`);
}
writeFileSync(new URL('../credits.html', import.meta.url), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Image credits</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.5;color:#1c1c1c}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top;font-size:14px}th{background:#f4f4f4}</style></head>
<body><h1>Image credits</h1>
<p>Basketly and its stores are fictional, made for a research study. Product photos come from <a href="https://commons.wikimedia.org">Wikimedia Commons</a> and <a href="https://world.openfoodfacts.org">Open Food Facts</a> under the licenses below. Photos are shown unmodified and hotlinked from those sites. Brand names and packaging belong to their owners and appear only to make the demo realistic; no endorsement is implied.</p>
<table><thead><tr><th>Product</th><th>Source file</th><th>Author</th><th>License</th><th>Site</th></tr></thead><tbody>
${rows.join('\n')}
</tbody></table></body></html>
`);
console.log(`credits.html: ${rows.length} images`);
