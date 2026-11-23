/* Makes the ad video: about 20 seconds of the real game being played inside a phone, with captions
   and an end card. It is made for Google Ads (App campaigns show it inside other apps and on
   YouTube) and works just as well for sharing. Each video comes in three shapes, because ad
   networks ask for all of them: portrait 1080 × 1920, landscape 1920 × 1080 and square 1080 × 1080.
   Like the screenshots there are two sets, one for the whole year and one for Christmas.

   Run from the project root:

       cd tools/store-shots
       npm install                                         (only the first time)
       node video.js                                       (English, both sets, all three shapes)
       node video.js sv de                                 (other languages)
       node video.js en --set=christmas --format=portrait  (just one video)

   Needs Google Chrome or Microsoft Edge, and the copy of ffmpeg that Playwright uses for recording.
   If that is missing, the script says how to get it. The videos land in
   store-assets/video/<set>/<language>-<shape>.webm. That folder is not in git: make it again with
   this script. YouTube takes WebM files as they are.

   How it works: the game runs in a page where time stands still. For every video frame the script
   moves the time forward by 1/30 second, takes a picture and hands it to ffmpeg. The video is
   therefore perfectly even, however slow the computer is. The game's own sounds are written down
   while it is played and mixed afterwards, at Christmas together with the game's music. */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { ROOT, CAPTIONS, serve, launch, saveAt, solvingTaps } = require('./shots.js');

// ---------- Settings that are easy to tweak ----------
const FPS = 30;
const LEVEL_A = 12;        // the first board: solved from start to finish, at a calm pace
const LEVEL_B = 76;        // the second board: a big one, shown with only the last taps left …
const TAPS_B = 26;         // … this many
const MUSIC = 'docs/play/jingle-bells.mp3'; // plays in the Christmas set
const MUSIC_VOLUME = 0.5;  // 0–1
const SOUND_BOOST = 2.6;   // the game's own sounds are quiet; in the video they are this many times louder

// The line on the button of the end card. The other texts come from CAPTIONS in shots.js:
// the first three are shown one after the other, the last one is the line on the end card.
const CTA = {
  en: 'Free on Google Play', sv: 'Gratis på Google Play', de: 'Kostenlos bei Google Play', fr: 'Gratuit sur Google Play',
  es: 'Gratis en Google Play', pt: 'Grátis no Google Play', id: 'Gratis di Google Play'
};

const FORMATS = { portrait: [540, 960], landscape: [960, 540], square: [540, 540] }; // page size …
const SCALE = 2;                                                                     // … and the video is this many times larger
const SETS = [{ dir: 'year-round', theme: 'plain', xmas: 0 }, { dir: 'christmas', theme: 'xmas', xmas: 1 }];
const OUT = path.join(ROOT, 'store-assets', 'video');

/** Runs in every page before the page's own scripts. Time stands still until the stage moves it
    (see video.html), random numbers come out the same on every run, and the sounds the game makes
    are written down instead of played. */
