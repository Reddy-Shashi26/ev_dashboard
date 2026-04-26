// Global AudioContext singleton to prevent creating too many contexts
let audioCtx;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Satisfying mechanical "clunk" / beep for gear shifts
export const playGearSound = () => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(500, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
  
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
};

// Futuristic ascending swoosh for drive mode changes
export const playModeSound = () => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.2);
  
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};

// Sharp, repeating warning beep for High Speed / Low Battery
export const playAlertSound = () => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  osc.frequency.setValueAtTime(2000, ctx.currentTime); // high pitch
  
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
};

// Classic turn signal "tick-tock" relay sound
export const playIndicatorSound = (isTick) => {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = 'square';
  // "Tick" is higher pitch, "Tock" is lower
  osc.frequency.setValueAtTime(isTick ? 600 : 400, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
};

// Powerful Bike / EV Startup Sound (Futuristic Engine Rev)
export const playBikeStartupSound = () => {
  const ctx = getAudioContext();
  
  // Main engine hum
  const osc1 = ctx.createOscillator();
  // Sub bass rumble
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc1.type = 'sawtooth';
  osc2.type = 'square';
  
  // Rev up frequencies
  osc1.frequency.setValueAtTime(50, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.8);
  osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 2.0);
  
  osc2.frequency.setValueAtTime(25, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.8);
  osc2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 2.0);

  // Filter to make it sound muffled and powerful, not harsh
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(300, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.8);
  filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 2.0);

  // Volume envelope
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.2);
  gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 1.5);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.5);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 2.5);
  osc2.stop(ctx.currentTime + 2.5);
};
