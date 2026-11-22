/* Takes the screenshots for the Google Play page: five pictures per language, each with a caption
   above a phone that runs the real game. Two sets are made, one for the whole year and one for
   Christmas (red background, snow in the game).

   Run from the project root, once per change to the game's look:

       cd tools/store-shots
       npm install            (only the first time)
       node shots.js          (all languages)   or   node shots.js en sv

   Needs Google Chrome or Microsoft Edge installed. The pictures are 1080 × 1920 and land in
   store-assets/shots/<set>/<language>/. That folder is not in git: make it again with this script. */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright-core');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'store-assets', 'shots');
const LANG = require(path.join(ROOT, 'docs', 'play', 'lang.js'));

// The caption above each picture. Keep them short: two lines at most.
const CAPTIONS = {
  en: ['Tap to turn the pieces', 'Light up every lamp', 'Bigger boards, new twists', 'A new daily string every day', 'Relaxing puzzles, no timer'],
  sv: ['Tryck för att vrida bitarna', 'Tänd alla lampor', 'Större brädor, nya knep', 'En ny slinga varje dag', 'Lugna pussel utan tidspress'],
  de: ['Tippen, um die Teile zu drehen', 'Bring alle Lampen zum Leuchten', 'Größere Felder, neue Kniffe', 'Jeden Tag eine neue Kette', 'Entspannt rätseln ohne Zeitdruck'],
  fr: ['Touchez pour tourner les pièces', 'Allumez toutes les lampes', 'Plateaux plus grands, nouveaux défis', 'Une nouvelle guirlande chaque jour', 'Des casse-têtes relaxants, sans chrono'],
  es: ['Toca para girar las piezas', 'Enciende todas las luces', 'Tableros más grandes, nuevos retos', 'Una guirnalda nueva cada día', 'Puzles relajantes, sin reloj'],
  pt: ['Toque para girar as peças', 'Acenda todas as lâmpadas', 'Tabuleiros maiores, novos desafios', 'Um cordão novo todo dia', 'Quebra-cabeças relaxantes, sem relógio'],
  id: ['Ketuk untuk memutar keping', 'Nyalakan semua lampu', 'Papan lebih besar, tantangan baru', 'Untaian baru setiap hari', 'Puzzle santai tanpa batas waktu']
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };

