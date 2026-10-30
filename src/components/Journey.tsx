import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { BRAND, MEDIA, TIMELINE } from '../config';
import { usePortrait } from '../lib/hooks';
import { hideBootLoader, setBootProgress } from '../lib/bootLoader';
import { stillUrl } from '../lib/media';
import { createScrubber, type Scrubber } from '../scrub/createScrubber';
import { FoldCopy } from './FoldCopy';
import { Stall } from './Stall';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
ScrollTrigger.config({ ignoreMobileResize: true });

export type Phase = 'walk' | 'fold' | 'door' | 'stall' | 'after';

// Scroll timeline in vh. Video parts share one vh-per-second ratio.
const T = (() => {
  const walk = TIMELINE.walkInSeconds * TIMELINE.vhPerSecond;
  const door = TIMELINE.hutOpenSeconds * TIMELINE.vhPerSecond;
  const foldStart = walk + TIMELINE.holdVh;
  const foldEnd = foldStart + TIMELINE.foldVh;
  const doorStart = foldEnd + TIMELINE.dissolveVh;
  const doorEnd = doorStart + door;
  const stallStart = doorEnd + TIMELINE.holdVh;
  return { walk, foldStart, foldEnd, doorStart, doorEnd, stallStart, total: stallStart + TIMELINE.stallVh };
})();

const vh = (n: number) => (n * window.innerHeight) / 100;
// Fold copy motion, in vh of scroll: how long each line takes to arrive, how far
// it rises while arriving, how long (and far) it drifts up to leave, and the
// empty beat before the next line so two lines are never on screen together.
const FOLD = { enter: 30, rise: 18, exit: 45, gap: 10 };
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Linear with a soft landing: constant speed until `from`, then decelerates to
 * a stop at 1 with no kink in speed. Stops the walk ending like a hard brake.
 */
function easeOutTail(p: number, from = 0.75) {
  p = clamp01(p);
  const slope = 2 / (1 + from);
  if (p <= from) return p * slope;
  const u = (p - from) / (1 - from);
  return from * slope + (1 - from * slope) * (2 * u - u * u);
}
/** Mirror of easeOutTail: the door clip pulls away gently instead of lurching. */
const easeInHead = (p: number, until = 0.2) => 1 - easeOutTail(1 - clamp01(p), 1 - until);

/** Scroll fraction of the door segment at which the door clip reaches `clipProgress`. */
function doorScrollFor(clipProgress: number) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (easeInHead(mid) < clipProgress) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Where the hand-off auto-scroll stops: the door clip with the doors just ajar.
const DOOR_AJAR_VH = T.doorStart + doorScrollFor(TIMELINE.doorsAjarSeconds / TIMELINE.hutOpenSeconds) * (T.doorEnd - T.doorStart);
// Where the step-inside auto-scroll stops: the final interior frame, stall and hotspots fully in.
const STALL_VH = T.doorEnd + 32;

// Brightness (0-255) behind the header logo for every frame of each clip and for the stall
// still, measured at encode time (scripts/header-tone.mjs). Bundled rather than fetched so it
// also works when the site is opened from disk.
type HeaderTone = { clips: Record<string, number[]>; stills: Record<string, number> };
const HEADER_TONE = Object.values(
  import.meta.glob<HeaderTone>('/public/media/header-tone.json', { eager: true, import: 'default' }),
)[0];
const lumaAt = (clip: string, p: number) => {
  const frames = HEADER_TONE?.clips[clip];
  return frames?.length ? frames[Math.round(clamp01(p) * (frames.length - 1))] : 255;
};

/**
 * While an auto-scroll runs, swallow downward wheel/touch/key input so the
 * gesture that started it doesn't fight it. Scrolling up cancels it.
 */
function lockInput(onCancel: () => void) {
  let touchY = 0;
  const wheel = (e: WheelEvent) => (e.deltaY < 0 ? onCancel() : e.preventDefault());
  const touchStart = (e: TouchEvent) => (touchY = e.touches[0]?.clientY ?? 0);
  const touchMove = (e: TouchEvent) => ((e.touches[0]?.clientY ?? 0) > touchY ? onCancel() : e.preventDefault());
  const key = (e: KeyboardEvent) => {
    if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) onCancel();
    else if ([' ', 'ArrowDown', 'PageDown', 'End'].includes(e.key)) e.preventDefault();
  };
  window.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('touchstart', touchStart, { passive: true });
  window.addEventListener('touchmove', touchMove, { passive: false });
  window.addEventListener('keydown', key);
  return () => {
    window.removeEventListener('wheel', wheel);
    window.removeEventListener('touchstart', touchStart);
    window.removeEventListener('touchmove', touchMove);
    window.removeEventListener('keydown', key);
  };
}

