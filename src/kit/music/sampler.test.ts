import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Instrument, convolve, namingShift, parseName, parseWav, pickSample } from "./sampler";
import { SR, midi as midiHz } from "./synth";

function wav24(rate: number, samples: number[]) {
  const data = Buffer.alloc(samples.length * 3);
  samples.forEach((s, i) => data.writeIntLE(Math.round(s * 8388607), i * 3, 3));
  const head = Buffer.alloc(44);
  head.write("RIFF", 0, "latin1");
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8, "latin1");
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24);
  head.writeUInt32LE(rate * 3, 28);
  head.writeUInt16LE(3, 32);
  head.writeUInt16LE(24, 34);
  head.write("data", 36, "latin1");
  head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

/** Cycles per second of a signal, by counting upward zero crossings. */
function pitch(buf: Float32Array, from: number, to: number) {
  let crossings = 0;
  for (let i = from + 1; i < to; i++) if (buf[i - 1] < 0 && buf[i] >= 0) crossings++;
  return (crossings * SR) / (to - from);
}

const dir = mkdtempSync(join(tmpdir(), "sampler-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("sampler", () => {
  it("reads 24-bit audio", () => {
    const w = parseWav(wav24(44100, [0, 0.5, -0.5]));
    expect(w.rate).toBe(44100);
    expect(w.channels).toHaveLength(1);
    expect(w.channels[0][1]).toBeCloseTo(0.5, 3);
    expect(w.channels[0][2]).toBeCloseTo(-0.5, 3);
  });

  it("reads pitch and layer from the library's file names", () => {
    expect(parseName("susvib_A2_v1_1.wav")).toEqual({ midi: 45, layer: 1 });
    expect(parseName("BKCtbss_SusNV_A#0_v3_rr1.wav")).toEqual({ midi: 22, layer: 3 });
    expect(parseName("LLVln_ArcoVib_A3_f.wav")).toEqual({ midi: 57, layer: 5 });
    expect(parseName("UR1_C3_pp_RR1.wav")).toEqual({ midi: 48, layer: 1 });
    expect(parseName("Rode_Blower.wav")).toBeNull();
  });

  it("picks the nearest pitch first, then the nearest loudness", () => {
    const list = [{ midi: 40, layer: 1 }, { midi: 40, layer: 3 }, { midi: 52, layer: 1 }];
    expect(pickSample(list, 41, 0, 3)).toEqual({ midi: 40, layer: 1 });
    expect(pickSample(list, 41, 1, 3)).toEqual({ midi: 40, layer: 3 });
    expect(pickSample(list, 50, 1, 3)).toEqual({ midi: 52, layer: 1 });
  });

  it("plays a note at the pitch asked for, from any recording rate", () => {
    const rate = 44100, f = midiHz(48);
    const tone = Array.from({ length: rate * 2 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * f * i) / rate));
    writeFileSync(join(dir, "tone_C3_v1_1.wav"), wav24(rate, tone));
    const inst = new Instrument(dir);
    const [same] = inst.play(48, 0.8, 0.5);
    // Counting crossings over 0.6 s resolves to about 1.7 Hz.
    expect(Math.abs(pitch(same, SR * 0.1, SR * 0.7) - f)).toBeLessThan(2);
    const [up] = inst.play(55, 0.8, 0.5);
    expect(Math.abs(pitch(up, SR * 0.1, SR * 0.7) - midiHz(55))).toBeLessThan(2);
  });

  it("plays the true pitch of a recording whose name is an octave low", () => {
    // A tone filed as C3 that really sounds C4, like the library's section strings.
    const low = mkdtempSync(join(tmpdir(), "sampler-low-"));
    const rate = 44100, f = midiHz(60);
    writeFileSync(join(low, "tone_C3_v1_1.wav"), wav24(rate, Array.from({ length: rate * 2 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * f * i) / rate))));
    const [asked] = new Instrument(low, { shift: 12 }).play(60, 0.8, 0.5);
    rmSync(low, { recursive: true, force: true });
    // Asking for C4 plays the recording untouched, at C4.
    expect(Math.abs(pitch(asked, SR * 0.1, SR * 0.7) - f)).toBeLessThan(2);
    expect(namingShift("Strings/Cello Section/susvib")).toBe(12);
    expect(namingShift("Strings/Solo Contrabass/SusNV")).toBe(12);
    expect(namingShift("Strings/Solo Violin/Arco Vib")).toBe(0);
    expect(namingShift("Keys/Upright Nr1")).toBe(0);
  });

  it("holds a note far longer than its recording, without gaps or dips", () => {
    const inst = new Instrument(dir);
    const [L] = inst.play(48, 8, 0.5, { release: 0.2 });
    expect(L.length).toBe(Math.round(8.2 * SR));
    // The tone's own level is 0.354 RMS. A loop out of phase would cancel at each crossfade and sag well under it.
    const win = Math.round(SR * 0.05);
    for (let i = SR; i + win < 7.8 * SR; i += win) {
      let e = 0;
      for (let k = 0; k < win; k++) e += L[i + k] * L[i + k];
      expect(Math.sqrt(e / win)).toBeGreaterThan(0.3);
    }
  });

  it("renders the same note the same way every time", () => {
    const inst = new Instrument(dir);
    expect(inst.play(50, 1, 0.5)[0]).toEqual(inst.play(50, 1, 0.5)[0]);
  });

  it("convolves by adding the response at each input sample", () => {
    const x = new Float32Array(32);
    x[2] = 1;
    x[10] = 0.5;
    const h = new Float32Array([1, 0, 0.25]);
    const y = convolve(x, h);
    expect(y[2]).toBeCloseTo(1, 5);
    expect(y[4]).toBeCloseTo(0.25, 5);
    expect(y[10]).toBeCloseTo(0.5, 5);
    expect(y[12]).toBeCloseTo(0.125, 5);
    expect(y[5]).toBeCloseTo(0, 5);
  });
});
