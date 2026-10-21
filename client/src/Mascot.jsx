import { useEffect, useRef } from "react";

// The CRT mascot from the app, ported to React for the sign-in page.
// Based on page-mascot (https://github.com/nilbuild/page-mascot), MIT License, (c) Kamran Ahmed.
// Two 3x3 sprite sheets live in /public: nine head directions and nine expressions.

const DIRECTIONS = ["up-left", "up", "up-right", "left", "center", "right", "down-left", "down", "down-right"];
const REACTIONS = ["blink", "heart", "sparkle", "surprised", "wink", "bashful", "sleepy", "dizzy", "delighted"];
const CLOCKWISE = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 70;
const PAYOFFS = ["heart", "sparkle", "delighted"];
const BOOP_PAYOFF = 120, BOOP_END = 560, SQUASH_MS = 420, DIZZY_AFTER = 4, DIZZY_WINDOW = 1600, DIZZY_END = 1100;
const SQUASH = [
  { transform: "scale(1, 1)", easing: "ease-in" },
  { transform: "scale(1.10, 0.86)", offset: 0.18, easing: "ease-out" },
  { transform: "scale(0.95, 1.08)", offset: 0.45, easing: "ease-in-out" },
  { transform: "scale(1.03, 0.97)", offset: 0.72, easing: "ease-in-out" },
  { transform: "scale(1, 1)" },
];

// mood: an expression to hold while nothing else is happening (for example "bashful" while a password is typed).
export default function Mascot({ mood = null }) {
  const btn = useRef(null);
  const squash = useRef(null);
  const dir = useRef(null);
  const react = useRef(null);
  const moodRef = useRef(mood);
  const restRef = useRef(() => {});

  useEffect(() => {
    const cell = (el, i) => { el.style.backgroundPosition = `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%`; };
    const setDirection = (d) => cell(dir.current, DIRECTIONS.indexOf(d));
    const setReaction = (r) => {
      react.current.style.opacity = r ? 1 : 0;
      dir.current.style.opacity = r ? 0 : 1;
      cell(react.current, REACTIONS.indexOf(r || "blink"));
    };
    const rest = () => setReaction(moodRef.current);
    restRef.current = rest;
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    setDirection("center");
    rest();

    // The head follows the pointer (mouse or trackpad), or a finger on touch screens.
    let sector = -1, pointer = null, releaseTimer = 0, aimQueued = false;
    const aimNow = () => {
      if (!pointer || !btn.current) return;
      const box = btn.current.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);
      if (Math.hypot(dx, dy) < DEAD_ZONE) { sector = -1; setDirection("center"); return; }
      const angle = Math.atan2(dy, dx);
      if (sector !== -1 && Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS) return;
      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    };
    const aim = () => {
      if (aimQueued) return;
      aimQueued = true;
      requestAnimationFrame(() => { aimQueued = false; aimNow(); });
    };
    const onMove = (e) => { if (e.pointerType === "touch") return; pointer = { x: e.clientX, y: e.clientY }; aim(); };
    const touchAt = (e) => {
      const t = e.touches[0] || e.changedTouches[0];
      if (!t) return;
      clearTimeout(releaseTimer);
      pointer = { x: t.clientX, y: t.clientY };
      aim();
    };
    const touchDone = (e) => {
      if (e.touches.length) return;
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(() => { pointer = null; sector = -1; setDirection("center"); }, 1800);
    };
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("touchstart", touchAt, { passive: true });
    window.addEventListener("touchmove", touchAt, { passive: true });
    window.addEventListener("touchend", touchDone, { passive: true });
    window.addEventListener("touchcancel", touchDone, { passive: true });
    window.addEventListener("scroll", aim, { passive: true });

    // Poke it: a blink, then a happy face. Poke it four times quickly and it gets dizzy.
    let timers = [];
    const boops = { count: 0, at: 0 };
    const el = btn.current;
    const onClick = () => {
      timers.forEach(clearTimeout);
      timers = [];
      const later = (ms, fn) => timers.push(setTimeout(fn, ms));
      const now = Date.now();
      boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
      boops.at = now;
      if (boops.count >= DIZZY_AFTER) {
        boops.count = 0;
        setReaction("dizzy");
        later(DIZZY_END, rest);
      } else {
        setReaction("blink");
        later(BOOP_PAYOFF, () => setReaction(PAYOFFS[(boops.count - 1) % PAYOFFS.length]));
        later(BOOP_END, rest);
      }
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      squash.current.animate(SQUASH, { duration: SQUASH_MS, easing: "linear" });
    };
    el.addEventListener("click", onClick);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(releaseTimer);
      el.removeEventListener("click", onClick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("touchstart", touchAt);
      window.removeEventListener("touchmove", touchAt);
      window.removeEventListener("touchend", touchDone);
      window.removeEventListener("touchcancel", touchDone);
      window.removeEventListener("scroll", aim);
    };
  }, []);

  // Hold the requested expression whenever a poke isn't mid-animation.
  useEffect(() => {
    moodRef.current = mood;
    restRef.current();
  }, [mood]);

  return (
    <button ref={btn} className="mascot" type="button" aria-label="Boop the mascot">
      <span ref={squash} className="mascot-squash">
        <span ref={dir} className="mascot-layer" style={{ backgroundImage: "url(/mascot-dir.webp)" }} />
        <span ref={react} className="mascot-layer" style={{ backgroundImage: "url(/mascot-react.webp)", opacity: 0 }} />
      </span>
    </button>
  );
}