interface Props {
  onPhase?(phase: Phase): void;
  /** Called when the footage behind the header logo turns dark (true) or light (false). */
  onHeaderDark?(dark: boolean): void;
  onFail(): void;
}

export function Journey({ onPhase, onHeaderDark, onFail }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const walkMount = useRef<HTMLDivElement>(null);
  const doorMount = useRef<HTMLDivElement>(null);
  const walkScrub = useRef<Scrubber | null>(null);
  const doorScrub = useRef<Scrubber | null>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [stallActive, setStallActive] = useState(false);
  const portrait = usePortrait();
  const phaseRef = useRef<Phase | null>(null);
  // Auto-scroll from the last fold line to the doors: where it fires, and whether it is running.
  const autoFrom = useRef(Infinity);
  const autoRun = useRef<{ tween: gsap.core.Tween; unlock: () => void } | null>(null);
  const lastPos = useRef(0);
  const headerDark = useRef(false);

  // Scrubbers: load part 1 behind the loader, then part 2 quietly.
  useEffect(() => {
    const walk = createScrubber(MEDIA.clips.walkIn.name, 'Walk in');
    const door = createScrubber(MEDIA.clips.hutOpen.name, 'Door opens');
    walkScrub.current = walk;
    doorScrub.current = door;
    walkMount.current?.appendChild(walk.el);
    doorMount.current?.appendChild(door.el);
    let cancelled = false;
    walk
      .load(setBootProgress)
      .then(() => {
        if (cancelled) return;
        // Re-measure the pin once the page is scrollable and once fonts have settled the layout.
        hideBootLoader().then(() => ScrollTrigger.refresh());
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
        trigger.current && update(trigger.current);
        return door.load();
      })
      .then(() => !cancelled && trigger.current && update(trigger.current))
      .catch((err) => {
        if (cancelled || err?.name === 'AbortError') return;
        console.warn(err);
        onFail();
      });
    return () => {
      cancelled = true;
      walk.destroy();
      door.destroy();
      walk.el.remove();
      door.el.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    walkScrub.current?.setFocusX(portrait ? MEDIA.portraitFocusX.walkIn : 0.5);
    doorScrub.current?.setFocusX(portrait ? MEDIA.portraitFocusX.hutOpen : 0.5);
  }, [portrait]);


  function update(self: ScrollTrigger) {
    const pos = self.progress * T.total;
    // Scrolling down past the end of the last fold line carries you on to the hut
    // with its doors just opening, so there's no long empty stretch to scroll through.
    const crossed = (at: number) => lastPos.current < at && pos >= at;
    if (!autoRun.current) {
      if (crossed(autoFrom.current) && pos < DOOR_AJAR_VH - 5) autoScrollTo(self, DOOR_AJAR_VH);
      // From the hut, the next scroll down steps straight inside to the shoppable stall.
      else if (crossed(DOOR_AJAR_VH + 3) && pos < STALL_VH - 5) autoScrollTo(self, STALL_VH);
    }
    lastPos.current = pos;
    const walkP = easeOutTail(pos / T.walk);
    const doorP = easeInHead((pos - T.doorStart) / (T.doorEnd - T.doorStart));
    walkScrub.current?.setTarget(walkP);
    doorScrub.current?.setTarget(doorP);
    setStallActive(pos >= T.doorEnd + 10);
    const phase: Phase =
      self.progress >= 1 ? 'after' : pos >= T.doorEnd ? 'stall' : pos >= T.foldEnd ? 'door' : pos >= T.foldStart - 20 ? 'fold' : 'walk';
    if (phase !== phaseRef.current) {
      phaseRef.current = phase;
      onPhase?.(phase);
    }
    // Whatever is behind the logo right now: the walk, the door clip once the dissolve is half
    // way, then the stall still; past the journey it is the cream page.
    const luma =
      phase === 'after'
        ? 255
        : pos >= T.doorEnd
          ? (HEADER_TONE?.stills[MEDIA.clips.hutOpen.last] ?? 255)
          : pos >= T.foldEnd + TIMELINE.dissolveVh / 2
            ? lumaAt(MEDIA.clips.hutOpen.name, doorP)
            : lumaAt(MEDIA.clips.walkIn.name, walkP);
    // Two thresholds so frames near the line don't make it flicker.
    const dark = headerDark.current ? luma < 150 : luma < 125;
    if (dark !== headerDark.current) {
      headerDark.current = dark;
      onHeaderDark?.(dark);
    }
  }

  function autoScrollTo(st: ScrollTrigger, targetVh: number) {
    const y = st.start + vh(targetVh);
    const distance = Math.abs(y - window.scrollY) / window.innerHeight;
    const duration = Math.min(3.6, 1.2 + distance * 0.6);
    const stop = () => {
      window.clearTimeout(safety);
      autoRun.current?.tween.kill();
      autoRun.current?.unlock();
      autoRun.current = null;
    };
    const unlock = lockInput(stop);
    // Keep input held a moment after landing so a trackpad's trailing inertia
    // from the same flick doesn't immediately set off the next glide.
    const tween = gsap.to(window, {
      scrollTo: { y, autoKill: false },
      duration,
      ease: 'power2.inOut',
      onComplete: () => void window.setTimeout(stop, 500),
    });
    // If frames are starved (background tab, slow device), never hold input hostage: land and release.
    const safety = window.setTimeout(() => {
      if (!autoRun.current) return;
      stop();
      window.scrollTo(0, y);
    }, (duration + 1) * 1000);
    autoRun.current = { tween, unlock };
  }

  useEffect(() => () => {
    autoRun.current?.tween.kill();
    autoRun.current?.unlock();
  }, []);

  // Pin the stage and drive overlays from one scrubbed timeline measured in vh.
  useLayoutEffect(() => {
    const stage = stageRef.current!;
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage);
      const tl = gsap.timeline({ defaults: { ease: 'none' } });
      tl.set({}, {}, T.total);
      tl.to(q('.hero'), { autoAlpha: 0, y: -24, duration: 24 }, 0);
      // Once the walk has eased to a stop, cross-fade to the sharp still of the same frame.
      tl.fromTo(q('.scrub-still'), { opacity: 0 }, { opacity: 1, duration: 20, ease: 'sine.inOut' }, T.walk + 8);
      // Once the walk ends, the cue comes back to lead people on to the stall.
      tl.fromTo(q('.scroll-cue--buy'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 20 }, T.walk - 10);
      tl.to(q('.scroll-cue--buy'), { autoAlpha: 0, duration: 20 }, T.foldEnd - 30);
      // Fold: lines take turns in one spot, strictly one at a time. Each rises in
      // and fades up, holds, then drifts upward out of frame while fading, and only
      // after it is fully gone (plus a short beat) does the next line begin.
      const lines = q('.fold__line');
      const first = T.foldStart - 25;
      const slot = (T.foldEnd - 15 - first) / lines.length;
      lines.forEach((line, i) => {
        const start = first + i * slot;
        const leave = start + slot - FOLD.gap - FOLD.exit;
        if (i === lines.length - 1) autoFrom.current = leave + 2;
        tl.fromTo(line, { autoAlpha: 0, y: () => vh(FOLD.rise) }, { autoAlpha: 1, y: 0, duration: FOLD.enter, ease: 'power2.out' }, start);
        tl.to(line, { y: () => -vh(FOLD.exit), duration: FOLD.exit, ease: 'power1.in' }, leave);
        tl.to(line, { autoAlpha: 0, duration: FOLD.exit * 0.8, ease: 'sine.inOut' }, leave + FOLD.exit * 0.2);
      });

      // Walk-to-door hand-off: keep moving forward through the cut. The meadow
      // pushes in and fades, the hut settles from a slight push, and a warm
      // bloom peaks in the middle so the two frames never read as a double exposure.
      const cut = T.foldEnd - 20;
      const cutLen = T.doorStart - cut;
      tl.fromTo(q('.layer--walk'), { scale: 1 }, { scale: 1.14, duration: cutLen, ease: 'power2.in' }, cut);
      tl.fromTo(q('.layer--door'), { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: cutLen, ease: 'power2.inOut' }, cut);
      tl.fromTo(q('.bloom'), { opacity: 0 }, { opacity: 0.42, duration: cutLen / 2, ease: 'sine.inOut' }, cut);
      tl.to(q('.bloom'), { opacity: 0, duration: cutLen / 2, ease: 'sine.inOut' }, cut + cutLen / 2);
      // At the hut (where the hand-off glide lands, doors just ajar) the cue returns to invite one more scroll.
      tl.fromTo(q('.scroll-cue--door'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 15 }, DOOR_AJAR_VH - 20);
      tl.to(q('.scroll-cue--door'), { autoAlpha: 0, duration: 25 }, DOOR_AJAR_VH + 70);
      tl.fromTo(q('.layer--stall'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 12 }, T.doorEnd + 4);
      tl.fromTo(q('.stall-caption'), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 15 }, T.doorEnd + 15);

      trigger.current = ScrollTrigger.create({
        trigger: stage,
        start: 'top top',
        end: () => `+=${vh(T.total)}`,
        pin: true,
        // A little smoothing so wheel steps glide like the eased video does.
        scrub: 0.5,
        animation: tl,
        invalidateOnRefresh: true,
        onUpdate: update,
        // A refresh (resize, fonts) only re-measures; it never counts as scrolling past the trigger.
        onRefresh: (self) => {
          lastPos.current = self.progress * T.total;
          update(self);
        },
      });
    }, stage);
    return () => {
      trigger.current = null;
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="journey" aria-label="A walk from the farm gate to the stall">
      <div className="stage" ref={stageRef}>
        <div className="layer layer--walk" ref={walkMount}>
          <img className="scrub-poster" src={stillUrl(MEDIA.clips.walkIn.first)} alt="" {...{ fetchpriority: "high" }} style={posterStyle(portrait, MEDIA.portraitFocusX.walkIn)} />
          {/* Sharper copy of the last frame, aligned to it pixel for pixel; fades in once the walk has stopped. */}
          <img className="scrub-still" src={stillUrl(MEDIA.clips.walkIn.last)} alt="" loading="lazy" style={posterStyle(portrait, MEDIA.portraitFocusX.walkIn)} />
        </div>
        <div className="layer layer--door" ref={doorMount}>
          <img className="scrub-poster" src={stillUrl(MEDIA.clips.hutOpen.first)} alt="" loading="lazy" style={posterStyle(portrait, MEDIA.portraitFocusX.hutOpen)} />
        </div>
        <div className="layer bloom" aria-hidden="true" />
        <div className="layer layer--stall">
          <Stall src={stillUrl(MEDIA.clips.hutOpen.last)} active={stallActive} focusX={portrait ? MEDIA.portraitFocusX.hutOpen : 0.5} />
          <StallCaption />
        </div>

        <FoldCopy sequenced />

        {/* Hero copy on the first frame, with the scroll prompt right under it. */}
        <div className="hero">
          <p className="hero__title">{heroLines(BRAND.tagline)}</p>
          <ScrollCue className="scroll-cue--hero" label="Scroll to experience" />
        </div>
        <ScrollCue className="scroll-cue--buy" label="Scroll to buy" />
        <ScrollCue className="scroll-cue--door" label="Scroll to step inside" />
      </div>
    </section>
  );
}

