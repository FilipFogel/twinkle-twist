/* Ljusslinga – spelkärna: skapar nivåer och räknar ut vad som lyser.
   Ren JavaScript utan beroenden. Körs både i appens WebView och i Node (för tester).

   En bit beskrivs av en bitmask över fyra håll: 1 = upp, 2 = höger, 4 = ner, 8 = vänster.
   Lösningen är ett träd som når alla rutor från eluttaget. Spelaren vrider bitarna ett
   kvarts varv medurs i taget tills allt hänger ihop. */
(function (root) {
  'use strict';

  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];

  /** Deterministisk slumpgenerator (mulberry32) så att nivå N alltid blir samma pussel. */
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Vrider en bit k kvarts varv medurs. */
  function rot(mask, k) {
    k &= 3;
    return ((mask << k) | (mask >> (4 - k))) & 15;
  }

  /** Efter hur många kvarts varv biten ser likadan ut igen. */
  function period(mask) {
    if (mask === 15 || mask === 0) return 1;
    return (mask === 5 || mask === 10) ? 2 : 4;
  }

  function degree(mask) {
    return (mask & 1) + (mask >> 1 & 1) + (mask >> 2 & 1) + (mask >> 3 & 1);
  }

  /** Grannrutan åt håll d, eller -1 om där är kant eller hål. */
  function neighbor(p, i, d) {
    var x = i % p.w + DX[d], y = Math.floor(i / p.w) + DY[d];
    if (p.wrap) { x = (x + p.w) % p.w; y = (y + p.h) % p.h; }
    else if (x < 0 || y < 0 || x >= p.w || y >= p.h) return -1;
    var j = y * p.w + x;
    return p.hole[j] ? -1 : j;
  }

  /** Vilka rutor har kontakt med eluttaget just nu? r = antal vridningar per ruta. */
  function lit(p, r) {
    var on = new Uint8Array(p.n), stack = [p.src], count = 1;
    on[p.src] = 1;
    while (stack.length) {
      var i = stack.pop(), m = rot(p.mask[i], r[i]);
      for (var d = 0; d < 4; d++) {
        if (!(m & (1 << d))) continue;
        var j = neighbor(p, i, d);
        if (j < 0 || on[j]) continue;
        if (rot(p.mask[j], r[j]) & (1 << ((d + 2) & 3))) { on[j] = 1; count++; stack.push(j); }
      }
    }
    return { on: on, count: count, done: count === p.cells };
  }

  /** Rutorna som vrids när man trycker på ruta i (tvillingar vrids tillsammans). */
  function groupOf(p, i) {
    return p.link[i] >= 0 ? p.groups[p.link[i]] : [i];
  }

  /** Antal tryck som återstår innan biten sitter som i lösningen. */
  function tapsFor(mask, r) {
    var per = period(mask);
    return (per - r % per) % per;
  }

  /** Minsta antal tryck som löser pusslet från läget r, enligt den skapade lösningen. */
  function minTaps(p, r) {
    var total = 0, i;
    for (i = 0; i < p.n; i++) if (!p.hole[i] && p.link[i] < 0) total += tapsFor(p.mask[i], r[i]);
    for (i = 0; i < p.groups.length; i++) total += tapsFor(p.mask[p.groups[i][0]], r[p.groups[i][0]]);
    return total;
  }

  /** Nästa bit en ledtråd ska rätta till: den felvända bit som ligger närmast eluttaget. */
  function hintTarget(p, r, fixed) {
    var seen = new Uint8Array(p.n), queue = [p.src];
    seen[p.src] = 1;
    while (queue.length) {
      var i = queue.shift();
      if (!fixed[i] && tapsFor(p.mask[i], r[i]) > 0) return i;
      for (var d = 0; d < 4; d++) {
        if (!(p.mask[i] & (1 << d))) continue;
        var j = neighbor(p, i, d);
        if (j >= 0 && !seen[j]) { seen[j] = 1; queue.push(j); }
      }
    }
    return -1;
  }

  /** Kort fingeravtryck av pusslet, så att en sparning aldrig läggs på fel pussel. */
  function signature(p) {
    var h = 7, s = p.w + 'x' + p.h + ':' + p.mask.join(',') + ':' + p.start.join('');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
  }

  function tryGenerate(rnd, spec) {
    var w = spec.w, h = spec.h, N = w * h, i, d, j, g;
    var p = { w: w, h: h, n: N, wrap: !!spec.wrap, hole: new Array(N).fill(0), mask: new Array(N).fill(0),
              locked: new Array(N).fill(0), link: new Array(N).fill(-1), groups: [], src: 0 };
    var sx = Math.floor((w - 1) / 2), sy = Math.floor((h - 1) / 2);
    if (w >= 5) sx += Math.floor(rnd() * 3) - 1;
    if (h >= 5) sy += Math.floor(rnd() * 3) - 1;
    p.src = sy * w + sx;

    // Hål i brädet: utspridda, aldrig intill varandra eller intill eluttaget.
    var wantHoles = p.wrap ? 0 : (spec.holes || 0);
    for (var tries = 0; tries < 80 && wantHoles > 0; tries++) {
      var c = Math.floor(rnd() * N), cx = c % w, cy = Math.floor(c / w), clash = false;
      for (var yy = -1; yy <= 1; yy++) for (var xx = -1; xx <= 1; xx++) {
        var qx = cx + xx, qy = cy + yy, q = qy * w + qx;
        if (qx >= 0 && qx < w && qy >= 0 && qy < h && (p.hole[q] || q === p.src)) clash = true;
      }
      if (clash) continue;
      p.hole[c] = 1; wantHoles--;
    }

    // Väx ett träd från eluttaget. Högst tre sladdar per bit, så att kryss nästan aldrig uppstår.
    var seen = new Uint8Array(N), deg = new Uint8Array(N), frontier = [];
    var dfs = 0.25 + rnd() * 0.5; // högt = långa slingor, lågt = många förgreningar
    function connect(a, dir, b) {
      p.mask[a] |= 1 << dir; p.mask[b] |= 1 << ((dir + 2) & 3);
      deg[a]++; deg[b]++; seen[b] = 1;
      for (var k = 0; k < 4; k++) { var nb = neighbor(p, b, k); if (nb >= 0 && !seen[nb]) frontier.push([b, k, nb]); }
    }
    seen[p.src] = 1;
    for (d = 0; d < 4; d++) { j = neighbor(p, p.src, d); if (j >= 0 && j !== p.src) frontier.push([p.src, d, j]); }
    while (frontier.length) {
      var pick = rnd() < dfs ? frontier.length - 1 - Math.floor(rnd() * Math.min(3, frontier.length))
                             : Math.floor(rnd() * frontier.length);
      var e = frontier.splice(pick, 1)[0];
      if (seen[e[2]] || deg[e[0]] >= 3) continue;
      connect(e[0], e[1], e[2]);
    }
    // Rutor som blev över kopplas in ändå. Är de helt avskurna blir de hål.
    var changed = true;
    while (changed) {
      changed = false;
      for (i = 0; i < N; i++) {
        if (seen[i] || p.hole[i]) continue;
        for (d = 0; d < 4 && !seen[i]; d++) {
          j = neighbor(p, i, d);
          if (j >= 0 && seen[j]) { connect(j, (d + 2) & 3, i); changed = true; }
        }
      }
    }
    p.cells = 0; p.lamps = 0;
    for (i = 0; i < N; i++) {
      if (!seen[i]) { p.hole[i] = 1; p.mask[i] = 0; continue; }
      p.cells++;
      if (deg[i] === 1 && i !== p.src) p.lamps++;
    }
    if (p.cells < N * 0.75 || p.lamps < 2) return null;

    // Fastskruvade bitar (sitter redan rätt) och tvillingar (vrids tillsammans).
    var pool = [];
    for (i = 0; i < N; i++) if (!p.hole[i] && period(p.mask[i]) > 1) pool.push(i);
    for (i = pool.length - 1; i > 0; i--) { j = Math.floor(rnd() * (i + 1)); var t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    var at = 0, lockCount = Math.min(spec.locked || 0, Math.floor(pool.length / 3));
    while (lockCount-- > 0) p.locked[pool[at++]] = 1;
    var turners = [];
    for (; at < pool.length; at++) {
      var c2 = pool[at];
      // tvillingar väljs bland hörn och T-bitar: de har fyra lägen och ingen lampa i mitten
      if (c2 !== p.src && period(p.mask[c2]) === 4 && deg[c2] >= 2) turners.push(c2);
    }
    for (g = 0; g < (spec.links || 0) && turners.length >= 2; g++) {
      var a1 = turners.pop(), b1 = turners.pop();
      p.link[a1] = g; p.link[b1] = g; p.groups.push([a1, b1]);
    }

    // Blanda: vrid bitarna slumpvis. Fastskruvade bitar rörs inte.
    var scramble = spec.scramble || 0.88;
    p.start = new Array(N).fill(0);
    for (i = 0; i < N; i++) {
      if (p.hole[i] || p.locked[i] || p.link[i] >= 0) continue;
      var per = period(p.mask[i]);
      if (per > 1 && rnd() < scramble) p.start[i] = spec.gentle ? per - 1 : 1 + Math.floor(rnd() * (per - 1));
    }
    for (g = 0; g < p.groups.length; g++) {
      var turn = 1 + Math.floor(rnd() * 3);
      p.start[p.groups[g][0]] = turn; p.start[p.groups[g][1]] = turn;
    }
    p.par = minTaps(p, p.start);
    if (p.par < (spec.gentle ? 2 : 4) || lit(p, p.start).done) return null;
    return p;
  }

  /** Skapar ett pussel. Samma (seed, spec) ger alltid samma pussel. */
  function generate(seed, spec) {
    var attempt, p;
    for (attempt = 0; attempt < 40; attempt++) {
      p = tryGenerate(makeRng((seed * 9973 + attempt * 7919 + spec.w * 31 + spec.h) >>> 0), spec);
      if (p) return p;
    }
    var plain = { w: spec.w, h: spec.h };
    for (attempt = 0; attempt < 40; attempt++) {
      p = tryGenerate(makeRng((seed + attempt * 13 + 1) >>> 0), plain);
      if (p) return p;
    }
    return null;
  }

  /** Nivåkurva: brädet växer, sedan kommer skruvar, hål, tvillingar och till sist sammanlänkade kanter. */
  function levelSpec(level) {
    var s;
    // gentle = varje felvänd bit är bara ett tryck från rätt läge
    if (level === 1) s = { w: 3, h: 3, scramble: 0.4, gentle: true };
    else if (level === 2) s = { w: 3, h: 3, scramble: 0.7, gentle: true };
    else if (level <= 4) s = { w: 3, h: 4, scramble: 0.7 };
    else if (level <= 7) s = { w: 4, h: 4 };
    else if (level <= 11) s = { w: 4, h: 5 };
    else if (level <= 15) s = { w: 5, h: 5 };
    else if (level <= 20) s = { w: 5, h: 6, locked: level <= 17 ? 4 : 2 };
    else if (level <= 28) s = { w: 5, h: 7, locked: 2, holes: level % 2 ? 0 : 2 };
    else if (level <= 40) s = { w: 6, h: 7, locked: 2, links: level < 35 ? 1 : 2, holes: level % 3 === 0 ? 2 : 0 };
    else if (level <= 55) s = { w: 6, h: 8, locked: 2, links: 2, holes: level % 2 ? 3 : 0 };
    else if (level <= 75) s = { w: 7, h: 8, locked: 2, links: level % 2 ? 2 : 3, holes: level % 3 === 0 ? 3 : 0 };
    else s = { w: 7, h: 9, locked: 2, links: 3, holes: level % 3 === 0 ? 4 : 0 };
    if (level >= 50 && level % 5 === 0) {
      s = level < 80 ? { w: 5, h: 6, wrap: true, locked: 6, links: 1 } : { w: 6, h: 7, wrap: true, locked: 7, links: 2 };
    }
    return s;
  }

  function levelPuzzle(level) {
    return generate(5000 + level, levelSpec(level));
  }

  /** Dagens slinga: samma för alla spelare samma dag. dateKey = "ÅÅÅÅ-MM-DD". */
  function dailyPuzzle(dateKey) {
    var num = parseInt(dateKey.replace(/-/g, ''), 10);
    var dow = new Date(dateKey + 'T12:00:00').getDay();
    var spec = (dow === 0 || dow === 6) ? { w: 6, h: 7, wrap: true, locked: 7, links: 2 }
                                        : { w: 7, h: 8, locked: 3, links: 2, holes: dow % 2 ? 3 : 0 };
    return generate(num, spec);
  }

  var api = { makeRng: makeRng, rot: rot, period: period, degree: degree, neighbor: neighbor, lit: lit,
              groupOf: groupOf, minTaps: minTaps, tapsFor: tapsFor, hintTarget: hintTarget,
              signature: signature, generate: generate, levelSpec: levelSpec, levelPuzzle: levelPuzzle,
              dailyPuzzle: dailyPuzzle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LSCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