function fakeWorld(seed) {
  let a = seed >>> 0;
  Math.random = function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // A clock of our own: timers only fire when __clock.tick() is called.
  const RealDate = Date, born = RealDate.now(), timers = new Map();
  let now = 0, ids = 0;
  function add(fn, delay, every, args) {
    const id = ++ids;
    timers.set(id, { id: id, at: now + Math.max(0, +delay || 0), fn: fn, every: every, args: args });
    return id;
  }
  window.__realRAF = window.requestAnimationFrame.bind(window);
  window.setTimeout = function (fn, ms, ...args) { return add(fn, ms, 0, args); };
  window.setInterval = function (fn, ms, ...args) { return add(fn, ms, Math.max(1, +ms || 0), args); };
  window.clearTimeout = window.clearInterval = window.cancelAnimationFrame = function (id) { timers.delete(id); };
  window.requestAnimationFrame = function (fn) { return add(function () { fn(now); }, 16, 0, []); };
  performance.now = function () { return now; };
  window.Date = class extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(born + now); }
    static now() { return born + now; }
  };
  window.__clock = {
    get now() { return now; },
    tick: function (ms) {
      const to = now + ms;
      for (;;) {
        let next = null;
        for (const t of timers.values()) if (t.at <= to && (!next || t.at < next.at)) next = t;
        if (!next) break;
        now = Math.max(now, next.at);
        if (next.every) next.at += next.every; else timers.delete(next.id);
        next.fn.apply(window, next.args);
      }
      now = to;
    }
  };

  // The game makes its sounds with an oscillator and a gain per tone (tone() in game.js). This
  // stand-in notes each tone in the top page instead: pitch, wave shape, loudness and when.
  const top = window.top;
  function NotedAudio() {
    return {
      state: 'running', destination: {}, resume: function () {},
      get currentTime() { return (top.__vt || 0) / 1000; },
      createGain: function () {
        const g = { ramps: [], connect: function () {} };
        g.gain = { setValueAtTime: function () {}, exponentialRampToValueAtTime: function (v, t) { g.ramps.push([v, t]); } };
        return g;
      },
      createOscillator: function () {
        const o = { type: 'sine', frequency: { value: 440 }, connect: function (g) { o.to = g; }, start: function (t) { o.at = t; } };
        o.stop = function () {
          const r = o.to && o.to.ramps;
          if (top.__rec && r && r.length === 2) top.__tones.push({ type: o.type, f: o.frequency.value, at: o.at, peak: r[0][0], peakAt: r[0][1], end: r[1][1] });
        };
        return o;
      }
    };
  }
  window.AudioContext = window.webkitAudioContext = NotedAudio;

  // The stand-in bridge makes the game behave as it does inside the Android app.
  window.AndroidBridge = { haptic() {}, share() {}, askReview() {}, showPrivacyOptions() {},
    privacyOptionsRequired() { return false; }, showInterstitial() { return false; }, showRewarded() { return false; } };
}

/** Runs in an ordinary page: mixes the noted tones and the music into one soundtrack and returns
    it as a WebM file with Opus sound, base64-encoded. Recording it takes as long as the video is. */
async function mixSound(o) {
  const rate = 48000, off = new OfflineAudioContext(2, Math.ceil(o.seconds * rate), rate);
  for (const t of o.tones) { // the same chain as tone() in game.js
    const osc = off.createOscillator(), g = off.createGain();
    osc.type = t.type; osc.frequency.value = t.f;
    g.gain.setValueAtTime(0.0001, t.at);
    g.gain.exponentialRampToValueAtTime(t.peak * o.boost, t.peakAt);
    g.gain.exponentialRampToValueAtTime(0.0001, t.end);
    osc.connect(g); g.connect(off.destination);
    osc.start(t.at); osc.stop(t.end + 0.03);
  }
  if (o.music) {
    const song = await off.decodeAudioData(await (await fetch(o.music)).arrayBuffer());
    const data = song.getChannelData(0), src = off.createBufferSource(), g = off.createGain();
    let first = 0;
    while (first < data.length && Math.abs(data[first]) < 0.01) first++; // skip the silence before the first note
    src.buffer = song; src.loop = true;
    g.gain.setValueAtTime(o.volume, Math.max(0, o.seconds - 1.6)); // fade out at the end
    g.gain.linearRampToValueAtTime(0, o.seconds);
    src.connect(g); g.connect(off.destination);
    src.start(0, first / song.sampleRate);
  }
  const mix = await off.startRendering();
  let peak = 0, c, i;
  for (c = 0; c < mix.numberOfChannels; c++) for (const v of mix.getChannelData(c)) if (Math.abs(v) > peak) peak = Math.abs(v);
  if (peak > 0.97) for (c = 0; c < mix.numberOfChannels; c++) { const d = mix.getChannelData(c); for (i = 0; i < d.length; i++) d[i] *= 0.97 / peak; }

  // Play the finished mix into a recorder, which packs it as Opus.
  const ctx = new AudioContext({ sampleRate: rate });
  await ctx.resume();
  const dest = ctx.createMediaStreamDestination(), play = ctx.createBufferSource(), parts = [];
  const rec = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
  rec.ondataavailable = function (e) { parts.push(e.data); };
  const stopped = new Promise(function (r) { rec.onstop = r; });
  play.buffer = mix; play.connect(dest);
  rec.start(); play.start();
  await new Promise(function (r) { play.onended = r; });
  await new Promise(function (r) { setTimeout(r, 200); });
  rec.stop();
  await stopped;
  const bytes = new Uint8Array(await new Blob(parts).arrayBuffer());
  let s = '';
  for (i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { webm: btoa(s), peak: peak };
}

/** The encoder. Playwright keeps a small copy of ffmpeg for recording video, and that is the one
    used here. It reads JPEG pictures and writes WebM, nothing else. Set FFMPEG to use another one. */
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const home = os.homedir();
  const places = [process.env.PLAYWRIGHT_BROWSERS_PATH, process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
    path.join(home, 'Library', 'Caches', 'ms-playwright'), path.join(home, '.cache', 'ms-playwright')];
  for (const dir of places) {
    if (!dir || !fs.existsSync(dir)) continue;
    const versions = fs.readdirSync(dir).filter(n => /^ffmpeg-\d+$/.test(n)).sort((x, y) => y.slice(7) - x.slice(7));
    for (const v of versions) {
      for (const exe of ['ffmpeg-win64.exe', 'ffmpeg-mac', 'ffmpeg-linux']) {
        if (fs.existsSync(path.join(dir, v, exe))) return path.join(dir, v, exe);
      }
    }
  }
  throw new Error('Found no ffmpeg. Run "npx playwright-core install ffmpeg" in tools/store-shots and try again.');
}

