import { describe, expect, it } from "vitest";
import { kindMatches, mimeOf, mixFile, parseProbe, planDownloads, retryDelay } from "./fetch";
import type { Media } from "./media";

const IMAGE = `Input #0, image2, from 'plume.jpg':
  Duration: 00:00:00.04, start: 0.000000, bitrate: 512000 kb/s
  Stream #0:0: Video: mjpeg (Baseline), yuvj420p(pc, bt470bg/unknown/unknown), 3008x1960 [SAR 72:72 DAR 1504:980], 25 fps`;
const VIDEO = `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'news.mp4':
  Duration: 00:00:12.34, start: 0.000000, bitrate: 1200 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), 1280x720 [SAR 1:1 DAR 16:9], 1100 kb/s, 29.97 fps
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 44100 Hz, stereo, fltp, 96 kb/s`;

const m = (id: string): Media => ({ id, kind: "image", url: "u", page: "p", author: "a", licence: "PD", rights: "free", credit: "c" });

describe("parseProbe", () => {
  it("reads an image's size", () => expect(parseProbe(IMAGE)).toMatchObject({ width: 3008, height: 1960 }));
  it("reads a video's size and length", () => expect(parseProbe(VIDEO)).toEqual({ width: 1280, height: 720, seconds: 12.34 }));
});

describe("planDownloads", () => {
  it("skips what is already on disk, whatever its extension", () => {
    expect(planDownloads([m("a"), m("b")], ["a.jpg", "a.wav"]).map((x) => x.id)).toEqual(["b"]);
  });
});

describe("mimeOf", () => {
  it("trusts a real media type", () => expect(mimeOf("image/jpeg", "https://x/a.png")).toBe("image/jpeg"));
  it("falls back to the URL's extension when the server sends a generic type (incompetech sends octet-stream)", () => {
    expect(mimeOf("application/octet-stream", "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Heart%20of%20Nowhere.mp3")).toBe("audio/mpeg");
    expect(mimeOf("", "https://x/clip.MP4?dl=1")).toBe("video/mp4");
  });
  it("never turns a web page into media", () => expect(mimeOf("text/html", "https://x/a.jpg")).toBe("text/html"));
});

describe("kindMatches", () => {
  it("refuses a web page where media was expected", () => {
    expect(kindMatches("image", "text/html; charset=utf-8")).toBe(false);
    expect(kindMatches("video", "video/mp4")).toBe(true);
    expect(kindMatches("audio", "audio/mpeg")).toBe(true);
    expect(kindMatches("audio", "video/mp4")).toBe(false);
  });
});

describe("retryDelay", () => {
  it("waits what the server asks after a 429", () => expect(retryDelay(429, "7", 0)).toBe(7000));
  it("backs off when it doesn't say, longer each time", () => {
    expect(retryDelay(503, null, 0)).toBe(4000);
    expect(retryDelay(429, null, 2)).toBe(16000);
  });
  it("doesn't retry other failures", () => expect(retryDelay(404, null, 0)).toBeNull());
  it("gives up after four tries", () => expect(retryDelay(429, null, 4)).toBeNull());
});

describe("the mix copy of an audio file", () => {
  it("has its own name, so a WAV original (at any rate) is never taken for it", () => expect(mixFile("music")).toBe("music.mix.wav"));
  it("doesn't count as the original when planning downloads", () => {
    expect(planDownloads([{ ...m("music"), kind: "audio" }], ["music.mix.wav"]).map((x) => x.id)).toEqual(["music"]);
  });
});
