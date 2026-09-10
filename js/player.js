/* ============================================================
   player.js — Web Audio synth engine + UI wiring
   Depends on TRACKS and T() from js/tracks.js (loaded first).
   ============================================================ */

/* ---------------- audio engine ---------------- */
let ctx = null, master = null, analyser = null;
let current = 0, playing = false, shuffle = false, repeatOne = false;
let step = 0, nextTime = 0, timer = null;

const MAX_GAIN = 0.5;      // slider 100% -> this gain
let volume = 0.28;         // current gain (slider default 56%)
let muted = false;

function applyVolume(){ if(master) master.gain.value = muted ? 0 : volume; }

function ensureCtx(){
  if(ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : volume;
  master.connect(ctx.destination);
  // tap for the LCD visualizer (does not affect output)
  analyser = ctx.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.82;
  master.connect(analyser);
}

// schedule one note with a short attack/release envelope
function playNote(freq, time, dur, wave, gain){
  if(!freq) return; // rest
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = wave;
  o.frequency.value = freq;
  o.connect(g); g.connect(master);
  const a = 0.01, r = 0.06;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(gain, time + a);
  g.gain.setValueAtTime(gain, time + Math.max(a, dur - r));
  g.gain.linearRampToValueAtTime(0, time + dur);
  o.start(time); o.stop(time + dur + 0.02);
}

// look-ahead scheduler: queues notes slightly ahead of the audio clock
function scheduler(){
  const tr = TRACKS[current];
  const spb = 60 / tr.bpm;   // seconds per beat
  const stepDur = spb / 2;   // eighth notes
  while(nextTime < ctx.currentTime + 0.15){
    const li = step % tr.lead.length;
    const bi = Math.floor(step / 2) % tr.bass.length;

    playNote(T(tr.lead[li]), nextTime, stepDur * 0.95, tr.wave, 0.9);           // lead
    if(step % 2 === 0){
      playNote(T(tr.bass[bi]), nextTime, stepDur * 1.9, "sine", 1.1);           // bass
    }
    if(step % 4 === 2){                                                          // hi-hat click
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "square"; o.frequency.value = 2400; o.connect(g); g.connect(master);
      g.gain.setValueAtTime(0.15, nextTime);
      g.gain.exponentialRampToValueAtTime(0.001, nextTime + 0.05);
      o.start(nextTime); o.stop(nextTime + 0.06);
    }
    nextTime += stepDur;
    step++;
  }
}

/* ---------------- UI wiring ---------------- */
const disc      = document.getElementById('disc');
const discCover = document.getElementById('discCover');
const marquee   = document.getElementById('marquee');
const playIcon = document.getElementById('playIcon');
const shelf    = document.getElementById('shelf');
const PLAY_PATH  = "M8 5v14l11-7z";
const PAUSE_PATH = "M6 5h4v14H6zM14 5h4v14h-4z";

function buildShelf(){
  TRACKS.forEach((tr, i) => {
    const b = document.createElement('button');
    b.className = 'cd' + (i === current ? ' active' : '');
    b.setAttribute('aria-label', 'Play ' + tr.title);
    b.innerHTML = `<div class="disc-mini"><img class="mini-cover" src="${tr.cover}" alt="" draggable="false"></div>`;
    b.addEventListener('click', () => { selectTrack(i); startPlay(); });
    shelf.appendChild(b);
  });
}

function refreshDisc(){
  const tr = TRACKS[current];
  discCover.src = tr.cover;                 // hero disc mirrors the selected cover
  marquee.textContent = tr.title + "  ✦  ";
  document.querySelectorAll('.cd').forEach((el, i) => el.classList.toggle('active', i === current));
}

function selectTrack(i){
  current = (i + TRACKS.length) % TRACKS.length;
  step = 0;
  refreshDisc();
  if(playing){ nextTime = ctx.currentTime + 0.05; }
}

function startPlay(){
  ensureCtx();
  if(ctx.state === 'suspended') ctx.resume();
  if(playing) return;
  playing = true;
  nextTime = ctx.currentTime + 0.06;
  timer = setInterval(scheduler, 25);
  disc.classList.add('playing');
  marquee.classList.remove('paused');
  playIcon.querySelector('path').setAttribute('d', PAUSE_PATH);
}

function pausePlay(){
  playing = false;
  clearInterval(timer);
  disc.classList.remove('playing');
  marquee.classList.add('paused');
  playIcon.querySelector('path').setAttribute('d', PLAY_PATH);
}

function toggle(){ playing ? pausePlay() : startPlay(); }
function next(){ const i = shuffle ? rand() : current + 1; selectTrack(i); if(playing) restart(); }
function prev(){ const i = shuffle ? rand() : current - 1; selectTrack(i); if(playing) restart(); }
function rand(){ let i = current; while(i === current && TRACKS.length > 1) i = Math.floor(Math.random() * TRACKS.length); return i; }
function restart(){ step = 0; nextTime = ctx.currentTime + 0.05; }

document.getElementById('play').addEventListener('click', toggle);
document.getElementById('next').addEventListener('click', next);
document.getElementById('prev').addEventListener('click', prev);
document.getElementById('shuffle').addEventListener('click', e => {
  shuffle = !shuffle; e.currentTarget.classList.toggle('on', shuffle);
});
document.getElementById('repeat').addEventListener('click', e => {
  repeatOne = !repeatOne; e.currentTarget.classList.toggle('on', repeatOne);
});

document.addEventListener('keydown', e => {
  if(e.code === 'Space'){ e.preventDefault(); toggle(); }
  else if(e.code === 'ArrowRight') next();
  else if(e.code === 'ArrowLeft') prev();
});

/* ---------------- volume ---------------- */
const volSlider = document.getElementById('volume');
const volIcon   = document.getElementById('volIcon');

function paintSlider(){
  const pct = (volume / MAX_GAIN) * 100;
  const shown = muted ? 0 : pct;
  volSlider.style.background =
    `linear-gradient(90deg, var(--led) ${shown}%, rgba(120,120,130,.28) ${shown}%)`;
}

volSlider.addEventListener('input', e => {
  volume = (e.target.value / 100) * MAX_GAIN;
  if(volume > 0){ muted = false; volIcon.classList.remove('muted'); }
  applyVolume(); paintSlider();
});

volIcon.addEventListener('click', () => {
  muted = !muted;
  volIcon.classList.toggle('muted', muted);
  applyVolume(); paintSlider();
});

volSlider.value = (volume / MAX_GAIN) * 100;
paintSlider();

buildShelf();
refreshDisc();

/* ---------------- background theme switcher ---------------- */
document.body.dataset.bg = 'sakura';
document.querySelectorAll('.bg-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bg-btn').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    document.body.dataset.bg = btn.dataset.bg;   // CSS can key backgrounds off body[data-bg="…"]
  });
});

