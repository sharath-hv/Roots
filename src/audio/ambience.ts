// Countryside ambience made entirely with Web Audio: birds calling, crickets chirping in bouts,
// the odd bee drifting past and the soft wingbeats of a butterfly, each from a random spot in
// the stereo field. There is no constant background bed, so between calls the page is quiet.
// Browsers block audio before a gesture, so start() may have to wait for a click or key press.

const MASTER_LEVEL = 0.55;
const FADE_S = 1.2;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function noiseBuffer(ctx: AudioContext, seconds: number) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

class Ambience {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timers: number[] = [];
  private playing = false;
  private layersOn = false;

  private build() {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.noise = noiseBuffer(ctx, 1);
  }

  /** A panner feeding the master, optionally through a lowpass so distant sounds are duller. */
  private place(pan: number, cutoff = 20000) {
    const ctx = this.ctx!;
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.connect(panner).connect(this.master!);
    return { input: filter, panner };
  }

  private tone(start: number, from: number, to: number, length: number, level: number, out: AudioNode) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + length);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(level, start + length * 0.15);
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  /** One bird call: a short phrase of notes, from a random distance and direction. */
  private bird = () => {
    const ctx = this.ctx!;
    const { input } = this.place(rand(-0.85, 0.85), rand(3500, 9000));
    let t = ctx.currentTime + 0.05;
    const level = rand(0.025, 0.07);
    const base = rand(2600, 4200);
    const kind = Math.random();
    if (kind < 0.45) {
      // Repeated falling "tsee" notes.
      const notes = Math.round(rand(2, 5));
      for (let i = 0; i < notes; i++) {
        this.tone(t, base * 1.25, base * 0.8, 0.09, level, input);
        t += rand(0.12, 0.18);
      }
    } else if (kind < 0.8) {
      // Quick trill.
      const notes = Math.round(rand(6, 12));
      for (let i = 0; i < notes; i++) {
        this.tone(t, base, base * 1.15, 0.035, level * 0.8, input);
        t += 0.05;
      }
    } else {
      // Two-note whistle, low then high.
      this.tone(t, base * 0.55, base * 0.6, 0.22, level, input);
      this.tone(t + 0.28, base * 0.75, base * 0.82, 0.26, level, input);
    }
    this.later(this.bird, rand(1.5, 6));
  };

  /** A cricket chirps in a bout: each chirp is three or four tiny pulses, then it goes quiet. */
  private cricket = () => {
    const ctx = this.ctx!;
    const { input } = this.place(rand(-0.9, 0.9), rand(6000, 9000));
    const pitch = rand(4200, 5200);
    const level = rand(0.008, 0.016);
    const pulses = Math.random() < 0.5 ? 3 : 4;
    const gap = rand(0.38, 0.6);
    let t = ctx.currentTime + 0.05;
    const chirps = Math.round(rand(5, 14));
    for (let c = 0; c < chirps; c++) {
      for (let p = 0; p < pulses; p++) this.tone(t + p * 0.032, pitch, pitch * 0.98, 0.02, level, input);
      t += gap;
    }
    this.later(this.cricket, chirps * gap + rand(2, 7));
  };

  /** A bee or fly drifts across: a soft buzz that swells and fades as it pans past. */
  private buzz = () => {
    const ctx = this.ctx!;
    const t = ctx.currentTime + 0.05;
    const length = rand(1.8, 3.2);
    const fromLeft = Math.random() < 0.5;
    const { input, panner } = this.place(fromLeft ? -0.8 : 0.8, 1400);
    panner.pan.linearRampToValueAtTime(fromLeft ? 0.8 : -0.8, t + length);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const hum = rand(170, 240);
    osc.frequency.setValueAtTime(hum, t);
    // A gentle wobble in pitch keeps the buzz alive.
    const wobble = ctx.createOscillator();
    wobble.frequency.value = rand(5, 9);
    const wobbleDepth = ctx.createGain();
    wobbleDepth.gain.value = hum * 0.03;
    wobble.connect(wobbleDepth).connect(osc.frequency);

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = rand(500, 800);
    band.Q.value = 1.2;
    const env = ctx.createGain();
    const level = rand(0.012, 0.022);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(level, t + length * 0.5);
    env.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(band).connect(env).connect(input);
    osc.start(t);
    wobble.start(t);
    osc.stop(t + length + 0.05);
    wobble.stop(t + length + 0.05);
    this.later(this.buzz, rand(10, 25));
  };

  /** A butterfly is all but silent: a run of very soft wingbeats, close by, drifting sideways. */
  private butterfly = () => {
    const ctx = this.ctx!;
    let t = ctx.currentTime + 0.05;
    const start = rand(-0.6, 0.6);
    const { input, panner } = this.place(start, 900);
    const beats = Math.round(rand(6, 12));
    const rate = rand(0.09, 0.13);
    panner.pan.linearRampToValueAtTime(Math.max(-0.9, Math.min(0.9, start + rand(-0.4, 0.4))), t + beats * rate);
    for (let i = 0; i < beats; i++) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const env = ctx.createGain();
      const level = rand(0.02, 0.035);
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(level, t + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      src.connect(env).connect(input);
      src.start(t, rand(0, 0.9), 0.07);
      t += rate * rand(0.9, 1.1);
    }
    this.later(this.butterfly, rand(8, 20));
  };

  private later(fn: () => void, seconds: number) {
    this.timers.push(
      window.setTimeout(() => {
        if (!this.playing) return;
        // While the context is suspended (tab hidden) time stands still, so anything scheduled
        // now would pile up and play at once on return. Wait instead.
        if (this.ctx?.state === 'running') fn();
        else this.later(fn, 1);
      }, seconds * 1000),
    );
  }

  private onVisibility = () => {
    if (!this.ctx || !this.playing) return;
    if (document.hidden) void this.ctx.suspend();
    else void this.ctx.resume();
  };

  /** Layers start only once the browser actually lets the context run. */
  private onState = () => {
    const ctx = this.ctx;
    if (!ctx || !this.playing || this.layersOn || ctx.state !== 'running') return;
    this.layersOn = true;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(MASTER_LEVEL, ctx.currentTime, FADE_S / 3);
    this.later(this.bird, rand(0.3, 1.5));
    this.later(this.cricket, rand(1, 3));
    this.later(this.butterfly, rand(3, 8));
    this.later(this.buzz, rand(5, 12));
  };

  /**
   * Safe to call repeatedly. Without a user gesture the browser may keep the context suspended;
   * calling this again from a click or key press is what lets it run.
   */
  start() {
    if (!this.ctx) {
      this.build();
      document.addEventListener('visibilitychange', this.onVisibility);
      this.ctx!.addEventListener('statechange', this.onState);
    }
    this.playing = true;
    if (this.ctx!.state !== 'running' && !document.hidden) void this.ctx!.resume();
    this.onState();
  }

  stop() {
    if (!this.playing || !this.ctx) return;
    this.playing = false;
    this.layersOn = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    const ctx = this.ctx;
    this.master!.gain.cancelScheduledValues(ctx.currentTime);
    this.master!.gain.setTargetAtTime(0, ctx.currentTime, FADE_S / 3);
    window.setTimeout(() => {
      if (!this.playing) void ctx.suspend();
    }, FADE_S * 1000 + 200);
  }

  /** Shut down for good: used when a hot reload replaces this module during development. */
  destroy() {
    this.playing = false;
    this.layersOn = false;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    document.removeEventListener('visibilitychange', this.onVisibility);
    void this.ctx?.close();
    this.ctx = null;
  }
}

// A hot reload during development loads this module again. Without this hand-off the old
// instance keeps playing with nothing able to reach it, so the header button can't stop it.
const handoff = window as Window & { __farmAmbience?: Ambience };
handoff.__farmAmbience?.destroy();

export const ambience = new Ambience();
handoff.__farmAmbience = ambience;