/** Runs ffmpeg. Returns { write, end }: write(picture) hands it a picture, end() resolves when ffmpeg is done. */
function ffmpeg(exe, args) {
  const child = spawn(exe, ['-loglevel', 'error', '-y'].concat(args), { stdio: ['pipe', 'ignore', 'pipe'] });
  let said = '';
  child.stderr.on('data', d => { said += d; });
  child.stdin.on('error', () => {}); // why it stopped reading is told when it closes
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => (code ? reject(new Error('ffmpeg stopped: ' + said.trim())) : resolve()));
  });
  return {
    write: buf => (child.stdin.write(buf) ? null : new Promise(r => child.stdin.once('drain', r))),
    end: () => { child.stdin.end(); return done; }
  };
}

/** What happens when: a list of { frame, do, … } in the order it happens, and the number of frames. */
function timeline(tapsA, tapsB) {
  const list = [];
  const at = (ms, what) => list.push(Object.assign({ frame: Math.round(ms * FPS / 1000) }, what));
  let seed = 7, t = 700;
  // a little unevenness, the same on every run, so that the taps do not sound like a machine
  const uneven = span => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x7fffffff - 0.5) * span; };

  tapsA.forEach((cell, k) => { // the first board: slow at first, then quicker
    if (k) t += cell === tapsA[k - 1] ? 150 : Math.max(220, 340 - k * 12) + uneven(50);
    at(t, { do: 'tap', g: 'A', i: cell });
  });
  at(t + 150, { do: 'caption', n: 1 });
  t += 3100;                                   // the lamps twinkle and the win dialog comes up with its stars
  at(t, { do: 'scene', name: 'b' });           // the big board slides in
  at(t, { do: 'caption', n: 2 });
  t += 750;
  tapsB.forEach((cell, k) => {
    if (k) t += cell === tapsB[k - 1] ? 85 : 120 + uneven(24);
    at(t, { do: 'tap', g: 'B', i: cell });
  });
  t += 2300;                                   // the whole board twinkles
  at(t, { do: 'scene', name: 'end' });
  t += 3600;                                   // the end card

  list.sort((x, y) => x.frame - y.frame);
  list.forEach(x => { x.t = x.frame * 1000 / FPS; });
  return { list: list, frames: Math.round(t * FPS / 1000) };
}

