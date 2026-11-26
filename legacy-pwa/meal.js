/* Mahlzeit-Erkennung ohne KI:
 *  parseMeal(text)  – Freitext/Sprache („2 Eier und ein Brötchen mit Butter“) → Lebensmittel mit Gramm
 *  parseLabel(text) – OCR-Text einer Nährwerttabelle → kcal/Eiweiß/KH/Fett pro 100 g
 */
(function () {
  'use strict';
  const { FOOD_DB, norm } = window.FitFoods;

  // Einheiten: Schreibweisen → Schlüssel
  const UNIT_ALIASES = {
    g: ['g', 'gr', 'gramm', 'gram'], kg: ['kg', 'kilo', 'kilogramm'], ml: ['ml', 'milliliter'], cl: ['cl'], l: ['l', 'liter', 'litern'],
    stueck: ['stueck', 'stk', 'st', 'stuck', 'stueckchen'], scheibe: ['scheibe', 'scheiben', 'scheibchen'],
    el: ['el', 'essloeffel', 'essl', 'loeffel'], tl: ['tl', 'teeloeffel', 'teel'], glas: ['glas', 'glaeser', 'glaesern'],
    tasse: ['tasse', 'tassen'], becher: ['becher'], schale: ['schale', 'schalen', 'schuessel', 'schuesseln', 'bowl'],
    portion: ['portion', 'portionen', 'port'], handvoll: ['handvoll', 'hand'], dose: ['dose', 'dosen'], flasche: ['flasche', 'flaschen'],
    riegel: ['riegel'], teller: ['teller'], schuss: ['schuss', 'spritzer'], kugel: ['kugel', 'kugeln'], zehe: ['zehe', 'zehen'],
    stange: ['stange', 'stangen'], tuete: ['tuete', 'tueten', 'beutel'], packung: ['packung', 'packungen', 'pack', 'pkg'],
    reihe: ['reihe', 'reihen'], tafel: ['tafel', 'tafeln'], messloeffel: ['messloeffel', 'scoop', 'scoops'], mass: ['mass'],
    haelfte: ['haelfte'], prise: ['prise', 'prisen'], roeschen: ['roeschen'], streifen: ['streifen'], paar: ['paar']
  };
  const UNIT = {}; for (const [k, list] of Object.entries(UNIT_ALIASES)) for (const a of list) UNIT[a] = k;
  const UNIT_LABEL = { g: 'g', kg: 'kg', ml: 'ml', cl: 'cl', l: 'l', stueck: 'Stück', scheibe: 'Scheibe', el: 'EL', tl: 'TL', glas: 'Glas', tasse: 'Tasse', becher: 'Becher', schale: 'Schale', portion: 'Portion', handvoll: 'Handvoll', dose: 'Dose', flasche: 'Flasche', riegel: 'Riegel', teller: 'Teller', schuss: 'Schuss', kugel: 'Kugel', zehe: 'Zehe', stange: 'Stange', tuete: 'Tüte', packung: 'Packung', reihe: 'Reihe', tafel: 'Tafel', messloeffel: 'Messlöffel', mass: 'Maß', haelfte: 'Hälfte', prise: 'Prise', roeschen: 'Röschen', streifen: 'Streifen', paar: 'Paar' };
  // Allgemeine Grammwerte, falls das Lebensmittel die Einheit nicht kennt
  const GENERIC = { el: 15, tl: 5, glas: 200, tasse: 200, becher: 200, schale: 250, teller: 350, handvoll: 30, schuss: 30, prise: 1, dose: 330, flasche: 500, kugel: 60, scheibe: 30, riegel: 40, tuete: 100, packung: 200, reihe: 20, tafel: 100, messloeffel: 30, mass: 1000, zehe: 4, stange: 100, roeschen: 20, streifen: 10 };

  const NUMBERS = { ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eines: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwoelf: 12, fuenfzehn: 15, zwanzig: 20, dreissig: 30, vierzig: 40, fuenfzig: 50, hundert: 100, zweihundert: 200, dreihundert: 300, anderthalb: 1.5, eineinhalb: 1.5, zweieinhalb: 2.5, paar: 3, viertel: 0.25 };
  const HALF = new Set(['halb', 'halbe', 'halben', 'halber', 'halbes']);
  const BIG = new Set(['gross', 'grosse', 'grossen', 'grosser', 'grosses', 'riesig', 'riesige', 'riesigen']);
  const SMALL = new Set(['klein', 'kleine', 'kleinen', 'kleiner', 'kleines', 'mini']);
  const STOP = new Set(['ich', 'habe', 'hab', 'hatte', 'hatten', 'gegessen', 'getrunken', 'esse', 'trinke', 'trank', 'ass', 'genommen', 'gefruehstueckt',
    'zum', 'zur', 'zu', 'fruehstueck', 'mittag', 'mittagessen', 'abendessen', 'abend', 'morgens', 'mittags', 'abends', 'heute', 'gestern', 'noch', 'etwa', 'ca', 'circa',
    'ungefaehr', 'so', 'bisschen', 'etwas', 'von', 'vom', 'der', 'die', 'das', 'den', 'dem', 'des', 'mein', 'meine', 'meinen', 'snack', 'als', 'auch', 'nur', 'dann',
    'danach', 'leckere', 'leckeren', 'lecker', 'frische', 'frischen', 'frisch', 'selbstgemachte', 'selbstgemachten', 'hausgemachte', 'im', 'in', 'aus', 'a', 'je', 'jeweils', 'pro', 'am', 'beim', 'bei']);

  const singular = w => w.replace(/(en|n|e|s)$/, '');
  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function scoreAlias(q, a) {
    if (!q || !a) return 0;
    if (q === a) return 100;
    if (singular(q) === singular(a)) return 95;
    const re = new RegExp(`(^| )${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( |$)`);
    if (re.test(q)) return 60 + Math.min(a.length, 30);
    if (a.length >= 4 && q.includes(a)) return 42 + Math.min(a.length, 20); // Komposita: „vollkornbrot“ enthält „brot“
    if (q.length >= 4 && a.includes(q)) return 50 + Math.min(q.length, 20);
    if (q.length >= 5 && a.length >= 5 && lev(q, a) <= (a.length > 7 ? 2 : 1)) return 55;
    const qs = singular(q); if (qs.length >= 4 && singular(a).startsWith(qs)) return 46;
    return 0;
  }
  /** Beste Treffer für einen Suchbegriff */
  function findFoods(q, extra) {
    const all = (extra || []).concat(FOOD_DB);
    const out = [];
    for (const f of all) {
      let best = 0; for (const a of f.aliases) best = Math.max(best, scoreAlias(q, a));
      if (f.recent && best) best += 3; // zuletzt gegessene Produkte leicht bevorzugen
      if (best >= 40) out.push({ food: f, score: best });
    }
    out.sort((x, y) => y.score - x.score || x.food.name.length - y.food.name.length);
    return out.slice(0, 5);
  }

  function gramsFor(food, qty, unit, side, sizeF) {
    const u = food.units || {};
    let g;
    if (unit === 'g') g = qty;
    else if (unit === 'kg') g = qty * 1000;
    else if (unit === 'ml') g = qty;
    else if (unit === 'cl') g = qty * 10;
    else if (unit === 'l') g = qty * 1000;
    else if (unit === 'haelfte') g = (u.haelfte || food.portion / 2) * qty;
    else if (unit === 'paar') g = (u.paar || (u.stueck >= 40 ? u.stueck * 2 : food.portion * 0.6)) * qty;
    else if (unit) g = (u[unit] || (unit === 'stueck' || unit === 'portion' ? food.portion : GENERIC[unit] || food.portion)) * qty;
    else if (qty != null) g = (u.stueck || food.portion) * qty;
    else g = side ? (u.mit || food.portion) : food.portion;
    return Math.max(1, Math.round(g * (unit && ['g', 'kg', 'ml', 'cl', 'l'].includes(unit) ? 1 : sizeF)));
  }

  /** Ein Abschnitt („2 große Eier“) → {qty, unit, sizeF, q} */
  function parsePart(raw) {
    let s = ' ' + norm(raw).replace(/½/g, ' 0.5 ').replace(/¼/g, ' 0.25 ') + ' ';
    s = s.replace(/(\d+)\s*\/\s*(\d+)/g, (_, a, b) => ' ' + (+a / +b) + ' ');
    s = s.replace(/(\d)([a-z])/g, '$1 $2'); // „150g“ → „150 g“
    const words = s.trim().split(' ').filter(Boolean);
    let qty = null, unit = null, sizeF = 1; const rest = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const num = /^\d+([.,]\d+)?$/.test(w) ? parseFloat(w.replace(',', '.')) : null;
      if (num != null && qty == null) { qty = num; continue; }
      if (num != null && qty != null && !unit) { qty += num; continue; } // „1 0.5“
      if (NUMBERS[w] != null && qty == null) { qty = NUMBERS[w]; continue; }
      if (HALF.has(w)) { qty = qty == null || qty === 1 ? 0.5 : qty + 0.5; continue; }
      if (UNIT[w] && !unit && (qty != null || i === 0 || rest.length === 0)) { unit = UNIT[w]; if (unit === 'paar' && qty === 3) qty = 1; continue; }
      if (BIG.has(w)) { sizeF = 1.3; continue; }
      if (SMALL.has(w)) { sizeF = 0.7; continue; }
      if (STOP.has(w)) continue;
      rest.push(w);
    }
    return { qty, unit, sizeF, q: rest.join(' ') };
  }

  /** Freitext → Liste erkannter Lebensmittel */
  function parseMeal(text, extra) {
    const items = [];
    if (!text || !text.trim()) return items;
    // in Abschnitte teilen; „mit“ markiert Beilagen bis zum nächsten Komma
    const chunks = String(text).replace(/(\d),(\d)/g, '$1.$2').replace(/\n+/g, ',').split(/[,;+&]|(?:\s|^)(?:und|sowie|plus|dazu|danach|dann|auf|ueber|über)(?=\s|$)/i);
    let main = null; // Hauptbestandteil des Abschnitts (für Beilagen-Mengen)
    for (const chunk of chunks) {
      if (!chunk || !chunk.trim()) continue;
      const sub = chunk.split(/(?:\s|^)mit(?=\s|$)/i);
      sub.forEach((part, idx) => {
        if (!part || !part.trim()) return;
        const side = idx > 0;
        const p = parsePart(part);
        if (!p.q) return;
        let cands = findFoods(p.q, extra);
        // „Brot mit Butter“ in einem Wort gesprochen: zusätzlich längste Teilwörter prüfen
        if (!cands.length && p.q.includes(' ')) {
          const words = p.q.split(' ').sort((a, b) => b.length - a.length);
          for (const w of words) { cands = findFoods(w, extra).filter(c => c.score >= 60); if (cands.length) break; } // nur eindeutige Einzelwörter
        }
        const best = cands[0];
        const item = { text: part.trim(), query: p.q, qty: p.qty, unit: p.unit, side, sizeF: p.sizeF, candidates: cands.map(c => c.food), sure: !!best && best.score >= 60 };
        if (best) {
          item.food = best.food; item.grams = gramsFor(best.food, p.qty, p.unit, side, p.sizeF);
          // Milch/Joghurt zu Müsli & Co. ist eine richtige Portion, kein Schuss
          if (side && p.qty == null && !p.unit && main && /muesli|cornflakes|haferflocken|granola|porridge|knusper/.test(main.aliases.join(' ')) && /milch|drink|joghurt/.test(best.food.aliases.join(' '))) item.grams = 150;
          if (!side) main = best.food;
        }
        items.push(item);
      });
    }
    return items;
  }
  const regrams = (item, food) => gramsFor(food, item.qty, item.unit, item.side, item.sizeF);

  /* ---------- Nährwerttabelle (OCR-Text) ---------- */
  function num(s) { const m = String(s).replace(/(\d)\s*[,.]\s*(\d)/g, '$1.$2').match(/<?\s*(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : null; }
  function valueAfter(lines, i, re) {
    const line = lines[i]; const idx = line.search(re); const after = line.slice(idx).replace(re, '');
    let v = num(after);
    if (v == null && lines[i + 1]) v = num(lines[i + 1]);
    return v;
  }
  function parseLabel(text) {
    const clean = String(text || '').replace(/\r/g, '').replace(/(\d)[oO](?=\d|\s*g)/g, '$10').replace(/[|]/g, ' ');
    const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
    const flat = clean.replace(/\n/g, ' ');
    const r = { kcal: null, p: null, c: null, f: null, sugar: null, fiber: null, serving: null, found: 0, warn: '' };
    const kc = flat.match(/(\d{1,4}(?:[.,]\d+)?)\s*k\s?c\s?a\s?l/i);
    if (kc) r.kcal = parseFloat(kc[1].replace(',', '.'));
    else { const kj = flat.match(/(\d{2,4}(?:[.,]\d+)?)\s*k\s?j/i); if (kj) r.kcal = Math.round(parseFloat(kj[1].replace(',', '.')) / 4.184); }
    lines.forEach((l, i) => {
      const L = norm(l);
      if (r.f == null && /\bfett\b|\bfat\b/.test(L) && !/gesaett|davon|saturat/.test(L)) r.f = valueAfter(lines, i, /fett|fat/i);
      else if (r.c == null && /kohlenhydrat|carbohydrat/.test(L) && !/davon|zucker|sugar/.test(L)) r.c = valueAfter(lines, i, /kohlenhydrate?|carbohydrates?/i);
      else if (r.p == null && /eiweiss|eiweiß|protein/i.test(L)) r.p = valueAfter(lines, i, /eiwei(ss|ß)|protein/i);
      else if (r.sugar == null && /zucker|sugar/.test(L)) r.sugar = valueAfter(lines, i, /zucker|sugars?/i);
      else if (r.fiber == null && /ballaststoff|fibre|fiber/.test(L)) r.fiber = valueAfter(lines, i, /ballaststoffe?|fib(re|er)/i);
      if (r.serving == null) { const m = l.match(/(portion|serving|pro\s+\w+)[^\d]{0,25}(\d{1,4})\s*(g|ml)/i); if (m && !/100\s*(g|ml)/.test(m[0])) r.serving = +m[2]; }
    });
    for (const k of ['kcal', 'p', 'c', 'f']) if (r[k] != null) r.found++;
    if (r.kcal == null && r.p != null && r.c != null && r.f != null) { r.kcal = Math.round(4 * r.p + 4 * r.c + 9 * r.f); r.warn = 'kcal aus Makros berechnet'; }
    if (r.kcal != null && r.p != null && r.c != null && r.f != null) {
      const calc = 4 * r.p + 4 * r.c + 9 * r.f;
      if (r.kcal > 20 && Math.abs(calc - r.kcal) / r.kcal > 0.3) r.warn = 'Werte passen nicht ganz zusammen – bitte prüfen';
    }
    return r;
  }

  window.FitMeal = { parseMeal, parseLabel, findFoods, regrams, UNIT_LABEL };
})();
