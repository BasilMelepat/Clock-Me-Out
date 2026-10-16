let ctx;

// Plays one of three alert styles using the Web Audio API (no audio files needed).
export function playSound(style = "chime") {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    const tone = (freq, start, dur, type = "sine", vol = 0.25) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.linearRampToValueAtTime(vol, t0 + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + start);
      o.stop(t0 + start + dur + 0.05);
    };
    if (style === "marimba") [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.18, 0.5, "triangle", 0.3));
    else if (style === "bell") for (let i = 0; i < 8; i++) { tone(880, i * 0.4, 0.35, "square", 0.3); tone(1320, i * 0.4, 0.35, "square", 0.15); }
    else [659, 880, 1319].forEach((f, i) => tone(f, i * 0.25, 0.9, "sine", 0.25));
  } catch {
    /* audio blocked by the browser until the page is interacted with */
  }
}

export function notify(settings, message) {
  if (settings?.sound) playSound(settings.soundStyle);
  if (settings?.notifications && "Notification" in window && Notification.permission === "granted") {
    new Notification("Clock me Out", { body: message });
  }
}
