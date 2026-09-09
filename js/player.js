/* ============================================================
   player.js — Web Audio synth engine + UI wiring
   Depends on TRACKS and T() from js/tracks.js (loaded first).
   ============================================================ */

/* ---------------- audio engine ---------------- */
let ctx = null, master = null;
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
