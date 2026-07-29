let ctx = null;
let enabled = true;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function setSfxEnabled(v) {
  enabled = v;
  try { localStorage.setItem("sr_sfx", v ? "1" : "0"); } catch { /* ignore */ }
}

export function isSfxEnabled() {
  try { return localStorage.getItem("sr_sfx") !== "0"; } catch { return true; }
}

function blip(freq, duration, type = "sine", gain = 0.04) {
  if (!enabled || !isSfxEnabled()) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export const sfx = {
  hover: () => blip(1200, 0.05, "sine", 0.02),
  click: () => blip(660, 0.08, "triangle", 0.05),
  success: () => { blip(880, 0.09, "sine", 0.05); setTimeout(() => blip(1320, 0.12, "sine", 0.05), 90); },
  scan: () => blip(440, 0.25, "sawtooth", 0.03),
};