/** Records one video without sound. Returns the tones the game played and the length in seconds. */
async function film(browser, base, exe, lang, set, format, file) {
  const size = FORMATS[format];
  const context = await browser.newContext({ viewport: { width: size[0], height: size[1] }, deviceScaleFactor: SCALE });
  await context.addInitScript(fakeWorld, 20261122);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e));
  const cdp = await context.newCDPSession(page);

  await page.goto(base + '/tools/store-shots/video.html?format=' + format + '&theme=' + set.theme);
  await page.evaluate(o => window.stage.setup(o), { captions: CAPTIONS[lang], tagline: CAPTIONS[lang][4], cta: CTA[lang] });
  const game = base + '/docs/play/index.html?lang=' + lang + '&xmas=' + set.xmas;
  await page.evaluate(([url, save]) => window.stage.load('A', url, save, false), [game, JSON.stringify(saveAt(LEVEL_A))]);
  await page.evaluate(([url, save]) => window.stage.load('B', url, save, true), [game, JSON.stringify(saveAt(LEVEL_B))]);

  const inGame = page.frames().find(f => f.url().indexOf('/docs/play/') >= 0);
  const tapsA = await solvingTaps(inGame, 'level', LEVEL_A);
  const tapsB = await solvingTaps(inGame, 'level', LEVEL_B);
  const left = Math.min(TAPS_B, tapsB.length);
  await page.evaluate(early => {
    window.stage.click('A', '[data-act="play"]');
    window.stage.click('B', '[data-act="play"]');
    window.stage.pretap('B', early);
    window.stage.settle(3000);
    return window.stage.fonts();
  }, tapsB.slice(0, tapsB.length - left));

  const plan = timeline(tapsA, tapsB.slice(tapsB.length - left));
  const out = ffmpeg(exe, ['-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', 'pipe:0',
    '-c:v', 'libvpx', '-b:v', '9M', '-crf', '5', '-qmin', '0', '-qmax', '30', '-deadline', 'good', '-cpu-used', '2',
    '-threads', String(Math.min(8, os.cpus().length)), '-g', String(FPS * 2), '-pix_fmt', 'yuv420p', file]);
  await page.evaluate(() => window.stage.start());
  for (let n = 0; n < plan.frames; n++) {
    const due = [];
    while (plan.list.length && plan.list[0].frame < n) due.push(plan.list.shift());
    await page.evaluate(([t, due]) => window.stage.step(t, due), [n * 1000 / FPS, due]);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 100,
      clip: { x: 0, y: 0, width: size[0], height: size[1], scale: SCALE }, captureBeyondViewport: false });
    await out.write(Buffer.from(shot.data, 'base64'));
    if (errors.length) throw errors[0];
  }
  await out.end();
  const tones = await page.evaluate(() => window.__tones);
  await context.close();
  return { tones: tones, seconds: plan.frames / FPS };
}

const sounds = new Map(); // the soundtrack only depends on the set, so each one is mixed once

/** The soundtrack for a recording, as a WebM file with only sound in it. */
async function soundtrack(browser, base, set, shot) {
  const key = set.dir + JSON.stringify(shot);
  if (!sounds.has(key)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(base + '/tools/store-shots/video.html');
    const mixed = await page.evaluate(mixSound, { tones: shot.tones, seconds: shot.seconds, boost: SOUND_BOOST,
      music: set.xmas ? base + '/' + MUSIC : null, volume: MUSIC_VOLUME });
    await context.close();
    sounds.set(key, Buffer.from(mixed.webm, 'base64'));
  }
  return sounds.get(key);
}

async function main() {
  const args = process.argv.slice(2);
  const pick = name => { const a = args.find(x => x.startsWith('--' + name + '=')); return a ? a.slice(name.length + 3).split(',') : null; };
  const langs = args.filter(a => !a.startsWith('--'));
  if (!langs.length) langs.push('en');
  for (const lang of langs) if (!CAPTIONS[lang] || !CTA[lang]) throw new Error('No texts for "' + lang + '". Add them to CAPTIONS in shots.js and CTA in video.js.');
  const sets = SETS.filter(s => !pick('set') || pick('set').includes(s.dir));
  const formats = Object.keys(FORMATS).filter(f => !pick('format') || pick('format').includes(f));
  if (!sets.length || !formats.length) throw new Error('Nothing to make. --set is year-round or christmas, --format is portrait, landscape or square.');

  const exe = findFfmpeg();
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await launch(['--autoplay-policy=no-user-gesture-required']); // lets the soundtrack be recorded without a tap
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'twinkle-video-'));
  try {
    for (const set of sets) {
      for (const lang of langs) {
        for (const format of formats) {
          const file = path.join(OUT, set.dir, lang + '-' + format + '.webm');
          const silent = path.join(tmp, 'picture.webm'), sound = path.join(tmp, 'sound.webm');
          fs.mkdirSync(path.dirname(file), { recursive: true });
          const shot = await film(browser, base, exe, lang, set, format, silent);
          fs.writeFileSync(sound, await soundtrack(browser, base, set, shot));
          await ffmpeg(exe, ['-i', silent, '-i', sound, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-shortest', file]).end();
          console.log(path.relative(ROOT, file) + '   ' + shot.seconds.toFixed(1) + ' s, ' + (fs.statSync(file).size / 1048576).toFixed(1) + ' MB');
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
