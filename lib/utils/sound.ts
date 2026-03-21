// Speelt een sprankelend, blij geluidje bij het afronden van een taak
// Gebruikt Web Audio API — geen externe bestanden nodig

// Genereert een synthetische impulse response voor reverb
function createReverb(ctx: AudioContext, duration = 1.4, decay = 2.5): ConvolverNode {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }

  const convolver = ctx.createConvolver();
  convolver.buffer = buffer;
  return convolver;
}

export function playComplete() {
  if (typeof window === "undefined") return;

  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const t = ctx.currentTime;

    // Reverb instellen — droog/nat mix
    const reverb = createReverb(ctx);
    const reverbGain = ctx.createGain();
    reverbGain.gain.setValueAtTime(0.28, t); // hoeveelheid reverb
    reverb.connect(reverbGain);
    reverbGain.connect(ctx.destination);

    // Helper: sluit oscillator aan op zowel droog als reverb
    function playNote(freq: number, type: OscillatorType, delay: number, dur: number, vol: number) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination); // droog signaal
      gain.connect(reverb);          // nat signaal (reverb)

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t + delay);
      gain.gain.setValueAtTime(0, t + delay);
      gain.gain.linearRampToValueAtTime(vol, t + delay + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      osc.start(t + delay);
      osc.stop(t + delay + dur + 0.05);
    }

    // Opwaartse arpeggio: G5 → B5 → D6 → G6
    const notes = [
      { freq: 784.0,   delay: 0.00, dur: 0.18 },
      { freq: 987.77,  delay: 0.07, dur: 0.18 },
      { freq: 1174.7,  delay: 0.14, dur: 0.22 },
      { freq: 1567.98, delay: 0.21, dur: 0.35 },
    ];

    notes.forEach(({ freq, delay, dur }) => {
      playNote(freq,      "sine",     delay, dur,        0.15);  // hoofdtoon
      playNote(freq * 2,  "triangle", delay, dur * 0.6,  0.04);  // overtoon (sprankel)
    });

    // Shimmer bovenop
    playNote(3200, "sine", 0.00, 0.18, 0.04);
    playNote(4200, "sine", 0.06, 0.14, 0.03);

  } catch {
    // Geen geluid beschikbaar — geen probleem
  }
}
