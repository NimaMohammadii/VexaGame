export const PLINKO_SCRIPT = `
(function () {
  var state = null;
  var rows = 12;
  var risk = 'easy';
  var pendingRounds = 0;
  var NANO = 1000000000;
  var credit = readPoints();
  var iconUrl = '/assets/plinko-glass/ball.webp?v=1';
  var pegVisualUrl = '/assets/plinko-glass/peg.webp?v=1';
  var houseStripUrl = '/assets/plinko-glass/houses.webp?v=1';
  var control = null;
  var lastStamp = '';
  var lastLoadAt = 0;
  var syncing = false;
  var audioCtx = null;
  var lastSoundAt = 0;
  var MIN_BET = 0.01;
  var BOARD_W = 376;
  var BOARD_H = 326;
  var CENTER_X = 188;
  var CONTROL_TTL_MS = 30000;
  var MAX_RENDER_DPR = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
    ? 2
    : 2.25;
  var MAX_LOCAL_BALLS = 24;
  var multipliers = {
    8: {
      easy: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
      medium: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
      hard: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    },
    12: {
      easy: [10, 3, 1.6, 1.2, 1.11, 1.05, 0.5, 1.05, 1.11, 1.2, 1.6, 3, 10],
      medium: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
      hard: [170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170],
    },
    16: {
      easy: [16, 5, 2.5, 1.6, 1.2, 1.09, 1.05, 1.1, 0.5, 1.1, 1.05, 1.09, 1.2, 1.6, 2.5, 5, 16],
      medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
      hard: [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
    },
  };

  function q(id) {
    return document.getElementById(id);
  }
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }
  function active() {
    var view = document.querySelector('.view.active');
    return !!(view && view.id === 'plinko');
  }
  function show(text) {
    var n = q('toast');
    if (!n) return;
    n.textContent = text;
    n.style.display = 'flex';
    clearTimeout(n.__p);
    n.__p = setTimeout(function () {
      n.style.display = 'none';
    }, 2200);
  }
  function roundCurrency(v) {
    var n = Math.max(0, Number(v) || 0);
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }
  function fmtAmountInput(v) {
    var n = roundCurrency(v);
    return n
      .toFixed(2)
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1');
  }
  function fmtTon(v) {
    var n = Math.max(0, Number(v) || 0);
    return n
      .toFixed(4)
      .replace(/\.0+$/, '')
      .replace(/(\.\d*?)0+$/, '$1');
  }
  function fmtFeedTon(v) {
    return roundCurrency(v).toFixed(2);
  }
  function fmtFeedMultiplier(v) {
    var n = roundCurrency(v);
    return n.toFixed(2);
  }
  function readPoints() {
    if (window.VexaTonBalance && typeof window.VexaTonBalance.read === 'function')
      return Math.max(0, Math.floor(Number(window.VexaTonBalance.read()) || 0)) / NANO;
    return Math.max(0, Number((q('plinkoCredit') || {}).textContent || '1000') || 1000);
  }
  function renderPoints() {
    credit = readPoints();
    var display = fmtTon(credit);
    ['plinkoCredit', 'creditCount', 'plinkoCreditHeader'].forEach(function (id) {
      var el = q(id);
      if (el) el.textContent = display;
    });
    return credit;
  }
  function changeLocalPoints(delta) {
    var nano = Math.trunc((Number(delta) || 0) * NANO);
    if (window.VexaTonBalance && typeof window.VexaTonBalance.read === 'function' && typeof window.VexaTonBalance.write === 'function') {
      var before = Math.max(0, Math.floor(Number(window.VexaTonBalance.read()) || 0));
      var after = Math.max(0, before + nano);
      window.VexaTonBalance.write(after, after - before, false);
      credit = after / NANO;
      return;
    }
    credit = Math.max(0, credit + (Number(delta) || 0));
    renderPoints();
  }
  function forcePoints(next) {
    var value = Number(next) || 0;
    if (arguments.length && typeof next === 'object')
      value = Number(next.tonBalanceNano || 0) / NANO || Number(next.credit) || 0;
    credit = Math.max(0, value);
    renderPoints();
    var input = q('plinkoBet');
    if (input && Number(input.value) > credit && credit >= MIN_BET)
      input.value = fmtAmountInput(credit);
    syncControlPanel();
  }
  function amount() {
    var input = q('plinkoBet');
    credit = roundCurrency(readPoints());
    var value = Number(String((input && input.value) || '').replace(',', '.')) || 0;
    if (value < MIN_BET) value = MIN_BET;
    value = roundCurrency(value);
    if (credit >= MIN_BET && value > credit) value = roundCurrency(credit);
    if (input) input.value = fmtAmountInput(value);
    return value;
  }
  function prepareAmountInput() {
    var input = q('plinkoBet');
    if (!input) return;
    input.min = String(MIN_BET);
    input.step = '0.01';
    input.setAttribute('maxlength', '12');
    if (!input.value || Number(String(input.value).replace(',', '.')) < MIN_BET)
      input.value = fmtAmountInput(MIN_BET);
    else input.value = fmtAmountInput(input.value);
    syncControlPanel();
  }
  function label(n) {
    return Number.isInteger(n) ? String(n) : String(n).replace(/^0/, '0');
  }
  function houseCount() {
    return rows + 1;
  }
  function syncControlPanel() {
    var input = q('plinkoBet'),
      raw = Number(String((input && input.value) || '').replace(',', '.')) || MIN_BET,
      balance = roundCurrency(readPoints()),
      value = roundCurrency(raw);
    if (value < MIN_BET) value = MIN_BET;
    if (balance >= MIN_BET && value > balance) value = balance;
    if (input) input.value = fmtAmountInput(value);
    var open = document.querySelector('[data-plinko-bet-input-open]'),
      current = document.querySelector('[data-plinko-current]'),
      balanceEl = document.querySelector('[data-plinko-balance]'),
      mult = document.querySelector('[data-plinko-multiplier]'),
      rowsEl = document.querySelector('[data-plinko-rows]'),
      riskEl = document.querySelector('[data-plinko-risk]');
    if (open) open.textContent = fmtAmountInput(value);
    if (current) current.textContent = fmtAmountInput(value);
    if (balanceEl) balanceEl.textContent = fmtTon(balance);
    if (mult) mult.textContent = fmtFeedMultiplier(Math.max.apply(Math, currentMultipliers()));
    if (rowsEl) rowsEl.textContent = String(rows);
    if (riskEl) riskEl.textContent = risk;
    document.querySelectorAll('[data-plinko-rows-option]').forEach(function (button) {
      var selected = Number(button.getAttribute('data-plinko-rows-option')) === rows;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    document.querySelectorAll('[data-plinko-risk-option]').forEach(function (button) {
      var selected = button.getAttribute('data-plinko-risk-option') === risk;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  }
  function controlItem() {
    var rk = String(rows);
    var riskKey = risk === 'easy' ? 'low' : risk === 'hard' ? 'high' : 'medium';
    return control &&
      control.enabled !== false &&
      control.rows &&
      control.rows[rk] &&
      control.rows[rk][riskKey]
      ? control.rows[rk][riskKey]
      : null;
  }
  function currentMultipliers() {
    var item = controlItem();
    var source =
      item && Array.isArray(item.multipliers) && item.multipliers.length === houseCount()
        ? item.multipliers
        : multipliers[rows][risk];
    return source.map(function (value, index) {
      var n = Number(value);
      return Number.isFinite(n) && n > 0 ? n : multipliers[rows][risk][index];
    });
  }
  function pegRadius() {
    return rows === 8 ? 3.25 : rows === 12 ? 2.7 : 2.25;
  }
  function pegVisualRadius() {
    return rows === 8 ? 6.2 : rows === 12 ? 3.6 : 0.55;
  }
  function ballRadius() {
    return rows === 8 ? 7.3 : rows === 12 ? 6.45 : 5.8;
  }
  function binTextSize(count) {
    return count >= 17 ? 6.6 : count >= 13 ? 7.6 : 8.8;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function updateIcon(url) {
    iconUrl = url || iconUrl;
    if (state && state.tokenImg && state.tokenImg.src !== iconUrl) state.tokenImg.src = iconUrl;
  }
  function loadHouseImage(url) {
    if (!url) return null;
    var img = new Image();
    img.onload = function () {
      dirty();
      draw();
    };
    img.onerror = function () {
      dirty();
      draw();
    };
    img.src = url;
    return img;
  }
  function currentTelegramUser() {
    return window.Telegram &&
      window.Telegram.WebApp &&
      window.Telegram.WebApp.initDataUnsafe &&
      window.Telegram.WebApp.initDataUnsafe.user
      ? window.Telegram.WebApp.initDataUnsafe.user
      : null;
  }
  function currentTelegramInitData() {
    return window.Telegram && window.Telegram.WebApp ? String(window.Telegram.WebApp.initData || '') : '';
  }
  function currentUserPayload() {
    var user = currentTelegramUser() || {};
    var parts = [];
    if (user.first_name) parts.push(user.first_name);
    if (user.last_name) parts.push(user.last_name);
    var name = parts.join(' ').trim() || (user.username ? '@' + user.username : 'Player');
    return {
      userId: user.id != null ? String(user.id) : '',
      name: name,
      photoUrl: user.photo_url || '',
    };
  }
  function seededRandom(seed) {
    var str = String(seed);
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += 0x6d2b79f5;
      var t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function ballRandom(ball) {
    return ball && ball.rand ? ball.rand() : Math.random();
  }
  function primeAudio() {
    var Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    if (!audioCtx) audioCtx = new Ctor();
    if (audioCtx && audioCtx.resume) audioCtx.resume().catch(function () {});
  }
  function pegSound() {
    var nowMs = performance.now();
    if (nowMs - lastSoundAt < 150) return;
    lastSoundAt = nowMs;
    try {
      primeAudio();
      if (!audioCtx || audioCtx.state === 'suspended') return;
      var now = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(570 + Math.random() * 100, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.032, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }
  function loadControl() {
    return fetch('/app/api/plinko-control', { cache: 'no-store' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data && data.rows) {
          var stamp = String(data.updatedAt || JSON.stringify(data.rows));
          var changed = stamp !== lastStamp;
          control = data;
          lastStamp = stamp;
          if (changed) rebuildBoard(hasBalls());
        }
      })
      .catch(function () {});
  }
  function requestSync(force) {
    var now = Date.now();
    if (!force && !active()) return Promise.resolve();
    if (!force && now - lastLoadAt < CONTROL_TTL_MS) return Promise.resolve();
    if (syncing) return Promise.resolve();
    syncing = true;
    lastLoadAt = now;
    return loadControl().finally(function () {
      syncing = false;
    });
  }
  function smartLoadPlinkoControl(force) {
    return requestSync(force);
  }
  function hitPeg(x, y) {
    if (!state) return;
    pegSound();
  }
  function drawPeg(ctx, x, y, r, hit) {
    if (state && state.pegVisualImg && state.pegVisualImg.complete && state.pegVisualImg.naturalWidth > 0) {
      var visualSize = Math.max(8.5, r * (hit ? 2.75 : 2.45));
      ctx.save();
      if (hit) {
        ctx.shadowColor = 'rgba(177,55,82,.58)';
        ctx.shadowBlur = 6;
      }
      ctx.drawImage(state.pegVisualImg, x - visualSize / 2, y - visualSize / 2, visualSize, visualSize);
      ctx.restore();
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r * 1.04, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.fill();
    var edge = ctx.createRadialGradient(x - r * 0.36, y - r * 0.42, r * 0.06, x, y, r * 1.08);
    edge.addColorStop(0, 'rgba(255,255,255,1)');
    edge.addColorStop(0.24, 'rgba(255,255,255,.88)');
    edge.addColorStop(0.58, 'rgba(255,255,255,.42)');
    edge.addColorStop(1, 'rgba(255,255,255,.12)');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = edge;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.28, y - r * 0.34, Math.max(1, r * 0.23), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.88)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,.72)';
    ctx.lineWidth = Math.max(0.55, r * 0.1);
    ctx.stroke();
    ctx.restore();
  }
  function drawBin(ctx, bin) {
    var r = Math.min(9, Math.max(5, bin.w * 0.24));
    ctx.save();
    roundRect(ctx, bin.x, bin.y, bin.w, bin.h, r);
    ctx.strokeStyle = 'rgba(255,255,255,.34)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    roundRect(ctx, bin.x + 1.6, bin.y + 1.6, bin.w - 3.2, bin.h - 3.2, Math.max(3, r - 1.6));
    ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.lineWidth = 0.55;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bin.x + Math.min(5, bin.w * 0.18), bin.y + 3.2);
    ctx.lineTo(bin.x + bin.w - Math.min(5, bin.w * 0.18), bin.y + 3.2);
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 0.7;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();
  }
  function hasBalls() {
    return !!(state && state.balls && state.balls.length);
  }
  function hasEffects() {
    return !!(state && state.effects && state.effects.length);
  }
  function setRows(next) {
    var value = Number(next);
    if ([8, 12, 16].indexOf(value) === -1 || value === rows) return;
    if (hasBalls() || pendingRounds > 0) {
      show('Wait for the current balls to finish');
      return;
    }
    rows = value;
    rebuildBoard(false);
    syncControlPanel();
  }
  function setRisk(next) {
    var value = String(next || '').toLowerCase();
    if (['easy', 'medium', 'hard'].indexOf(value) === -1 || value === risk) return;
    if (hasBalls() || pendingRounds > 0) {
      show('Wait for the current balls to finish');
      return;
    }
    risk = value;
    rebuildBoard(false);
    syncControlPanel();
  }
  function scheduleFrame(delay) {
    if (!state || state.raf || state.timer) return;
    var start = function () {
      if (!state) return;
      state.timer = 0;
      if (!state.raf) state.raf = requestAnimationFrame(tick);
    };
    if (delay && delay > 0) state.timer = setTimeout(start, delay);
    else start();
  }
  function dirty() {
    if (state) state.staticDirty = true;
  }
  function rebuildBoard(preserveBalls) {
    if (!state) return init(true);
    var oldBalls = preserveBalls && state.balls ? state.balls : [];
    state.pegs = makePegs();
    state.bins = makeBins();
    state.balls = oldBalls;
    state.effects = state.effects || [];
    dirty();
    draw();
    if (hasBalls() || hasEffects()) scheduleFrame(0);
  }
  function makePegs() {
    var pegs = [];
    var top = 26,
      bottom = 248,
      pegRows = rows,
      rowGap = (bottom - top) / Math.max(1, pegRows - 1);
    var slotCount = houseCount();
    var slotLeft = 12,
      slotWidth = 352,
      slotGap = slotWidth / slotCount;
    var r = pegRadius(),
      vr = pegVisualRadius();
    for (var row = 0; row < pegRows; row++) {
      var count = row + 3;
      var start = slotLeft + ((slotCount - (count - 1)) * slotGap) / 2;
      var y = top + row * rowGap;
      var pr = row === pegRows - 1 ? r * 0.7 : r;
      for (var i = 0; i < count; i++)
        pegs.push({ key: row + ':' + i, row: row, index: i, x: start + i * slotGap, y: y, r: pr, vr: vr, hit: 0 });
    }
    return pegs;
  }
  function makeBins() {
    var mult = currentMultipliers();
    var count = houseCount();
    var bins = [];
    var left = 12,
      top = 260,
      width = 352,
      height = 14,
      gutter = 2;
    var binW = width / count;
    for (var j = 0; j < count; j++)
      bins.push({
        x: left + j * binW + gutter / 2,
        y: top,
        w: binW - gutter,
        h: height,
        label: label(mult[j]),
        mult: Number(mult[j]),
      });
    return bins;
  }
  function binIndexFromX(x, bins, left, right) {
    return clamp(Math.floor((x - left) / ((right - left) / bins.length)), 0, bins.length - 1);
  }
  function init(force) {
    var canvas = q('plinkoCanvasV2');
    if (!canvas) return;
    if (state && state.canvas === canvas && !force) {
      draw();
      return;
    }
    prepareAmountInput();
    var dpr = Math.min(window.devicePixelRatio || 1, MAX_RENDER_DPR);
    canvas.width = BOARD_W * dpr;
    canvas.height = BOARD_H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    var prev = state;
    var img = new Image();
    img.onload = function () {
      draw();
    };
    img.src = iconUrl;
    state = {
      canvas: canvas,
      ctx: ctx,
      dpr: dpr,
      pegs: makePegs(),
      bins: makeBins(),
      balls: [],
      effects: [],
      last: 0,
      raf: (prev && prev.raf) || 0,
      timer: (prev && prev.timer) || 0,
      staticCanvas: (prev && prev.staticCanvas) || null,
      staticCtx: (prev && prev.staticCtx) || null,
      staticDpr: 0,
      staticDirty: true,
      tokenImg: img,
      pegVisualImg: prev && prev.pegVisualImg ? prev.pegVisualImg : loadHouseImage(pegVisualUrl),
      houseStripImg: prev && prev.houseStripImg ? prev.houseStripImg : loadHouseImage(houseStripUrl),
    };
    renderPoints();
    var rowsEl = q('plinkoRowsValue');
    if (rowsEl) rowsEl.textContent = String(rows);
    draw();
    scheduleFrame(0);
  }
  function spawnBall(opts) {
    init();
    if (!state) return false;
    var maxBalls = MAX_LOCAL_BALLS;
    if (
      state.balls &&
      state.balls.filter(function (ball) {
        return !!(ball && ball.remote) === !!(opts && opts.remote);
      }).length >= maxBalls
    ) {
      if (!opts || !opts.remote) show('Please wait for a few balls to finish');
      return false;
    }
    var activeTop = state.balls.filter(function (ball) {
      return ball && !ball.sinking && ball.y < 34;
    }).length;
    var spread = [0, -6, 6, -12, 12, -3, 3, -9, 9];
    var rng = opts && opts.seed != null ? seededRandom(opts.seed) : Math.random;
    var requestedPath = opts && Array.isArray(opts.path) ? opts.path.slice() : null;
    var guided = requestedPath && requestedPath.length === rows;
    var startX = guided ? CENTER_X : CENTER_X + (spread[activeTop % spread.length] || 0) + (rng() * 2 - 1);
    var vx = guided ? 0 : rng() * 0.2 - 0.1;
    var requestedTarget = Number(opts && opts.targetBinIndex);
    var ball = {
      id: (opts && opts.id) || '',
      userId: (opts && opts.userId) || '',
      x: startX,
      y: 2,
      vx: vx,
      vy: 0.11,
      r: ballRadius(),
      amount: roundCurrency(Math.max(MIN_BET, Number(opts && opts.amount) || MIN_BET)),
      name: (opts && opts.name) || 'Player',
      photoUrl: (opts && opts.photoUrl) || '',
      pathPhase: rng() * 2,
      age: 0,
      hitPegKeys: {},
      sinking: false,
      sink: 0,
      settled: false,
      settleX: null,
      targetBinIndex: Number.isFinite(requestedTarget) && state.bins[requestedTarget] ? requestedTarget : null,
      path: guided ? requestedPath : null,
      pathStep: 0,
      pathRights: 0,
      serverMultiplier: Number(opts && opts.multiplier),
      serverTotal: Number(opts && opts.total),
      img: null,
      remote: !!(opts && opts.remote),
      rand: rng,
    };
    state.balls.push(ball);
    scheduleFrame(0);
    return ball;
  }
  async function drop() {
    init();
    primeAudio();
    if (!state) return false;
    var localCount = state.balls
      ? state.balls.filter(function (ball) {
          return ball && !ball.remote;
        }).length
      : 0;
    if (localCount + pendingRounds >= MAX_LOCAL_BALLS) {
      show('Please wait for a few balls to finish');
      return false;
    }
    var value = amount();
    if (value < MIN_BET) {
      show('Minimum amount is 0.01');
      return false;
    }
    if (roundCurrency(credit) + 0.000001 < value) {
      show('Not enough points');
      return false;
    }
    var payload = currentUserPayload();
    var initData = currentTelegramInitData();
    if (!payload.userId || !initData) {
      show('Telegram user not found');
      return false;
    }
    var reservedAmount = roundCurrency(value);
    var clientId = 'local-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
    var settledData = null;
    pendingRounds += 1;
    changeLocalPoints(-reservedAmount);
    try {
      var response = await fetch('/app/api/plinko/round', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ initData: initData, amount: reservedAmount, rows: rows, risk: risk }),
      });
      var data = await response.json().catch(function () { return null; });
      if (!response.ok || !data || data.ok !== true) throw new Error(data && data.error ? data.error : 'Could not drop ball');
      settledData = data;
      var targetBinIndex = Number(data.targetBinIndex);
      var path = normalizeServerPath(data.path, rows, targetBinIndex);
      if (!path || !state || !state.bins || !state.bins[targetBinIndex]) {
        forcePoints(data);
        show('Invalid Plinko path');
        return false;
      }
      applyRoundMultipliers(data.multipliers);
      var ball = spawnBall({
        id: String(data.roundId || clientId),
        userId: payload.userId,
        amount: roundCurrency(Number(data.amount) || reservedAmount),
        name: payload.name,
        photoUrl: payload.photoUrl,
        seed: String(data.roundId || clientId),
        targetBinIndex: targetBinIndex,
        path: path,
        multiplier: Number(data.multiplier),
        total: Number(data.total),
      });
      if (!ball) {
        forcePoints(data);
        return true;
      }
      scheduleFrame(0);
      return true;
    } catch (error) {
      if (settledData) forcePoints(settledData);
      else changeLocalPoints(reservedAmount);
      draw();
      show(error && error.message ? error.message : 'Could not drop ball');
      return false;
    } finally {
      pendingRounds = Math.max(0, pendingRounds - 1);
    }
  }
  function normalizeServerPath(value, expectedRows, targetBinIndex) {
    if (!Array.isArray(value) || value.length !== expectedRows || !Number.isInteger(targetBinIndex)) return null;
    var rights = 0;
    var path = [];
    for (var i = 0; i < value.length; i++) {
      var step = Number(value[i]);
      if (step !== 0 && step !== 1) return null;
      path.push(step);
      rights += step;
    }
    return rights === targetBinIndex ? path : null;
  }
  function applyRoundMultipliers(value) {
    if (!Array.isArray(value) || value.length !== houseCount() || !state || !state.bins) return;
    var item = controlItem();
    var next = [];
    for (var i = 0; i < value.length; i++) {
      var multiplier = Number(value[i]);
      if (!Number.isFinite(multiplier) || multiplier <= 0) return;
      next.push(multiplier);
    }
    if (item) item.multipliers = next.slice();
    for (var j = 0; j < state.bins.length; j++) {
      state.bins[j].mult = next[j];
      state.bins[j].label = label(next[j]);
    }
    dirty();
  }
  function settle(ball, bin) {
    if (ball.settled) return;
    if (bin && Number.isFinite(Number(bin.x)) && Number.isFinite(Number(bin.w)))
      ball.settleX = clamp(bin.x + bin.w / 2, bin.x + (ball.r || 0), bin.x + bin.w - (ball.r || 0));
    ball.settled = true;
    if (state) state.effects.push({ bin: bin, life: 18, max: 18 });
    var mult = !ball.remote && Number.isFinite(Number(ball.serverMultiplier))
      ? roundCurrency(Math.max(0, Number(ball.serverMultiplier)))
      : roundCurrency(Math.max(0, Number(bin && bin.mult) || 0));
    var total = !ball.remote && Number.isFinite(Number(ball.serverTotal))
      ? roundCurrency(Math.max(0, Number(ball.serverTotal)))
      : roundCurrency(Math.max(0, (Number(ball.amount) || 0) * mult));
    if (!ball.remote) {
      changeLocalPoints(total);
      var winEl = document.querySelector('[data-plinko-win]');
      if (winEl) winEl.textContent = fmtAmountInput(total);
      try {
        window.dispatchEvent(
          new CustomEvent('vexa-plinko-last-win', {
            detail: {
              total: total,
              multiplier: mult,
              amount: roundCurrency(Number(ball.amount) || 0),
            },
          }),
        );
      } catch (e) {}
      syncControlPanel();
    }
  }
  function collide(ball, peg, left, right, prevX, prevY) {
    var dx = ball.x - peg.x,
      dy = ball.y - peg.y,
      min = ball.r + peg.r + 0.95;
    if (Math.abs(dx) > min + 2 && Math.abs(ball.x - (prevX !== undefined ? prevX : ball.x)) < min)
      return;
    if (Math.abs(dy) > min + 2 && Math.abs(ball.y - (prevY !== undefined ? prevY : ball.y)) < min)
      return;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (dist >= min && prevX !== undefined && prevY !== undefined) {
      var sx = ball.x - prevX,
        sy = ball.y - prevY,
        len2 = sx * sx + sy * sy;
      if (len2 > 0) {
        var t = ((peg.x - prevX) * sx + (peg.y - prevY) * sy) / len2;
        t = clamp(t, 0, 1);
        var cx = prevX + sx * t,
          cy = prevY + sy * t,
          cdx = cx - peg.x,
          cdy = cy - peg.y,
          cd = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
        if (cd < min) {
          dx = cdx;
          dy = cdy;
          dist = cd;
          ball.x = cx;
          ball.y = cy;
        } else {
          return;
        }
      } else {
        return;
      }
    } else if (dist >= min) {
      return;
    }
    var key = peg.key;
    var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    if (!ball.hitPegKeys[key] && speed >= 0.16) {
      ball.hitPegKeys[key] = 1;
      hitPeg(peg.x, peg.y);
    }
    var nx = dx / dist,
      ny = dy / dist;
    var overlap = min - dist;
    ball.x += nx * (overlap + 0.04);
    ball.y += ny * (overlap + 0.04);
    var vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= (1 + 0.5) * vn * nx;
      ball.vy -= (1 + 0.5) * vn * ny;
      var tx = -ny,
        ty = nx;
      var vt = ball.vx * tx + ball.vy * ty;
      ball.vx -= vt * 0.035 * tx;
      ball.vy -= vt * 0.035 * ty;
      if (!ball.path) ball.vx += (ballRandom(ball) - 0.5) * 0.024;
      ball.vx = clamp(ball.vx, -1.45, 1.45);
    }
    if (ball.path && peg.row === ball.pathStep && peg.index === ball.pathRights + 1) {
      var goRight = ball.path[ball.pathStep] === 1;
      var direction = goRight ? 1 : -1;
      var slotGap = 352 / houseCount();
      var nextTargetX = peg.x + direction * slotGap / 2;
      var pathTravel = rows === 8 ? 22.6 : rows === 12 ? 17.2 : 15.35;
      ball.vx = clamp((nextTargetX - ball.x) / pathTravel, -1.45, 1.45);
      ball.vy = -0.25;
      ball.pathRights += goRight ? 1 : 0;
      ball.pathStep += 1;
    }
    ball.vx *= 0.992;
    ball.vy *= 0.992;
    if (ball.vy < -0.44) ball.vy = -0.44;
    if (ball.vy > 2.25) ball.vy = 2.25;
    if (ball.x < left + ball.r) {
      ball.x = left + ball.r;
      ball.vx = Math.abs(ball.vx) * 0.42;
    }
    if (ball.x > right - ball.r) {
      ball.vx = -Math.abs(ball.vx) * 0.42;
    }
  }
  function tick(time) {
    if (!state) return;
    var raw = time - (state.last || time) || 16;
    var dt = Math.min(20, raw) / 16.67;
    state.last = time;
    var balls = state.balls,
      bins = state.bins,
      pegs = state.pegs;
    var left = bins[0].x,
      right = bins[bins.length - 1].x + bins[bins.length - 1].w,
      binTop = bins[0].y,
      binBottom = bins[0].y + bins[0].h;
    for (var b = balls.length - 1; b >= 0; b--) {
      var ball = balls[b];
      ball.age = (ball.age || 0) + dt;
      if (ball.sinking) {
        ball.sink += dt;
        if (Number.isFinite(ball.settleX)) ball.x += clamp(ball.settleX - ball.x, -1.05, 1.05) * dt;
        ball.y += 0.48 * dt;
        ball.r *= 0.978;
        if (ball.sink > 30 || ball.r < 1.2) balls.splice(b, 1);
        continue;
      }
      ball.vy += 0.145 * dt;
      ball.vx *= 0.996;
      if (ball.vy > 2.25) ball.vy = 2.25;
      if (ball.vy < -0.44) ball.vy = -0.44;
      if (!ball.path) ball.vx += (ballRandom(ball) - 0.5) * 0.01 * dt;
      var prevX = ball.x,
        prevY = ball.y;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      if (ball.x < left + ball.r) {
        ball.x = left + ball.r;
        ball.vx = Math.abs(ball.vx) * 0.42;
      }
      if (ball.x > right - ball.r) {
        ball.x = right - ball.r;
        ball.vx = -Math.abs(ball.vx) * 0.42;
      }
      var minY = Math.min(prevY, ball.y) - ball.r - 7,
        maxY = Math.max(prevY, ball.y) + ball.r + 7;
      for (var p = 0; p < pegs.length; p++) {
        var peg = pegs[p];
        if (peg.y < minY) continue;
        if (peg.y > maxY) break;
        if (ball.path && (peg.row !== ball.pathStep || peg.index !== ball.pathRights + 1)) continue;
        collide(ball, peg, left, right, prevX, prevY);
      }
      if (ball.y + ball.r > binTop + 5) {
        var physicalIndex = binIndexFromX(ball.x, bins, left, right);
        var bin = bins[physicalIndex];
        for (var s = 1; s < bins.length; s++) {
          var wall = left + (s * (right - left)) / bins.length;
          if (Math.abs(ball.x - wall) < ball.r && ball.y > binTop - 6 && ball.y < binBottom) {
            if (ball.x < wall) {
              ball.x = wall - ball.r;
              ball.vx = -Math.abs(ball.vx) * 0.42;
            } else {
              ball.x = wall + ball.r;
              ball.vx = Math.abs(ball.vx) * 0.42;
            }
            ball.vy *= 0.8;
          }
        }
        if (ball.y + ball.r > bin.y + bin.h * 0.62) {
          ball.settleX = clamp(bin.x + bin.w / 2, bin.x + ball.r, bin.x + bin.w - ball.r);
          ball.vx *= 0.22;
          ball.vy *= 0.22;
          settle(ball, bin);
          ball.sinking = true;
          ball.sink = 0;
        }
      }
      if (ball.y > 316) {
        if (!ball.settled) {
          settle(ball, bins[binIndexFromX(ball.x, bins, left, right)]);
        }
        balls.splice(b, 1);
      }
    }
    draw();
    state.raf = 0;
    if (hasBalls() || hasEffects()) scheduleFrame(0);
  }
  function staticBoard() {
    if (!state) return null;
    var dpr = state.dpr || 1;
    if (!state.staticCanvas || state.staticDpr !== dpr) {
      state.staticCanvas = document.createElement('canvas');
      state.staticCanvas.width = BOARD_W * dpr;
      state.staticCanvas.height = BOARD_H * dpr;
      state.staticCtx = state.staticCanvas.getContext('2d');
      state.staticDpr = dpr;
      state.staticDirty = true;
    }
    if (!state.staticDirty) return state.staticCanvas;
    var ctx = state.staticCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    for (var p = 0; p < state.pegs.length; p++) {
      var peg = state.pegs[p];
      drawPeg(ctx, peg.x, peg.y, peg.vr || peg.r, 0);
    }
    var bins = state.bins;
    if (state.houseStripImg && state.houseStripImg.complete && state.houseStripImg.naturalWidth > 0) {
      var sourceCount = 14;
      var sourceWidth = state.houseStripImg.naturalWidth / sourceCount;
      var targetWidth = 352 / bins.length;
      for (var h = 0; h < bins.length; h++) {
        var sourceIndex = Math.round((h * (sourceCount - 1)) / Math.max(1, bins.length - 1));
        ctx.drawImage(
          state.houseStripImg,
          sourceIndex * sourceWidth,
          0,
          sourceWidth,
          state.houseStripImg.naturalHeight,
          12 + h * targetWidth,
          253,
          targetWidth,
          28,
        );
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 ' + binTextSize(bins.length) + 'px Arial,system-ui,sans-serif';
    var middle = (bins.length - 1) / 2;
    for (var b = 0; b < bins.length; b++) {
      var bin = bins[b];
      ctx.fillStyle = Math.abs(b - middle) < 0.6 ? 'rgba(255,78,115,.98)' : 'rgba(255,255,255,.94)';
      ctx.fillText(bin.label, bin.x + bin.w / 2, bin.y + bin.h / 2);
    }
    state.staticDirty = false;
    return state.staticCanvas;
  }
  function drawEffects(ctx) {
    if (!state) return;
    for (var r = state.effects.length - 1; r >= 0; r--) {
      var ring = state.effects[r];
      ring.life -= 1;
      var a = Math.max(0, ring.life / ring.max);
      ctx.save();
      if (ring.bin) {
        var bin = ring.bin;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(255,255,255,.13)';
        ctx.fillRect(bin.x + 3, bin.y + 4, Math.max(1, bin.w - 6), Math.max(1, bin.h - 7));
        ctx.restore();
        if (ring.life <= 0) state.effects.splice(r, 1);
        continue;
      }
      ctx.restore();
      state.effects.splice(r, 1);
    }
  }
  function draw() {
    if (!state) return;
    var ctx = state.ctx,
      dpr = state.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, BOARD_W, BOARD_H);
    var base = staticBoard();
    if (base) ctx.drawImage(base, 0, 0, BOARD_W, BOARD_H);
    drawEffects(ctx);
    for (var b = 0; b < state.balls.length; b++) {
      var ball = state.balls[b],
        img = ball.img || state.tokenImg,
        alpha = ball.sinking ? Math.max(0, 1 - ball.sink / 34) : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      if (img && img.complete && img.naturalWidth > 0) {
        var size = ball.r * 2.45;
        ctx.drawImage(img, ball.x - size / 2, ball.y - size / 2, size, size);
      } else {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
      ctx.restore();
    }
  }
  document.addEventListener(
    'click',
    function (ev) {
      var button = ev.target && ev.target.closest && ev.target.closest('button');
      if (!button) return;
      var inPlinko = !!(button.closest && button.closest('#plinko'));
      if (inPlinko) primeAudio();
      var rowOption = button.getAttribute('data-plinko-rows-option');
      if (rowOption) {
        ev.preventDefault();
        setRows(rowOption);
        return;
      }
      var riskOption = button.getAttribute('data-plinko-risk-option');
      if (riskOption) {
        ev.preventDefault();
        setRisk(riskOption);
        return;
      }
      var action = button.getAttribute('data-action');
      if (action === 'drop-plinko-ball') {
        ev.preventDefault();
        ev.stopPropagation();
        drop();
      }
    },
    true,
  );
  document.addEventListener('input', function (ev) {
    if (ev.target && ev.target.id === 'plinkoBet') syncControlPanel();
  });
  window.addEventListener('vexa-ton-balance-sync', function (ev) {
    if (ev && ev.detail) forcePoints(ev.detail);
  });
  window.addEventListener('vexa-credit-icon-sync', function (ev) {
    if (ev && ev.detail && ev.detail.source === 'plinko-ball' && ev.detail.url)
      updateIcon(ev.detail.url);
  });
  window.addEventListener('vexa:view-changed', function (ev) {
    var id = ev && ev.detail ? ev.detail.id : '';
    if (id === 'plinko') {
      smartLoadPlinkoControl(false);
      init();
    }
  });
  window.plinkoReloadControl = function () {
    smartLoadPlinkoControl(true);
  };
  window.setPlinkoRows = setRows;
  window.setPlinkoRisk = setRisk;
  if (q('plinkoCanvasV2')) init(true);
  syncControlPanel();
  if (active()) {
    smartLoadPlinkoControl(false);
  }
})();
`;