/** Serves the project folder on a free local port, so the frame page and the game share one address. */
function serve() {
  const server = http.createServer((req, res) => {
    let file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (file.endsWith(path.sep)) file = path.join(file, 'index.html');
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function dayKey(offset) {
  const d = new Date(), pad = n => (n < 10 ? '0' : '') + n;
  d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

/** A save file that looks like a player who has reached the given level. */
function saveAt(level, extra) {
  const best = {};
  let stars = 0;
  for (let l = 1; l < level; l++) { best[l] = l % 4 === 0 ? 2 : 3; stars += best[l]; }
  return Object.assign({ seenHow: true, level: level, stars: stars, best: best, hints: 3,
    seen: { locked: 1, holes: 1, links: 1, wrap: 1 }, daily: { date: dayKey(-1), streak: 4 } }, extra || {});
}

/** The taps that solve a puzzle, in the order the power spreads from the socket. Solving only the
    first part of the list leaves a board that is lit in one connected piece. */
function solvingTaps(frame, mode, key) {
  return frame.evaluate(([mode, key]) => {
    const C = window.TTCore, p = mode === 'daily' ? C.dailyPuzzle(key) : C.levelPuzzle(key);
    const order = [], seen = new Uint8Array(p.n), queue = [p.src], taps = [], doneGroups = new Set();
    seen[p.src] = 1;
    while (queue.length) {
      const i = queue.shift();
      order.push(i);
      for (let d = 0; d < 4; d++) {
        if (!(p.mask[i] & (1 << d))) continue;
        const j = C.neighbor(p, i, d);
        if (j >= 0 && !seen[j]) { seen[j] = 1; queue.push(j); }
      }
    }
    for (const i of order) {
      if (p.locked[i]) continue;
      if (p.link[i] >= 0) { if (doneGroups.has(p.link[i])) continue; doneGroups.add(p.link[i]); }
      for (let k = C.tapsFor(p.mask[i], p.start[i]); k > 0; k--) taps.push(i);
    }
    return taps;
  }, [mode, key]);
}

async function tap(frame, cells) {
  for (const i of cells) await frame.click('button.cell[data-i="' + i + '"]');
}

// The five pictures. Each scene prepares the game inside the phone and returns when it is ready.
// A scene may return a time (as Date.now()) that the picture has to be taken before.
const SCENES = [
  { name: 'tap', save: saveAt(14), run: async frame => {
    await frame.click('[data-act="play"]');
    await frame.waitForSelector('#board button.cell');
    const taps = await solvingTaps(frame, 'level', 14);
    await tap(frame, taps.slice(0, Math.floor(taps.length * 0.45)));
    await frame.waitForTimeout(600);
  } },
  { name: 'lit', save: saveAt(23), run: async frame => {
    await frame.click('[data-act="play"]');
    await frame.waitForSelector('#board button.cell');
    const taps = await solvingTaps(frame, 'level', 23);
    await tap(frame, taps.slice(0, -1));
    await frame.waitForTimeout(400);
    await tap(frame, taps.slice(-1));
    // every lamp is lit and twinkles; the win dialog covers the board 1.3 seconds after the last tap
    const before = Date.now() + 1200;
    await frame.waitForTimeout(600);
    return before;
  } },
  { name: 'twists', save: saveAt(57), run: async frame => {
    await frame.click('[data-act="play"]');
    await frame.waitForSelector('#board button.cell');
    const taps = await solvingTaps(frame, 'level', 57);
    await tap(frame, taps.slice(0, Math.floor(taps.length * 0.6)));
    await frame.waitForTimeout(600);
  } },
  { name: 'daily', save: saveAt(30), run: async frame => {
    await frame.click('[data-act="daily"]');
    await frame.waitForSelector('#board button.cell');
    await tap(frame, await solvingTaps(frame, 'daily', dayKey(0)));
    await frame.waitForSelector('[data-act="share"]');
    await frame.waitForTimeout(900);
  } },
  { name: 'menu', save: saveAt(30), run: async frame => {
    await frame.waitForTimeout(1600); // the lamps on the menu come on one by one
  } }
];

(async () => {
  const wanted = process.argv.slice(2);
  const langs = wanted.length ? wanted : LANG.order;
  for (const lang of langs) if (!CAPTIONS[lang]) throw new Error('No captions for "' + lang + '". Add them at the top of shots.js.');

  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  const quiet = { args: ['--mute-audio'] }; // the Christmas music would otherwise play while the pictures are taken
  try { browser = await chromium.launch(Object.assign({ channel: 'chrome' }, quiet)); }
  catch (e) { browser = await chromium.launch(Object.assign({ channel: 'msedge' }, quiet)); }

  for (const set of [{ dir: 'year-round', theme: 'plain', xmas: 0 }, { dir: 'christmas', theme: 'xmas', xmas: 1 }]) {
    for (const lang of langs) {
      const dir = path.join(OUT, set.dir, lang);
      fs.mkdirSync(dir, { recursive: true });
      for (let n = 0, tries = 0; n < SCENES.length; n++) {
        const scene = SCENES[n];
        // 540 × 960 at double density gives a 1080 × 1920 picture
        const context = await browser.newContext({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
        // The game starts from this save file. The stand-in bridge makes it behave as it does inside
        // the Android app, so nothing that only belongs to the web version shows up in the pictures.
        await context.addInitScript(save => {
          localStorage.setItem('twinkletwist.v1', save);
          window.AndroidBridge = { haptic() {}, share() {}, askReview() {}, showPrivacyOptions() {},
            privacyOptionsRequired() { return false; }, showInterstitial() { return false; }, showRewarded() { return false; } };
        }, JSON.stringify(scene.save));
        const page = await context.newPage();
        const game = base + '/docs/play/index.html?lang=' + lang + '&xmas=' + set.xmas;
        await page.goto(base + '/tools/store-shots/frame.html?theme=' + set.theme +
          '&caption=' + encodeURIComponent(CAPTIONS[lang][n]) + '&game=' + encodeURIComponent(game));
        const frame = page.frames().find(f => f.url().indexOf('/docs/play/') >= 0) ||
          await page.waitForEvent('framenavigated', f => f.url().indexOf('/docs/play/') >= 0);
        await frame.waitForSelector('.wordmark');
        await page.evaluate(() => document.fonts.ready);
        const before = await scene.run(frame);
        const file = path.join(dir, (n + 1) + '-' + scene.name + '.png');
        await page.screenshot({ path: file });
        const late = before && Date.now() > before;
        await context.close();
        if (late && tries++ < 3) { n--; continue; } // too slow this time: take the same picture again
        tries = 0;
        console.log(path.relative(ROOT, file) + (late ? '   (may show the win dialog, check it)' : ''));
      }
    }
  }
  await browser.close();
  server.close();
})().catch(e => { console.error(e); process.exit(1); });
