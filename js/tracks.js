/* ============================================================
   tracks.js — note table + playlist data
   Each track carries its own generated melody (lead + bass),
   played live in the browser by js/player.js via Web Audio,
   plus a real CD cover photo shown on the shelf.
   ============================================================ */

// note name -> frequency (Hz)
const NOTE = {
  C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00, A3:220.00, B3:246.94,
  C4:261.63, Cs4:277.18, D4:293.66, Ds4:311.13, E4:329.63, F4:349.23, Fs4:369.99,
  G4:392.00, Gs4:415.30, A4:440.00, As4:466.16, B4:493.88,
  C5:523.25, Cs5:554.37, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00,
  B5:987.77, C6:1046.50, R:0 // R = rest
};
const T = (n) => NOTE[n];

const TRACKS = [
  {
    title:"PLAY !! ✦ MIXTAPE (CD PLAYER ERA)",
    cover:"assets/covers/kitty.png",
    bpm:132, wave:"square",
    lead:["C5","E5","G5","C6","G5","E5","G5","C6","A5","F5","A5","C6","B5","G5","D5","G5"],
    bass:["C3","C3","G3","G3","A3","A3","F3","G3"]
  },
  {
    title:"TEDDY BEAR ✦ GIFT EDITION",
    cover:"assets/covers/disik.png",
    bpm:126, wave:"square",
    lead:["G4","G4","A4","C5","C5","A4","G4","E4","G4","A4","C5","D5","E5","D5","C5","A4"],
    bass:["G3","G3","C3","C3","D3","D3","E3","E3"]
  },
  {
    title:"APHEX TWIN ✦ GIRL / BOY EP",
    cover:"assets/covers/green.png",
    bpm:118, wave:"triangle",
    lead:["E5","G5","A5","G5","E5","D5","E5","R","C5","D5","E5","D5","C5","A4","C5","R"],
    bass:["A3","A3","E3","E3","F3","F3","G3","G3"]
  },
  {
    title:"WE'LL NEVER BE THIS YOUNG AGAIN",
    cover:"assets/covers/pink.png",
    bpm:88, wave:"triangle",
    lead:["E5","B4","C5","D5","C5","B4","A4","G4","A4","B4","C5","B4","A4","G4","E4","R"],
    bass:["E3","E3","C3","C3","G3","G3","A3","B3"]
  }
];
