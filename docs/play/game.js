/* Twinkle Twist – UI: screens, taps, hints, stars, saving, sharing, ads and the Christmas theme.
   The same files run in three places:
     - in the Android app, where window.AndroidBridge gives ads, vibration, sharing and the rating dialog,
     - on the web (docs/play is served by GitHub Pages), where there are no ads at all,
     - opened straight from disk or in the test APK, where a placeholder stands in for each ad so
       the ad flow can be tried out. */
(function () {
  'use strict';

  var C = window.TTCore;
  var L = window.TTLang;
  var bridge = window.AndroidBridge || null;
  var WEB = !bridge && /^https?:$/.test(location.protocol) && location.hostname !== 'appassets.androidplatform.net';
  var IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var SAVE_KEY = 'twinkletwist.v1';

  // ---------- Settings that are easy to tweak ----------
  var START_HINTS = 3;          // hints at the start
  var HINTS_PER_AD = 2;         // hints per rewarded ad
  var LEVELS_BETWEEN_ADS = 5;   // interstitial every Nth completed level …
  var FIRST_AD_LEVEL = 11;      // … but never before this level, so the first ten levels have no ads
  var STREAK_DAYS = 3;          // every Nth daily string in a row …
  var STREAK_HINTS = 10;        // … gives this many hints instead of one, and comes with an ad
  var LONG_PRESS_MS = 420;      // how long to press and hold to pin a piece
  var WEB_URL = 'https://filipfogel.github.io/twinkle-twist/play/'; // the web version; a shared result links here
  // The app's page on Google Play, offered to players of the web version. Play Console shows the
  // installs under the source "webgame". Set to '' to hide every link to Google Play.
  var STORE_URL = 'https://play.google.com/store/apps/details?id=app.twinkletwist&referrer=utm_source%3Dwebgame%26utm_campaign%3Dingame';
  var REVIEW_LEVEL = 10;        // Google Play may ask for a rating after a three-star win from this level on …
  var REVIEW_STREAK = 3;        // … or when the daily streak has reached this many days,
  var REVIEW_MAX = 3;           // at most this many times …
  var REVIEW_GAP_DAYS = 21;     // … with at least this many days in between
  var XMAS_FROM = [11, 22];     // the Christmas theme (snow and music) runs from this month and day …
  var XMAS_TO = [1, 6];         // … through this one, every year
  var MUSIC_SRC = 'jingle-bells.mp3';
  var MUSIC_VOLUME = 0.3;       // 0–1, kept low so the game's own sounds are still heard
  var SNOW_HOME = 40;           // snowflakes falling on the menu
  var SNOW_WIN = 46;            // snowflakes when a level is done
  var LAMP = ['#FF5D5D', '#FFB81F', '#22C58B', '#3B9BFF', '#9B6BFF', '#FF6FB5'];
  var LETTER = ['#E5484D', '#F08400', '#12A679', '#2F7BFF', '#8B5CF6', '#E64C9C']; // wordmark letters, darker for legibility

  // ---------- Text ----------
  // The texts live in lang.js. The language follows the phone or the browser until the player
  // picks one in Settings. index.html?lang=sv forces a language, handy for previews and screenshots.
  var STR = L.text.en, LANG = 'en';
  var langForced = /[?&]lang=([a-z]{2})\b/.exec(location.search);

  function autoLang() {
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    for (var i = 0; i < list.length; i++) {
      var code = String(list[i]).toLowerCase().split('-')[0];
      if (code === 'in') code = 'id'; // the old code for Indonesian
      if (L.text[code]) return code;
    }
    return 'en';
  }
  function setLang(code) {
    LANG = L.text[code] ? code : autoLang();
    STR = L.text[LANG];
    document.documentElement.lang = LANG;
  }

  function t(key, vars) {
    var s = STR[key];
    if (s == null) s = L.text.en[key]; // not translated yet
    if (vars) for (var k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }

  // ---------- Images (inline SVG) ----------
  var ICON = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sliders: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h8M18 7h2M4 17h2M12 17h8"/><circle cx="15" cy="7" r="2.6"/><circle cx="9" cy="17" r="2.6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/></svg>',
    redo: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9"/><path d="M4 4v5h5"/></svg>',
    note: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><g class="note"><path d="M9.5 17.5V6l10-2.2v11.7"/><circle cx="7" cy="17.5" r="2.5"/><circle cx="17" cy="15.5" r="2.5"/></g><path class="slash" d="M4 3.5l16.5 17"/></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 2.6 4.2 5.6 4.2 9s-1.4 6.4-4.2 9c-2.8-2.6-4.2-5.6-4.2-9S9.2 5.6 12 3z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    get: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2 5 13.5h5.5L9.5 22 19 10h-6z" fill="currentColor"/></svg>'
  };

  /** Draws a piece. The cables sit in a layer that turns, the lamp and power socket in one that stays still. */
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

  /** The name with one color per letter, like the lamps on the string. One line per word. */
  function wordmark() {
    var k = 0;
    return 'Twinkle Twist'.split(' ').map(function (word) {
      return '<span class="word">' + word.split('').map(function (ch) {
        return '<span aria-hidden="true" style="--c:' + LETTER[k++ % LETTER.length] + '">' + ch + '</span>';
      }).join('') + '</span>';
    }).join('');
  }

  /** The string of lights on the menu: a cable in two arcs with six colored lamps. */
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

  // ---------- Saved state ----------
  function defaults() {
    return { level: 1, stars: 0, best: {}, hints: START_HINTS, sound: true, music: true, haptics: true,
             lang: null, // null = follow the phone or the browser
             daily: { date: null, streak: 0, ad: null }, // ad = the day whose streak ad has been shown
             sinceAd: 0, seenHow: false, seen: {}, cur: {},
             review: { n: 0, at: 0 } }; // how many times a rating was asked for, and when last
  }
  function load() {
    var d = defaults();
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        var o = JSON.parse(raw); for (var k in o) if (k in d) d[k] = o[k];
        if (!('music' in o)) d.music = !!d.sound; // saved before there was music: if the sound was off, the music starts off too
      }
    } catch (e) { /* save is missing or broken – start from scratch */ }
    ['best', 'seen', 'cur'].forEach(function (k) { if (!d[k] || typeof d[k] !== 'object') d[k] = {}; });
    if (!d.daily || typeof d.daily !== 'object') d.daily = { date: null, streak: 0, ad: null };
    if (!d.review || typeof d.review !== 'object') d.review = { n: 0, at: 0 };
    return d;
  }
  function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* full or disabled */ } }

  var S = load();
  setLang(langForced ? langForced[1] : S.lang);
  var G = null;      // game in progress
  var cells = [];    // the square elements, one per square

  function $(sel, el) { return (el || document).querySelector(sel); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function todayKey() { return fmt(new Date()); }
  function dayBefore(key) { var d = new Date(key + 'T12:00:00'); d.setDate(d.getDate() - 1); return fmt(d); }

  // ---------- Sound and vibration ----------
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
      else if (name === 'link') tone(392 * Math.pow(2, amount || 0), n, 0.16, 'sine', 0.12); // higher the more is lit
      else if (name === 'nope') tone(150, n, 0.12, 'sawtooth', 0.05);
      else if (name === 'pin') tone(620, n, 0.07, 'square', 0.04);
      else if (name === 'win') [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, n + i * 0.1, 0.26, 'triangle', 0.12); });
    } catch (e) { /* no sound on this device */ }
  }
  function haptic(kind) {
    if (!S.haptics) return;
    try {
      if (bridge) bridge.haptic(kind);
      else if (navigator.vibrate) navigator.vibrate(kind === 'bad' ? [20, 30, 20] : kind === 'ok' ? 18 : 8);
    } catch (e) { /* not available */ }
  }

  // ---------- Christmas theme: music and snow ----------
  var xmasForced = /[?&]xmas=([01])/.exec(location.search); // index.html?xmas=1 or ?xmas=0 previews the theme on or off
  function isXmas() {
    if (xmasForced) return xmasForced[1] === '1';
    var d = new Date(), md = (d.getMonth() + 1) * 100 + d.getDate();
    var from = XMAS_FROM[0] * 100 + XMAS_FROM[1], to = XMAS_TO[0] * 100 + XMAS_TO[1];
    return from <= to ? md >= from && md <= to : md >= from || md <= to;
  }

  var music = null, appPaused = false;
  /** Starts or pauses the background music so it matches the season, the setting and whether the app is in front. */
  function musicSync() {
    if (!(S.music && !appPaused && !document.hidden && isXmas())) {
      if (music) music.pause();
      return;
    }
    if (!music) {
      music = new Audio();
      music.loop = true;
      music.volume = MUSIC_VOLUME;
      // Read the whole file into memory first. The app serves its files without support for seeking,
      // and looping has to seek back to the start. Opened straight from disk the fetch fails; the plain address works there.
      fetch(MUSIC_SRC).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (buf) { return URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' })); }, function () { return MUSIC_SRC; })
        .then(function (url) { music.src = url; musicSync(); });
      return;
    }
    if (!music.getAttribute('src') || !music.paused) return;
    var p = music.play();
    if (p && p.catch) p.catch(function () { /* a browser wants a tap first; the next tap tries again */ });
  }

  var snowAt = 0;
  /** Snowflakes. 'home' is a steady snowfall behind the menu, 'win' a flurry in front of the board, '' clears it. */
  function snow(mode) {
    var el = $('#snow'), win = mode === 'win', html = '', i;
    function f(x) { return x.toFixed(1); }
    if (mode && isXmas()) {
      for (i = win ? SNOW_WIN : SNOW_HOME; i > 0; i--) {
        var z = Math.pow(Math.random(), 1.4); // depth: 0 is far away (small, slow, faint), 1 is close
        var size = 8 + z * 22, fall = (win ? 10 : 16) - z * (win ? 4 : 7) + Math.random() * 2;
        // the negative delay puts every flake somewhere along its fall, so the snow is in the air right away
        html += '<i class="flake' + (size < 14 ? ' dot' : '') + '" style="left:' + f(Math.random() * 104 - 2) + '%;' +
          '--s:' + f(size) + 'px;--o:' + (0.7 + z * 0.3).toFixed(2) + ';--t:' + f(fall) + 's;--d:' + f(-Math.random() * fall) + 's;' +
          '--w:' + f(6 + z * 14 + Math.random() * 6) + 'px;--u:' + f(2.4 + Math.random() * 2.4) + 's;' +
          '--r:' + Math.round(Math.random() * 240 - 120) + 'deg;--y:' + f(Math.random() * 100) + '%"><b></b></i>';
      }
    }
    el.className = html ? 'snow ' + mode : 'snow';
    el.innerHTML = html;
    el.hidden = !html;
    snowAt = performance.now();
  }

  /** Moves the flurry in behind the win dialog, so it falls over the dimmed board but not over the text.
      The copy gets the time that has passed (--e), so every flake carries on from where it was. */
  function snowBehindDialog() {
    var el = $('#snow'), back = $('.backdrop');
    if (!back || !el.classList.contains('win')) return;
    var copy = document.createElement('div');
    copy.className = 'snow';
    copy.style.setProperty('--e', ((performance.now() - snowAt) / 1000).toFixed(2) + 's');
    copy.innerHTML = el.innerHTML;
    back.insertBefore(copy, back.firstChild);
    setTimeout(function () { if (el.classList.contains('win')) snow(''); }, 200); // once the dialog has faded in
  }

  // ---------- Ads ----------
  // The web version has none: no interstitials, and hints come from the daily string instead.
  var adCb = null;
  var Ads = {
    /** Rewarded ad. cb(true) if the player watched to the end and should get the reward. */
    rewarded: function (kind, cb) {
      if (adCb || $('.adsim')) return; // one ad at a time
      if (WEB) { cb(false); return; }
      if (!bridge) { simAd(true, cb); return; }
      var started = false;
      adCb = cb;
      try { started = !!bridge.showRewarded(kind); } catch (e) { started = false; }
      if (!started) { adCb = null; cb(false); }
    },
    /** Interstitial at a break in the game. cb(shown) runs when the game should continue. */
    interstitial: function (cb) {
      if (adCb || $('.adsim') || WEB) { cb(false); return; }
      if (!bridge) { simAd(false, function () { cb(true); }); return; }
      var started = false;
      adCb = function () { cb(true); };
      try { started = !!bridge.showInterstitial(); } catch (e) { started = false; }
      if (!started) { adCb = null; cb(false); }
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

  // Called by the Android shell.
  window.TT = {
    onReward: function (kind, earned) { var cb = adCb; adCb = null; if (cb) cb(!!earned); },
    onInterstitialClosed: function () { var cb = adCb; adCb = null; if (cb) cb(true); },
    onBack: function () { return goBack(); },
    onPause: function () { appPaused = true; musicSync(); },
    onResume: function () { appPaused = false; musicSync(); }
  };

  // ---------- Screens ----------
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

  // ---------- Daily streak ----------
  /** The streak the player has once the daily string of that day is done. */
  function streakAfter(key) {
    return S.daily.date === dayBefore(key) ? (S.daily.streak || 0) + 1 : 1;
  }
  /** True if that day's string is still to be done and is one that gives the streak bonus. */
  function bonusDay(key) {
    return S.daily.date !== key && streakAfter(key) % STREAK_DAYS === 0;
  }
  /** The ad that comes with the streak bonus, one per daily string. It is shown when the player
      opens the string. If no ad could be shown then, the next call tries again: when the string is
      opened once more, and at the latest when it is done. then(shown) runs when the game goes on. */
  function streakAd(key, then) {
    if (S.daily.ad === key) { then(false); return; }
    Ads.interstitial(function (shown) {
      if (shown) { S.daily.ad = key; save(); }
      then(shown);
    });
  }

  function renderHome() {
    var d = S.daily, today = todayKey();
    var doneToday = d.date === today;
    var alive = doneToday || d.date === dayBefore(today);
    var sub = doneToday ? t('dailyDone') : bonusDay(today) ? t('dailyBonusToday', { n: STREAK_HINTS })
      : (alive && d.streak > 1 ? t('dailyStreak', { n: d.streak }) : t('dailyNew'));
    $('#home').innerHTML = swag() +
      '<div class="home-body">' +
        '<div><h1 class="wordmark" aria-label="Twinkle Twist">' + wordmark() + '</h1><p class="tagline">' + t('tagline') + '</p></div>' +
        '<div class="menu">' +
          '<button class="btn" data-act="play">' + t('play', { n: S.level }) + ICON.go + '</button>' +
          '<button class="btn quiet" data-act="daily"><span>' + t('daily') + '<small>' + sub + '</small></span>' + ICON.go + '</button>' +
          (storeLink() ? '<a class="store" href="' + STORE_URL + '" target="_blank" rel="noopener">' + ICON.get + t('getApp') + '</a>' : '') +
        '</div>' +
        '<div class="home-foot">' +
          '<button class="btn plain" data-act="howto">' + t('howto') + '</button>' +
          '<button class="btn plain" data-act="settings">' + t('settings') + '</button>' +
          '<span class="tally" role="img" aria-label="' + t('stars', { n: S.stars }) + '">' + ICON.star + S.stars + '</span>' +
        '</div>' +
      '</div>';
    show('home');
    snow('home');
  }

  /** True where the game should point to the app on Google Play: on the web, but not on an iPhone or iPad. */
  function storeLink() { return WEB && !!STORE_URL && !IOS; }

  function goHome() {
    G = null;
    closeModal();
    renderHome();
  }

  // ---------- Game ----------
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
    snow('');
    persist();
  }

  /** Picks the line below the board: tips on the first levels and an explanation the first time something new appears. */
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
        '<div class="bar-end">' +
          // music on/off, only while there is music. It sits here because the row below has no room left on narrow phones.
          (isXmas() ? '<button class="icon-btn" role="switch" aria-checked="' + (S.music ? 'true' : 'false') + '" data-act="setMusic" aria-label="' + t('setMusic') + '">' + ICON.note + '</button>' : '') +
          '<button class="icon-btn" data-act="settings" aria-label="' + t('settings') + '">' + ICON.sliders + '</button>' +
        '</div>' +
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
      if (e.detail !== 0) return; // pointers are handled above; this is keyboard and screen readers
      var el = e.target.closest('button.cell');
      if (el && G && !G.over) tap(+el.dataset.i);
    });
  }

  /** Recomputes what is lit and updates only what changed. */
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

  /** One move: turn the piece (and its twin) a quarter turn clockwise. */
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

  /** Press and hold: pin a piece (and its twin) so it is not turned by mistake. */
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
    var p = G.p, stars = starsFor(p, G.taps), game = G, key = G.key;
    var reward = 0; // hints earned: only the first time a daily string is done
    G.over = true;
    G.stars = stars;
    $('#board').classList.add('won');
    setMsg('', '');
    sfx('win');
    snow('win');
    if (G.mode === 'level') {
      var prev = S.best[G.key] || 0;
      if (stars > prev) { S.stars += stars - prev; S.best[G.key] = stars; }
      S.level = Math.max(S.level, G.key + 1);
      S.sinceAd++;
    } else if (S.daily.date !== key) {
      S.daily.streak = streakAfter(key);
      S.daily.date = key;
      reward = S.daily.streak % STREAK_DAYS === 0 ? STREAK_HINTS : 1;
      S.hints += reward;
      $('#hud-hints').textContent = S.hints;
    }
    persist();
    setTimeout(function () {
      if (G !== game) return; // the player has already left
      var open = function () { if (G === game) openWin(stars, reward); };
      // The streak bonus comes with an ad. Normally it was shown when the string was opened.
      if (reward > 1) streakAd(key, function (shown) { game.adAtWin = shown; open(); });
      else open();
    }, 1300);
  }

  // ---------- Dialogs ----------
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

  function openWin(stars, reward) {
    if (!G) return;
    var text = t('winTaps', { a: G.taps }) + ' ' + (stars === 3 ? t('winBest') : t('winNeed', { n: limits(G.p).three }));
    if (G.mode === 'level') {
      openModal(starsHTML(stars) + '<h2>' + t('winLevel', { n: G.key }) + '</h2><p>' + text + '</p>' +
        '<button class="btn" data-act="next">' + t('next') + ICON.go + '</button>' +
        (stars < 3 ? '<button class="btn plain" data-act="retry">' + t('retry') + '</button>' : '') +
        '<button class="btn plain" data-act="home">' + t('home') + '</button>', 'home');
    } else {
      var streak = S.daily.streak, left = STREAK_DAYS - streak % STREAK_DAYS; // days until the next streak bonus
      var extra = !reward ? t('dailyAgain')
        : reward > 1 ? t('dailyBonus', { a: streak, n: reward })
        : t('dailyReward') + (streak > 1 ? ' ' + t('dailyStreak', { n: streak }) + '.' : '') + ' ' +
          (left === 1 ? t('bonusTomorrow', { n: STREAK_HINTS }) : t('bonusIn', { a: left, n: STREAK_HINTS }));
      openModal(starsHTML(stars) + '<h2>' + t('winDaily') + '</h2><p>' + text + ' ' + extra + '</p>' +
        '<button class="btn" data-act="share">' + t('share') + ICON.share + '</button>' +
        '<button class="btn plain" data-act="home">' + t('home') + '</button>', 'home');
    }
    snowBehindDialog();
  }

  function openNoHints() {
    if (WEB) {
      // No ads on the web. Every daily string gives a hint, and the app has rewarded ads for more.
      var left = S.daily.date !== todayKey();
      openModal('<h2>' + t('noHintsTitle') + '</h2><p>' + t(left ? 'noHintsDaily' : 'noHintsTomorrow') +
        (storeLink() ? ' ' + t('noHintsApp') : '') + '</p>' +
        (left && G && G.mode !== 'daily' ? '<button class="btn" data-act="daily">' + t('daily') + ICON.go + '</button>' : '') +
        (storeLink() ? '<a class="btn quiet" href="' + STORE_URL + '" target="_blank" rel="noopener">' + t('getApp') + ICON.get + '</a>' : '') +
        '<button class="btn plain" data-act="close">' + t('notNow') + '</button>');
      return;
    }
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
      (isXmas() ? sw('setMusic', t('setMusic'), S.music) : '') +
      sw('setHaptics', t('setHaptics'), S.haptics) +
      '<button class="row" data-act="lang"><span>' + ICON.globe + t('setLang') + '</span><span class="row-val">' + L.names[LANG] + '</span></button>' +
      (privacy ? '<button class="row" data-act="privacy"><span>' + t('setPrivacy') + '</span></button>' : '') +
      '<button class="row danger" data-act="reset"><span id="reset-label">' + t('setReset') + '</span></button>' +
      '<button class="btn quiet" data-act="close">' + t('close') + '</button>');
  }

  function openLang() {
    var html = '<h2>' + t('setLang') + '</h2>';
    L.order.forEach(function (code) {
      var cur = code === LANG;
      html += '<button class="row" data-act="pickLang" data-lang="' + code + '" lang="' + code + '"' + (cur ? ' aria-current="true"' : '') + '>' +
        '<span>' + L.names[code] + '</span>' + (cur ? ICON.check : '') + '</button>';
    });
    openModal(html + '<button class="btn quiet" data-act="settings">' + t('back') + '</button>');
  }

  function flip(el, on) { el.setAttribute('aria-checked', on ? 'true' : 'false'); }

  // ---------- Sharing ----------
  /** The result of the daily string as a short text to send to someone, with a link to today's string. */
  function shareText() {
    var date = G.key, stars = '', i;
    try { date = new Date(G.key + 'T12:00:00').toLocaleDateString(LANG, { day: 'numeric', month: 'short' }); } catch (e) { /* keep the plain date */ }
    for (i = 0; i < G.stars; i++) stars += '\u2B50';
    var lines = [t('shareTitle', { date: date }), t('shareScore', { stars: stars, n: G.taps })];
    if (S.daily.streak > 1) lines.push('\uD83D\uDD25 ' + t('dailyStreak', { n: S.daily.streak }));
    lines.push(t('shareAsk'), WEB_URL + '?daily');
    return lines.join('\n');
  }

  function copyText(text) {
    function done() { toast(t('shareCopied')); }
    function byHand() {
      var el = document.createElement('textarea'), ok = false;
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.cssText = 'position:fixed;left:0;top:0;opacity:0;-webkit-user-select:text;user-select:text';
      document.body.appendChild(el);
      el.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      el.remove();
      if (ok) done();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, byHand);
    else byHand();
  }

  /** The app opens Android's share sheet. A phone browser opens its own. Otherwise the text is copied. */
  function share() {
    if (!G || !G.over) return;
    var text = shareText();
    if (bridge && bridge.share) {
      try { bridge.share(text); return; } catch (e) { /* fall through to copying */ }
    }
    if (navigator.share && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      navigator.share({ text: text }).catch(function (e) { if (!e || e.name !== 'AbortError') copyText(text); });
      return;
    }
    copyText(text);
  }

  // ---------- Rating ----------
  /** After a good moment, lets Google Play ask for a rating. Returns true if it was asked for now.
      Play decides on its own whether its dialog really shows, so this only picks the moments. */
  function maybeAskReview() {
    if (!bridge || !bridge.askReview || !G || !G.over) return false;
    if (G.adAtWin) return false; // the rating dialog and an ad never come in the same break
    var r = S.review, now = Date.now();
    var good = G.mode === 'level' ? (G.key >= REVIEW_LEVEL && G.stars === 3) : S.daily.streak >= REVIEW_STREAK;
    if (!good || r.n >= REVIEW_MAX || now - r.at < REVIEW_GAP_DAYS * 864e5) return false;
    S.review = { n: r.n + 1, at: now };
    save();
    try { bridge.askReview(); } catch (e) { return false; }
    return true;
  }

  // ---------- Buttons ----------
  var ACT = {
    play: function () {
      var go = function () { start('level', S.level); };
      if (!S.seenHow) openHowTo(go); else go();
    },
    howGo: function () { var go = afterHow; afterHow = null; S.seenHow = true; save(); if (go) go(); else closeModal(); },
    daily: function () {
      var key = todayKey();
      var play = function () { start('daily', key); };
      // the string that gives the streak bonus opens with an ad
      var go = function () { if (bonusDay(key)) streakAd(key, play); else play(); };
      if (!S.seenHow) openHowTo(go); else go();
    },
    howto: function () { openHowTo(null); },
    settings: openSettings,
    close: closeModal,
    back: goHome,
    home: function () { maybeAskReview(); goHome(); },
    share: share,
    lang: openLang,
    pickLang: function (el) {
      S.lang = el.getAttribute('data-lang');
      save();
      setLang(S.lang);
      // redraw the screen behind the dialog in the new language
      if (G && !G.over && !$('#game').hidden) start(G.mode, G.key); else renderHome();
      openSettings();
    },
    hint: useHint,
    askRestart: openRestart,
    restart: function () { if (G) start(G.mode, G.key, true); },
    retry: function () { if (G) start(G.mode, G.key, true); },
    next: function () {
      var key = G ? G.key + 1 : S.level;
      var go = function () { start('level', key); };
      var asked = maybeAskReview(); // the rating dialog and an ad never come in the same break
      closeModal();
      if (!asked && key >= FIRST_AD_LEVEL && S.sinceAd >= LEVELS_BETWEEN_ADS) {
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
    setMusic: function () {
      S.music = !S.music; save(); musicSync();
      // the button on the game screen and the switch in Settings show the same thing
      document.querySelectorAll('[data-act="setMusic"]').forEach(function (el) { flip(el, S.music); });
    },
    setHaptics: function (el) { S.haptics = !S.haptics; save(); flip(el, S.haptics); haptic('ok'); },
    privacy: function () { try { bridge.showPrivacyOptions(); } catch (e) { /* not available */ } },
    reset: function () {
      if (!resetArmed) { resetArmed = true; $('#reset-label').textContent = t('setResetSure'); return; }
      var keep = { sound: S.sound, music: S.music, haptics: S.haptics, seenHow: S.seenHow, lang: S.lang, review: S.review };
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
  document.addEventListener('visibilitychange', function () { if (document.hidden) persist(); musicSync(); });
  document.addEventListener('pointerup', function () { musicSync(); }, true); // browsers only let music start after a tap
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') goBack(); });

  /** The back button. Returns true if the game handled it, otherwise the app may close. */
  function goBack() {
    if ($('.adsim')) return true;
    if ($('.backdrop')) {
      if (modalBack === 'home') ACT.home(); else closeModal();
      return true;
    }
    if (!$('#game').hidden) { goHome(); return true; }
    return false;
  }

  renderHome();
  musicSync();

  // A shared result links to .../play/?daily, which goes straight to today's string.
  if (/[?&]daily\b/.test(location.search)) {
    ACT.daily();
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* the address just keeps ?daily */ }
  }
})();