/* ---------------- LCD moving stars & shapes visualizer ----------------
   Little pixel stars / diamonds / hearts drift across the screen (faster while
   a track plays, slow ambient drift when paused). Pure fillRect on the LCD dot
   grid — renders the same in every browser (incl. Safari). */
(function(){
  const viz = document.getElementById('viz');
  if(!viz) return;
  const g = viz.getContext('2d');
  const CELL_CSS = 4;                   // pixel pitch in CSS px
  const ON  = 'rgba(30,46,44,1)';       // lit dark-grey pixel
  const OFF = 'rgba(34,52,50,0.08)';    // faint unlit pixel (LCD grid)
  let last = 0, parts = null;

  // small pixel glyphs ('#' = on)
  const GLYPHS = {
    sparkle: ["..#..", "..#..", "#####", "..#..", "..#.."],
    diamond: ["..#..", ".###.", "#####", ".###.", "..#.."],
    heart:   [".#.#.", "#####", "#####", ".###.", "..#.."],
    star:    ["..#..", "..#..", "#####", ".###.", ".#.#."],
    dot:     [".#.", "###", ".#."]
  };
  function parse(rows){
    const w = rows[0].length, h = rows.length, cells = [];
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++)
      if(rows[y][x] === '#') cells.push([x - (w - 1) / 2, y - (h - 1) / 2]);
    return cells;
  }
  const SHAPES = Object.keys(GLYPHS).map(k => parse(GLYPHS[k]));

  function sizeCanvas(){
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = viz.getBoundingClientRect();
    viz.width  = Math.max(1, Math.round(r.width  * dpr));
    viz.height = Math.max(1, Math.round(r.height * dpr));
  }
  sizeCanvas();
  window.addEventListener('resize', sizeCanvas);

  function makeParts(cols, rows){
    const n = 8, out = [];
    for(let i = 0; i < n; i++){
      let vx = Math.random() * 2 - 1, vy = Math.random() * 2 - 1;
      const m = Math.hypot(vx, vy) || 1; vx /= m; vy /= m;
      out.push({ x: Math.random() * cols, y: Math.random() * rows, vx, vy, s: SHAPES[i % SHAPES.length] });
    }
    return out;
  }

  function draw(t){
    requestAnimationFrame(draw);
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0.016; last = t;
    const dpr  = Math.min(window.devicePixelRatio || 1, 2);
    const cell = CELL_CSS * dpr;
    const W = viz.width, H = viz.height;
    const cols = Math.max(1, Math.floor(W / cell));
    const rows = Math.max(1, Math.floor(H / cell));
    const ox = (W - cols * cell) / 2, oy = (H - rows * cell) / 2;

    if(!parts || parts._cols !== cols){ parts = makeParts(cols, rows); parts._cols = cols; }

    // speed depends only on playback (not volume)
    const active = (typeof playing !== 'undefined') && playing;
    const speed = (active ? 0.55 : 0.16) * Math.min(cols, rows);

    for(const p of parts){
      p.x += p.vx * speed * dt;
      p.y += p.vy * speed * dt;
      if(p.x < -3) p.x = cols + 3; else if(p.x > cols + 3) p.x = -3;
      if(p.y < -3) p.y = rows + 3; else if(p.y > rows + 3) p.y = -3;
    }

    // mark lit cells from all shapes
    const onGrid = new Uint8Array(cols * rows);
    for(const p of parts){
      const cx = Math.round(p.x), cy = Math.round(p.y);
      for(const off of p.s){
        const gx = cx + off[0], gy = cy + off[1];
        if(gx >= 0 && gx < cols && gy >= 0 && gy < rows) onGrid[gy * cols + gx] = 1;
      }
    }

    const dot = cell * 0.62;
    g.clearRect(0, 0, W, H);
    for(let gy = 0; gy < rows; gy++){
      for(let gx = 0; gx < cols; gx++){
        const px = ox + gx * cell + cell / 2;
        const py = oy + gy * cell + cell / 2;
        g.fillStyle = onGrid[gy * cols + gx] ? ON : OFF;
        g.fillRect(px - dot / 2, py - dot / 2, dot, dot);
      }
    }
  }
  requestAnimationFrame(draw);
})();
