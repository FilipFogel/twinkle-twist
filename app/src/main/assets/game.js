/* Ljusslinga – gränssnitt: skärmar, tryck, ledtrådar, stjärnor, sparning och annonser.
   Annonser visas av Android-skalet via window.AndroidBridge. Utan brygga (t.ex. i en
   vanlig webbläsare) visas en enkel platshållare så att flödet går att prova. */
(function () {
  'use strict';

  var C = window.LSCore;
  var bridge = window.AndroidBridge || null;
  var SAVE_KEY = 'ljusslinga.v1';

  // ---------- Inställningar som är lätta att skruva på ----------
  var START_HINTS = 3;          // ledtrådar från start
  var HINTS_PER_AD = 2;         // ledtrådar per belönad annons
  var LEVELS_BETWEEN_ADS = 3;   // helskärmsannons var N:e avklarade nivå …
  var FIRST_AD_LEVEL = 6;       // … men aldrig före den här nivån
  var LONG_PRESS_MS = 420;      // så länge håller man inne för att nåla fast en bit
  var LAMP = ['#FF5D5D', '#FFB81F', '#22C58B', '#3B9BFF', '#9B6BFF', '#FF6FB5'];
  var LETTER = ['#E5484D', '#F08400', '#12A679', '#2F7BFF', '#8B5CF6', '#E64C9C']; // ordbildens bokstäver, mörkare för läsbarhet

  // ---------- Texter ----------
  var STR = {
    sv: {
      tagline: 'Vrid bitarna tills hela slingan lyser.',
      play: 'Spela nivå {n}', daily: 'Dagens slinga', dailyNew: 'En ny slinga varje dag',
      dailyStreak: '{n} dagar i rad', dailyDone: 'Klar i dag', howto: 'Så spelar du',
      settings: 'Inställningar', stars: '{n} stjärnor', level: 'Nivå {n}', wrapTag: 'runt kanten',
      atMost: 'högst {n}', taps: 'Antal drag', lampsLit: '{a} av {b} lampor lyser',
      tip1: 'Tryck på en bit så vrids den ett kvarts varv.',
      tip2: 'Strömmen kommer från den gula rutan. Alla lampor ska lysa.',
      tip3: 'Håll inne på en bit för att nåla fast den när du vet att den sitter rätt.',
      introLocked: 'Bitar med skruvar sitter fast. De är redan rätt vända.',
      introHoles: 'Här saknas några rutor. Dra slingan runt hålen.',
      introLinks: 'Bitar med samma symbol sitter ihop. Vrider du den ena vrids den andra.',
      introWrap: 'Kanterna hänger ihop. En sladd som går ut till höger kommer in från vänster.',
      fixedMsg: 'Den biten sitter fast.', pinnedMsg: 'Du har nålat fast den biten. Håll inne för att lossa den.',
      pinOn: 'Biten är fastnålad.', pinOff: 'Biten är loss igen.',
      hintDone: 'Den markerade biten sitter rätt nu och är låst.',
      winLevel: 'Nivå {n} klar', winDaily: 'Dagens slinga lyser',
      winTaps: 'Du använde {a} drag.', winBest: 'Det gav tre stjärnor.', winNeed: 'Tre stjärnor kräver högst {n}.',
      dailyReward: 'Du fick 1 ledtråd.', dailyAgain: 'En ny slinga väntar i morgon.',
      next: 'Nästa nivå', retry: 'Försök igen', home: 'Till menyn',
      restartTitle: 'Börja om nivån?', restartText: 'Bitarna vrids tillbaka och dragen nollställs.',
      restart: 'Börja om', keepPlaying: 'Fortsätt spela',
      noHintsTitle: 'Slut på ledtrådar', noHintsText: 'Titta på en kort annons så får du {n} nya.',
      watchAd: 'Titta på annons', notNow: 'Inte nu', gotHints: 'Du fick {n} ledtrådar',
      adUnavailable: 'Ingen annons finns just nu. Försök igen om en stund.',
      setSound: 'Ljud', setHaptics: 'Vibration', setLang: 'Språk', langName: 'Svenska',
      setPrivacy: 'Annonsval och integritet', setReset: 'Nollställ framsteg',
      setResetSure: 'Tryck igen för att nollställa allt', resetDone: 'Framstegen är nollställda',
      close: 'Stäng', letsGo: 'Då kör vi',
      how1: 'Tryck på en bit så vrids den ett kvarts varv.', how1b: 'Här är slingan bruten.',
      how2: 'Koppla ihop sladdarna så att strömmen når varje lampa.', how2b: 'När alla lyser är nivån klar.',
      how3: 'Färre drag ger fler stjärnor.', how3b: 'Håll inne på en bit för att nåla fast den.',
      adSim: 'Här visas en annons i appen', adSimNote: 'Förhandsvisning utan riktiga annonser.',
      adSimWait: 'Vänta {n} …', back: 'Tillbaka', hint: 'Ledtråd',
      ariaLamp: 'Lampa', ariaSrc: 'Eluttag', ariaCable: 'Sladd', ariaOn: 'har ström', ariaOff: 'saknar ström',
      ariaFixed: 'sitter fast'
    },
    en: {
      tagline: 'Turn the pieces until the whole string lights up.',
      play: 'Play level {n}', daily: 'Daily string', dailyNew: 'A new string every day',
      dailyStreak: '{n} days in a row', dailyDone: 'Done for today', howto: 'How to play',
      settings: 'Settings', stars: '{n} stars', level: 'Level {n}', wrapTag: 'wraps around',
      atMost: 'at most {n}', taps: 'Moves', lampsLit: '{a} of {b} lamps lit',
      tip1: 'Tap a piece to turn it a quarter turn.',
      tip2: 'Power comes from the yellow square. Every lamp should light up.',
      tip3: 'Press and hold a piece to pin it once you know it is right.',
      introLocked: 'Pieces with screws are fixed. They already face the right way.',
      introHoles: 'Some squares are missing here. Lead the string around the gaps.',
      introLinks: 'Pieces with the same symbol are linked. Turn one and the other turns too.',
      introWrap: 'The edges are joined. A cable leaving on the right comes back in on the left.',
      fixedMsg: 'That piece is fixed.', pinnedMsg: 'You pinned that piece. Press and hold to release it.',
      pinOn: 'The piece is pinned.', pinOff: 'The piece is free again.',
      hintDone: 'The highlighted piece is right now and locked.',
      winLevel: 'Level {n} done', winDaily: 'The daily string is lit',
      winTaps: 'You used {a} moves.', winBest: 'That earned three stars.', winNeed: 'Three stars need at most {n}.',
      dailyReward: 'You earned 1 hint.', dailyAgain: 'A new string is waiting tomorrow.',
      next: 'Next level', retry: 'Try again', home: 'Back to menu',
      restartTitle: 'Start the level over?', restartText: 'The pieces turn back and your moves reset.',
      restart: 'Start over', keepPlaying: 'Keep playing',
      noHintsTitle: 'Out of hints', noHintsText: 'Watch a short ad to get {n} more.',
      watchAd: 'Watch ad', notNow: 'Not now', gotHints: 'You got {n} hints',
      adUnavailable: 'No ad is available right now. Try again in a moment.',
      setSound: 'Sound', setHaptics: 'Vibration', setLang: 'Language', langName: 'English',
      setPrivacy: 'Ad choices and privacy', setReset: 'Reset progress',
      setResetSure: 'Tap again to reset everything', resetDone: 'Progress has been reset',
      close: 'Close', letsGo: "Let's go",
      how1: 'Tap a piece to turn it a quarter turn.', how1b: 'Here the string is broken.',
      how2: 'Join the cables so power reaches every lamp.', how2b: 'When all of them shine, the level is done.',
      how3: 'Fewer moves earn more stars.', how3b: 'Press and hold a piece to pin it.',
      adSim: 'An ad is shown here in the app', adSimNote: 'Preview without real ads.',
      adSimWait: 'Wait {n} …', back: 'Back', hint: 'Hint',
      ariaLamp: 'Lamp', ariaSrc: 'Power socket', ariaCable: 'Cable', ariaOn: 'has power', ariaOff: 'has no power',
      ariaFixed: 'fixed'
    }
  };

  function lang() {
    if (S.lang) return S.lang;
    return (navigator.language || 'sv').toLowerCase().indexOf('sv') === 0 ? 'sv' : 'en';
  }
  function t(key, vars) {
    var s = STR[lang()][key];
    if (s === undefined) s = STR.sv[key];
    if (vars) for (var k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  // ---------- Bilder (inbäddad SVG) ----------
  var ICON = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.6"/><circle cx="9" cy="17" r="2.6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
    redo: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 5 13.5h5.5L9.5 22 19 10h-6z" fill="currentColor"/></svg>'
  };

  /** Ritar en bit. Sladdarna ligger i ett lager som vrids, lampa och eluttag i ett som står still. */
  function tileHTML(mask, o) {
    var d = '', s, g = o.group;
    if (mask & 1) d += 'M50 50V-1';
    if (mask & 2) d += 'M50 50H101';
    if (mask & 4) d += 'M50 50V101';
    if (mask & 8) d += 'M50 50H-1';
    s = '<span class="spin" style="transform:rotate(' + (o.turns || 0) * 90 + 'deg)"><svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<rect class="plate" x="2.5" y="2.5" width="95" height="95" rx="13"/>';
    if (g >= 0) s += '<rect class="twin-ring g' + g + '" x="8" y="8" width="84" height="84" rx="9"/>';
    if (o.locked) s += '<circle class="screw" cx="14" cy="14" r="4.5"/><circle class="screw" cx="86" cy="14" r="4.5"/><circle class="screw" cx="14" cy="86" r="4.5"/><circle class="screw" cx="86" cy="86" r="4.5"/>';
    s += '<path class="halo" d="' + d + '"/><path class="wire" d="' + d + '"/><circle class="joint" cx="50" cy="50" r="6.5"/>';
    if (g === 0) s += '<path class="twin-mark g0" d="M50 30 70 50 50 70 30 50Z"/>';
    else if (g === 1) s += '<rect class="twin-mark g1" x="34" y="34" width="32" height="32" rx="5"/>';
    else if (g === 2) s += '<path class="twin-mark g2" d="M50 30 70 66H30Z"/>';
    s += '</svg></span><span class="top">';
    if (o.kind === 'lamp') s += '<i class="bulb" style="--c:' + o.color + '"></i>';
    if (o.kind === 'src') s += '<i class="plug">' + ICON.bolt + '</i>';
    return s + '<i class="pin"></i></span>';
  }

  /** Namnet med en färg per bokstav, som lamporna på slingan. */
  function wordmark() {
    return 'Ljusslinga'.split('').map(function (ch, k) {
      return '<span aria-hidden="true" style="--c:' + LETTER[k % LETTER.length] + '">' + ch + '</span>';
    }).join('');
  }

  /** Ljusslingan på menyn: en sladd i två bågar med sex kulörta lampor. */
  function swag() {
    var pts = [[32, 41], [95, 59], [158, 50.5], [242, 50.5], [305, 59], [368, 41]];
    var s = '<svg class="swag" viewBox="0 0 400 112" aria-hidden="true"><defs>', k;
    for (k = 0; k < LAMP.length; k++) {
      s += '<radialGradient id="au' + k + '"><stop offset="0" stop-color="' + LAMP[k] + '" stop-opacity=".6"/>' +
        '<stop offset="1" stop-color="' + LAMP[k] + '" stop-opacity="0"/></radialGradient>';
    }
    s += '</defs><path class="cable" d="M-10 14Q95 96 200 30Q305 96 410 14"/>';
    for (k = 0; k < pts.length; k++) {
      var x = pts[k][0], y = pts[k][1], c = k % LAMP.length;
      s += '<circle class="aura" style="--i:' + k + '" cx="' + x + '" cy="' + (y + 21) + '" r="34" fill="url(#au' + c + ')"/>' +
        '<rect class="socket" x="' + (x - 4.5) + '" y="' + (y - 1) + '" width="9" height="11" rx="2"/>' +
        '<circle class="lamp" style="--i:' + k + '" cx="' + x + '" cy="' + (y + 21) + '" r="12" fill="' + LAMP[c] + '"/>';
    }
    return s + '</svg>';
  }

  // ---------- Sparat tillstånd ----------
  function defaults() {
    return { level: 1, stars: 0, best: {}, hints: START_HINTS, sound: true, haptics: true, lang: null,
             daily: { date: null, streak: 0 }, sinceAd: 0, seenHow: false, seen: {}, cur: {} };
  }
  function load() {
    var d = defaults();
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) { var o = JSON.parse(raw); for (var k in o) if (k in d) d[k] = o[k]; }
    } catch (e) { /* sparning saknas eller är trasig – börja om från början */ }
    ['best', 'seen', 'cur'].forEach(function (k) { if (!d[k] || typeof d[k] !== 'object') d[k] = {}; });
    if (!d.daily || typeof d.daily !== 'object') d.daily = { date: null, streak: 0 };
    return d;
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* fullt eller avstängt */ } }

  var S = load();
  var G = null;      // pågående parti
  var cells = [];    // rutornas element, en per ruta

  function $(sel, el) { return (el || document).querySelector(sel); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return fmt(new Date()); }
  function dayBefore(key) { var d = new Date(key + 'T12:00:00'); d.setDate(d.getDate() - 1); return fmt(d); }

  // ---------- Ljud och vibration ----------
  var ac = null;
  function tone(f, t0, dur, type, vol) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function sfx(name, amount) {
    if (!S.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      var n = ac.currentTime;
      if (name === 'turn') tone(300, n, 0.05, 'triangle', 0.06);
      else if (name === 'link') tone(392 * Math.pow(2, amount || 0), n, 0.16, 'sine', 0.12); // ljusare ju mer som lyser
      else if (name === 'nope') tone(150, n, 0.12, 'sawtooth', 0.05);
      else if (name === 'pin') tone(620, n, 0.07, 'square', 0.04);
      else if (name === 'win') [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, n + i * 0.1, 0.26, 'triangle', 0.12); });
    } catch (e) { /* inget ljud på den här enheten */ }
  }
  function haptic(kind) {
    if (!S.haptics) return;
    try {
      if (bridge) bridge.haptic(kind);
      else if (navigator.vibrate) navigator.vibrate(kind === 'bad' ? [20, 30, 20] : kind === 'ok' ? 18 : 8);
    } catch (e) { /* saknas */ }
  }

  // ---------- Annonser ----------
  var adCb = null;
  var Ads = {
    /** Belönad annons. cb(true) om spelaren såg klart och ska ha sin belöning. */
    rewarded: function (kind, cb) {
      if (adCb || $('.adsim')) return; // en annons i taget
      if (!bridge) { simAd(true, cb); return; }
      var started = false;
      adCb = cb;
      try { started = !!bridge.showRewarded(kind); } catch (e) { started = false; }
      if (!started) { adCb = null; cb(false); }
    },
    /** Helskärmsannons mellan nivåer. cb() körs när spelet ska fortsätta. */
    interstitial: function (cb) {
      if (adCb || $('.adsim')) { cb(); return; }
      if (!bridge) { simAd(false, function () { cb(); }); return; }
      var started = false;
      adCb = function () { cb(); };
      try { started = !!bridge.showInterstitial(); } catch (e) { started = false; }
      if (!started) { adCb = null; cb(); }
    }
  };
  function simAd(rewarded, cb) {
    var el = document.createElement('div'), left = rewarded ? 3 : 0;
    el.className = 'adsim';
    document.body.appendChild(el);
    function draw() {
      el.innerHTML = '<div><strong>' + t('adSim') + '</strong><p>' + t('adSimNote') + '</p>' +
        (left > 0 ? '<p>' + t('adSimWait', { n: left }) + '</p>' : '<button class="btn" data-sim="1">' + t('close') + '</button>') + '</div>';
    }
    draw();
    var timer = setInterval(function () { if (left > 0) { left--; draw(); } if (left <= 0) clearInterval(timer); }, 1000);
    el.addEventListener('click', function (e) {
      if (!e.target.closest('[data-sim]')) return;
      clearInterval(timer); el.remove(); cb(true);
    });
  }

  // Anropas av Android-skalet.
  window.LS = {
    onReward: function (kind, earned) { var cb = adCb; adCb = null; if (cb) cb(!!earned); },
    onInterstitialClosed: function () { var cb = adCb; adCb = null; if (cb) cb(true); },
    onBack: function () { return goBack(); }
  };

  // ---------- Skärmar ----------
  function show(id) {
    $('#home').hidden = id !== 'home';
    $('#game').hidden = id !== 'game';
  }
  var toastTimer = 0;
  function toast(text) {
    var el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  function renderHome() {
    document.documentElement.lang = lang();
    var d = S.daily, today = todayKey();
    var doneToday = d.date === today;
    var alive = doneToday || d.date === dayBefore(today);
    var sub = doneToday ? t('dailyDone') : (alive && d.streak > 1 ? t('dailyStreak', { n: d.streak }) : t('dailyNew'));
    $('#home').innerHTML = swag() +
      '<div class="home-body">' +
        '<div><h1 class="wordmark" aria-label="Ljusslinga">' + wordmark() + '</h1><p class="tagline">' + t('tagline') + '</p></div>' +
        '<div class="menu">' +
          '<button class="btn" data-act="play">' + t('play', { n: S.level }) + ICON.go + '</button>' +
          '<button class="btn quiet" data-act="daily"><span>' + t('daily') + '<small>' + sub + '</small></span>' + ICON.go + '</button>' +
        '</div>' +
        '<div class="home-foot">' +
          '<button class="btn plain" data-act="howto">' + t('howto') + '</button>' +
          '<button class="btn plain" data-act="settings">' + t('settings') + '</button>' +
          '<span class="tally" role="img" aria-label="' + t('stars', { n: S.stars }) + '">' + ICON.star + S.stars + '</span>' +
        '</div>' +
      '</div>';
    show('home');
  }

  function goHome() {
    G = null;
    closeModal();
    renderHome();
  }

  // ---------- Parti ----------
  function limits(p) {
    return { three: p.par + Math.max(2, Math.round(p.par * 0.2)), two: p.par + Math.max(5, Math.round(p.par * 0.6)) };
  }
  function starsFor(p, taps) {
    var l = limits(p);
    return taps <= l.three ? 3 : taps <= l.two ? 2 : 1;
  }

  function start(mode, key, fresh) {
    var p = mode === 'daily' ? C.dailyPuzzle(key) : C.levelPuzzle(key), i;
    closeModal();
    G = { mode: mode, key: key, p: p, sig: C.signature(p), r: p.start.slice(), turns: p.start.slice(), taps: 0,
          fixed: new Array(p.n).fill(0), pins: new Array(p.n).fill(0), over: false, hinted: -1, lit: null };
    var slot = S.cur[mode];
    if (!fresh && slot && slot.key === key && slot.sig === G.sig && slot.r && slot.r.length === p.n) {
      G.r = slot.r.slice(); G.turns = slot.r.slice(); G.taps = slot.taps || 0;
      (slot.fixed || []).forEach(function (j) { G.fixed[j] = 1; });
      (slot.pins || []).forEach(function (j) { G.pins[j] = 1; });
    }
    for (i = 0; i < p.n; i++) if (p.locked[i]) G.fixed[i] = 1;
    $('#game').innerHTML = shell();
    buildBoard();
    paint();
    setMsg(introFor(mode, key, p), '');
    show('game');
    persist();
  }

  /** Väljer raden under brädet: tips på de första nivåerna och en förklaring första gången något nytt dyker upp. */
  function introFor(mode, key, p) {
    if (mode === 'level' && key <= 3) return t('tip' + key);
    var feats = [['wrap', p.wrap, 'introWrap'], ['links', p.groups.length > 0, 'introLinks'],
                 ['holes', p.cells < p.n, 'introHoles'], ['locked', p.locked.indexOf(1) >= 0, 'introLocked']];
    for (var i = 0; i < feats.length; i++) {
      if (feats[i][1] && !S.seen[feats[i][0]]) { S.seen[feats[i][0]] = 1; return t(feats[i][2]); }
    }
    return '';
  }

  function persist() {
    if (!G) return;
    if (G.over) delete S.cur[G.mode];
    else {
      var fixed = [], pins = [], p = G.p;
      for (var i = 0; i < p.n; i++) { if (G.fixed[i] && !p.locked[i]) fixed.push(i); if (G.pins[i]) pins.push(i); }
      S.cur[G.mode] = { key: G.key, sig: G.sig, r: G.r, taps: G.taps, fixed: fixed, pins: pins };
    }
    save();
  }

  function shell() {
    var p = G.p;
    var title = G.mode === 'daily' ? t('daily') : t('level', { n: G.key });
    var sub = p.w + '×' + p.h + (p.wrap ? ', ' + t('wrapTag') : '');
    return '<header class="bar">' +
        '<button class="icon-btn" data-act="back" aria-label="' + t('back') + '">' + ICON.back + '</button>' +
        '<div class="bar-title"><strong>' + title + '</strong><span>' + sub + '</span></div>' +
        '<button class="icon-btn" data-act="settings" aria-label="' + t('settings') + '">' + ICON.sliders + '</button>' +
      '</header>' +
      '<div class="hud">' +
        '<div class="hud-taps" aria-label="' + t('taps') + '"><b id="hud-taps">0</b><span class="goal" id="hud-goal"></span></div>' +
        '<div class="hud-lamps" id="hud-lamps"></div>' +
        '<button class="hint-btn" data-act="hint" aria-label="' + t('hint') + '">' + ICON.bulb + '<b id="hud-hints"></b></button>' +
        '<button class="icon-btn" data-act="askRestart" aria-label="' + t('restart') + '">' + ICON.redo + '</button>' +
      '</div>' +
      '<div class="play"><div class="board" id="board"></div><p class="msg" id="msg"></p></div>';
  }

  function kindOf(p, i) {
    return i === p.src ? 'src' : (C.degree(p.mask[i]) === 1 ? 'lamp' : 'cable');
  }

  function buildBoard() {
    var b = $('#board'), p = G.p, html = '', i;
    for (i = 0; i < p.n; i++) {
      if (p.hole[i]) { html += '<span class="cell hole"></span>'; continue; }
      var x = i % p.w, y = Math.floor(i / p.w);
      html += '<button class="cell" data-i="' + i + '" style="--d:' + (x + y) + '">' +
        tileHTML(p.mask[i], { kind: kindOf(p, i), turns: G.turns[i], locked: p.locked[i], group: p.link[i],
                              color: LAMP[(x * 2 + y * 3) % LAMP.length] }) + '</button>';
    }
    b.className = 'board' + (p.wrap ? ' wrap' : '');
    b.style.setProperty('--w', p.w);
    b.style.setProperty('--h', p.h);
    b.innerHTML = html;
    cells = b.children;

    var press = null;
    function cancel() { if (press) { clearTimeout(press.timer); press = null; } }
    b.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('button.cell');
      cancel();
      if (!el || !G || G.over) return;
      var i = +el.dataset.i;
      press = { i: i, x: e.clientX, y: e.clientY, held: false, timer: 0 };
      press.timer = setTimeout(function () { if (press && press.i === i) { press.held = true; togglePin(i); } }, LONG_PRESS_MS);
    });
    b.addEventListener('pointermove', function (e) {
      if (press && Math.abs(e.clientX - press.x) + Math.abs(e.clientY - press.y) > 24) cancel();
    });
    b.addEventListener('pointerup', function () {
      if (!press) return;
      var held = press.held, i = press.i;
      cancel();
      if (!held) tap(i);
    });
    b.addEventListener('pointercancel', cancel);
    b.addEventListener('pointerleave', cancel);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.addEventListener('click', function (e) {
      if (e.detail !== 0) return; // pekare hanteras ovan; detta är tangentbord och skärmläsare
      var el = e.target.closest('button.cell');
      if (el && G && !G.over) tap(+el.dataset.i);
    });
  }

  /** Räknar om vad som lyser och uppdaterar bara det som ändrats. */
  function paint() {
    var p = G.p, lit = C.lit(p, G.r), i, lampsOn = 0;
    G.lit = lit;
    for (i = 0; i < p.n; i++) {
      if (p.hole[i]) continue;
      var el = cells[i], kind = kindOf(p, i), on = !!lit.on[i];
      var sig = (on ? 1 : 0) + (G.fixed[i] ? 2 : 0) + (G.pins[i] ? 4 : 0) + (G.hinted === i ? 8 : 0);
      if (kind === 'lamp' && on) lampsOn++;
      if (el._sig !== sig) {
        el._sig = sig;
        el.classList.toggle('on', on);
        el.classList.toggle('fixed', !!G.fixed[i]);
        el.classList.toggle('pinned', !!G.pins[i]);
        el.classList.toggle('hinted', G.hinted === i);
        el.setAttribute('aria-label', t(kind === 'lamp' ? 'ariaLamp' : kind === 'src' ? 'ariaSrc' : 'ariaCable') + ', ' +
          t(on ? 'ariaOn' : 'ariaOff') + (G.fixed[i] ? ', ' + t('ariaFixed') : ''));
      }
      if (el._turns !== G.turns[i]) {
        el.firstChild.style.transform = 'rotate(' + G.turns[i] * 90 + 'deg)';
        el._turns = G.turns[i];
      }
    }
    var l = limits(p), n = G.taps <= l.three ? 3 : G.taps <= l.two ? 2 : 1, goal = '';
    for (i = 0; i < n; i++) goal += ICON.star;
    if (n > 1) goal += '&nbsp;' + t('atMost', { n: n === 3 ? l.three : l.two });
    $('#hud-taps').textContent = G.taps;
    $('#hud-goal').innerHTML = goal;
    $('#hud-lamps').innerHTML = '<i></i>' + lampsOn + '/' + p.lamps;
    $('#hud-lamps').setAttribute('aria-label', t('lampsLit', { a: lampsOn, b: p.lamps }));
    $('#hud-hints').textContent = S.hints;
    return lit;
  }

  function setMsg(text, kind) {
    var el = $('#msg');
    if (!el) return;
    el.textContent = text;
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }

  function nope(i, key) {
    var el = cells[i];
    el.classList.add('nope');
    setTimeout(function () { el.classList.remove('nope'); }, 300);
    setMsg(t(key), '');
    sfx('nope'); haptic('bad');
  }

  function lift(i) {
    var el = cells[i];
    el.classList.add('turning');
    setTimeout(function () { el.classList.remove('turning'); }, 220);
  }

  /** Ett drag: vrid biten (och dess tvilling) ett kvarts varv medurs. */
  function tap(i) {
    var p = G.p;
    if (G.over) return;
    if (G.fixed[i]) { nope(i, 'fixedMsg'); return; }
    if (G.pins[i]) { nope(i, 'pinnedMsg'); return; }
    var before = G.lit ? G.lit.count : 0;
    C.groupOf(p, i).forEach(function (j) { G.r[j] = (G.r[j] + 1) & 3; G.turns[j]++; lift(j); });
    G.taps++;
    var lit = paint();
    if (lit.count > before) { sfx('link', lit.count / p.cells); haptic('ok'); }
    else { sfx('turn'); haptic('tap'); }
    if (lit.done) win(); else persist();
  }

  /** Håll inne: nåla fast en bit (och dess tvilling) så att den inte vrids av misstag. */
  function togglePin(i) {
    var p = G.p;
    if (G.over || G.fixed[i]) return;
    var on = !G.pins[i];
    C.groupOf(p, i).forEach(function (j) { G.pins[j] = on ? 1 : 0; });
    paint();
    setMsg(t(on ? 'pinOn' : 'pinOff'), '');
    sfx('pin'); haptic('ok');
    persist();
  }

  function useHint() {
    if (!G || G.over) return;
    if (S.hints <= 0) { openNoHints(); return; }
    var p = G.p, i = C.hintTarget(p, G.r, G.fixed);
    if (i < 0) return;
    S.hints--;
    var need = C.tapsFor(p.mask[i], G.r[i]);
    C.groupOf(p, i).forEach(function (j) {
      G.r[j] = (G.r[j] + need) & 3; G.turns[j] += need;
      G.fixed[j] = 1; G.pins[j] = 0; lift(j);
    });
    G.taps += need;
    G.hinted = i;
    setTimeout(function () { if (G && G.hinted === i) { G.hinted = -1; if (!G.over) paint(); } }, 2400);
    var lit = paint();
    setMsg(t('hintDone'), 'good');
    sfx('link', lit.count / p.cells); haptic('ok');
    if (lit.done) win(); else persist();
  }

  function win() {
    var p = G.p, stars = starsFor(p, G.taps), firstDaily = false;
    G.over = true;
    $('#board').classList.add('won');
    setMsg('', '');
    sfx('win');
    if (G.mode === 'level') {
      var prev = S.best[G.key] || 0;
      if (stars > prev) { S.stars += stars - prev; S.best[G.key] = stars; }
      S.level = Math.max(S.level, G.key + 1);
      S.sinceAd++;
    } else if (S.daily.date !== G.key) {
      S.daily.streak = S.daily.date === dayBefore(G.key) ? (S.daily.streak || 0) + 1 : 1;
      S.daily.date = G.key;
      S.hints++;
      firstDaily = true;
    }
    persist();
    setTimeout(function () { openWin(stars, firstDaily); }, 1300);
  }

  // ---------- Dialoger ----------
  var modalBack = 'close';
  function openModal(html, back) {
    closeModal();
    modalBack = back || 'close';
    var el = document.createElement('div');
    el.className = 'backdrop';
    el.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    el.addEventListener('click', function (e) { if (e.target === el && modalBack === 'close') closeModal(); });
    $('#modal-root').appendChild(el);
    var first = el.querySelector('.btn');
    if (first) first.focus({ preventScroll: true });
  }
  function closeModal() { $('#modal-root').innerHTML = ''; }

  function starsHTML(n) {
    var s = '<div class="stars" role="img" aria-label="' + t('stars', { n: n }) + '">';
    for (var i = 0; i < 3; i++) s += ICON.star.replace('<svg', '<svg' + (i < n ? ' class="on"' : ''));
    return s + '</div>';
  }

  function openWin(stars, firstDaily) {
    if (!G) return;
    var text = t('winTaps', { a: G.taps }) + ' ' + (stars === 3 ? t('winBest') : t('winNeed', { n: limits(G.p).three }));
    if (G.mode === 'level') {
      openModal(starsHTML(stars) + '<h2>' + t('winLevel', { n: G.key }) + '</h2><p>' + text + '</p>' +
        '<button class="btn" data-act="next">' + t('next') + ICON.go + '</button>' +
        (stars < 3 ? '<button class="btn plain" data-act="retry">' + t('retry') + '</button>' : '') +
        '<button class="btn plain" data-act="home">' + t('home') + '</button>', 'home');
    } else {
      var extra = firstDaily ? t('dailyReward') + (S.daily.streak > 1 ? ' ' + t('dailyStreak', { n: S.daily.streak }) + '.' : '') : t('dailyAgain');
      openModal(starsHTML(stars) + '<h2>' + t('winDaily') + '</h2><p>' + text + ' ' + extra + '</p>' +
        '<button class="btn" data-act="home">' + t('home') + ICON.go + '</button>', 'home');
    }
  }

  function openNoHints() {
    openModal('<h2>' + t('noHintsTitle') + '</h2><p>' + t('noHintsText', { n: HINTS_PER_AD }) + '</p>' +
      '<button class="btn" data-act="adHints">' + t('watchAd') + ICON.go + '</button>' +
      '<button class="btn plain" data-act="close">' + t('notNow') + '</button>');
  }

  function openRestart() {
    if (!G || G.over) return;
    if (G.taps === 0) return;
    openModal('<h2>' + t('restartTitle') + '</h2><p>' + t('restartText') + '</p>' +
      '<button class="btn" data-act="restart">' + t('restart') + '</button>' +
      '<button class="btn plain" data-act="close">' + t('keepPlaying') + '</button>');
  }

  function mini(items) {
    var s = '<div class="mini" aria-hidden="true">';
    items.forEach(function (it) {
      s += '<span class="cell' + (it.on ? ' on' : '') + '">' + tileHTML(it.mask, it) + '</span>';
    });
    return s + '</div>';
  }

  var afterHow = null;
  function openHowTo(thenStart) {
    afterHow = thenStart || null;
    var broken = mini([{ mask: 2, kind: 'src', on: 1 }, { mask: 5 }, { mask: 8, kind: 'lamp', color: LAMP[0] }]);
    var whole = mini([{ mask: 2, kind: 'src', on: 1 }, { mask: 10, on: 1 }, { mask: 8, kind: 'lamp', color: LAMP[0], on: 1 }]);
    openModal('<h2>' + t('howto') + '</h2><div class="steps">' +
      '<div class="step">' + broken + '<p>' + t('how1') + '<small>' + t('how1b') + '</small></p></div>' +
      '<div class="step">' + whole + '<p>' + t('how2') + '<small>' + t('how2b') + '</small></p></div>' +
      '<div class="step">' + starsHTML(3) + '<p>' + t('how3') + '<small>' + t('how3b') + '</small></p></div>' +
      '</div><button class="btn" data-act="' + (thenStart ? 'howGo' : 'close') + '">' + (thenStart ? t('letsGo') + ICON.go : t('close')) + '</button>');
  }

  var resetArmed = false;
  function openSettings() {
    resetArmed = false;
    function sw(act, label, on) {
      return '<button class="row" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" data-act="' + act + '"><span>' + label + '</span><i class="switch"></i></button>';
    }
    var privacy = false;
    try { privacy = !!(bridge && bridge.privacyOptionsRequired()); } catch (e) { privacy = false; }
    openModal('<h2>' + t('settings') + '</h2>' +
      sw('setSound', t('setSound'), S.sound) +
      sw('setHaptics', t('setHaptics'), S.haptics) +
      '<button class="row" data-act="setLang"><span>' + t('setLang') + '</span><span class="val">' + t('langName') + '</span></button>' +
      (privacy ? '<button class="row" data-act="privacy"><span>' + t('setPrivacy') + '</span></button>' : '') +
      '<button class="row danger" data-act="reset"><span id="reset-label">' + t('setReset') + '</span></button>' +
      '<button class="btn quiet" data-act="close">' + t('close') + '</button>');
  }

  function flip(el, on) { el.setAttribute('aria-checked', on ? 'true' : 'false'); }

  /** Efter språkbyte: rita om det som syns. */
  function refresh() {
    document.documentElement.lang = lang();
    if (G && !$('#game').hidden) {
      $('#game').innerHTML = shell();
      buildBoard();
      paint();
    } else renderHome();
  }

  // ---------- Knappar ----------
  var ACT = {
    play: function () {
      var go = function () { start('level', S.level); };
      if (!S.seenHow) openHowTo(go); else go();
    },
    howGo: function () { var go = afterHow; afterHow = null; S.seenHow = true; save(); if (go) go(); else closeModal(); },
    daily: function () {
      var go = function () { start('daily', todayKey()); };
      if (!S.seenHow) openHowTo(go); else go();
    },
    howto: function () { openHowTo(null); },
    settings: openSettings,
    close: closeModal,
    back: goHome,
    home: goHome,
    hint: useHint,
    askRestart: openRestart,
    restart: function () { if (G) start(G.mode, G.key, true); },
    retry: function () { if (G) start(G.mode, G.key, true); },
    next: function () {
      var key = G ? G.key + 1 : S.level;
      var go = function () { start('level', key); };
      closeModal();
      if (key >= FIRST_AD_LEVEL && S.sinceAd >= LEVELS_BETWEEN_ADS) {
        S.sinceAd = 0; save();
        Ads.interstitial(go);
      } else go();
    },
    adHints: function () {
      Ads.rewarded('hints', function (ok) {
        if (!ok) { toast(t('adUnavailable')); return; }
        S.hints += HINTS_PER_AD; save();
        closeModal();
        if (G && !$('#game').hidden) paint();
        toast(t('gotHints', { n: HINTS_PER_AD }));
      });
    },
    setSound: function (el) { S.sound = !S.sound; save(); flip(el, S.sound); sfx('link', 0.5); },
    setHaptics: function (el) { S.haptics = !S.haptics; save(); flip(el, S.haptics); haptic('ok'); },
    setLang: function () { S.lang = lang() === 'sv' ? 'en' : 'sv'; save(); refresh(); openSettings(); },
    privacy: function () { try { bridge.showPrivacyOptions(); } catch (e) { /* saknas */ } },
    reset: function () {
      if (!resetArmed) { resetArmed = true; $('#reset-label').textContent = t('setResetSure'); return; }
      var keep = { sound: S.sound, haptics: S.haptics, lang: S.lang, seenHow: S.seenHow };
      S = defaults();
      for (var k in keep) S[k] = keep[k];
      save();
      goHome();
      toast(t('resetDone'));
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = ACT[el.getAttribute('data-act')];
    if (fn) fn(el);
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') goBack(); });

  /** Bakåt-knappen. Returnerar true om spelet tog hand om den, annars får appen stängas. */
  function goBack() {
    if ($('.adsim')) return true;
    if ($('.backdrop')) {
      if (modalBack === 'home') goHome(); else closeModal();
      return true;
    }
    if (!$('#game').hidden) { goHome(); return true; }
    return false;
  }

  renderHome();
})();