/**
 * Splits the tagline after its first comma so the hero reads as two lines, and highlights the
 * second line (minus its closing punctuation) as the key phrase.
 */
function heroLines(text: string) {
  const i = text.indexOf(',');
  if (i < 0) return text;
  const rest = text.slice(i + 1).trim();
  const [, phrase, end] = rest.match(/^(.*?)([.!?]*)$/)!;
  return (
    <>
      {text.slice(0, i + 1)}
      <br />
      <em className="hl">{phrase}</em>
      {end}
    </>
  );
}

function posterStyle(portrait: boolean, x: number) {
  return { objectPosition: `${(portrait ? x : 0.5) * 100}% 50%` };
}

function ScrollCue({ className, label }: { className: string; label: string }) {
  return (
    <p className={`scroll-cue ${className}`} aria-hidden="true">
      <span className="scroll-cue__label">{label}</span>
      <span className="scroll-cue__chevrons">
        <span />
        <span />
      </span>
    </p>
  );
}

export function StallCaption() {
  return (
    <div className="stall-caption">
      <h2 className="stall-caption__title">This week in the stall</h2>
      <p className="stall-caption__text">
        <span className="only-fine">Point at a crate to see where it grew.</span>
        <span className="only-coarse">Tap a crate to see where it grew.</span>
      </p>
    </div>
  );
}
