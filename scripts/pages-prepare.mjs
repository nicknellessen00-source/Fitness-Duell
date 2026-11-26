// Bereitet den Web-Export (dist/) für GitHub Pages vor:
// - absolute Pfade der eigenen Dateien (Icons, Manifest, Download-Seite) auf den Unterordner umstellen
// - 404.html = index.html, damit Direktaufrufe wie /Fitness-Duell/training funktionieren (Single-Page-App)
// - .nojekyll, weil Expo Ordner mit Unterstrich erzeugt (_expo)
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] || 'dist';
const base = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
const apkUrl = process.env.APK_URL || '';

const own = ['manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'favicon.ico', 'datenschutz', 'fitduell.apk'];
const prefix = (html) => {
  let out = html;
  for (const f of own) out = out.replaceAll(`"/${f}"`, `"${base}/${f}"`);
  return out.replaceAll('href="/"', `href="${base}/"`);
};

for (const f of ['index.html', 'download.html']) {
  const p = join(dist, f);
  if (!existsSync(p)) continue;
  let html = prefix(readFileSync(p, 'utf8'));
  if (f === 'download.html') html = apkUrl ? html.replaceAll(`"${base}/fitduell.apk"`, `"${apkUrl}"`) : html;
  writeFileSync(p, html);
}
const mf = join(dist, 'manifest.webmanifest');
if (existsSync(mf)) {
  const m = JSON.parse(readFileSync(mf, 'utf8'));
  m.start_url = `${base}/`; m.scope = `${base}/`;
  m.icons = m.icons.map((i) => ({ ...i, src: `${base}${i.src}` }));
  writeFileSync(mf, JSON.stringify(m, null, 2));
}
copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`GitHub Pages vorbereitet (Basis: ${base || '/'})`);
