/* Tiny synthesized chess sounds — no audio files needed. */
let ctx = null;
let muted = false;
try { muted = localStorage.getItem("ft-chess-muted") === "1"; } catch {}

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem("ft-chess-muted", m ? "1" : "0"); } catch {}
}

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = "sine", vol = 0.18, delay = 0, slideTo = null) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function playChessSound(kind) {
  if (muted) return;
  try {
    switch (kind) {
      case "select":
        tone(720, 0.045, "sine", 0.06);
        break;
      case "move":
        tone(210, 0.1, "triangle", 0.3, 0, 120);
        break;
      case "capture":
        tone(160, 0.12, "triangle", 0.34, 0, 80);
        tone(90, 0.14, "sine", 0.22, 0.02, 60);
        break;
      case "check":
        tone(880, 0.09, "sine", 0.16);
        tone(1174, 0.12, "sine", 0.16, 0.09);
        break;
      case "end":
        tone(523, 0.14, "triangle", 0.2);
        tone(659, 0.14, "triangle", 0.2, 0.13);
        tone(784, 0.22, "triangle", 0.22, 0.26);
        break;
      default:
        break;
    }
  } catch {}
}
