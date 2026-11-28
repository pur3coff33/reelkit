// The shape every app's reel.config.ts fills in, and the hooks an app gives the pipeline (apps/<app>/app.ts).
export type VoiceLine = {
  id: string;
  /** What the voice says (spell brand names the way they should sound). */
  text: string;
  /** What the caption shows. */
  caption: string;
  /** The music beat this line starts on. */
  beat: number;
  /** This line's speaking speed, instead of `voice.speed` (0.85 slow and heavy … 1.15 punchy). */
  speed?: number;
};

export type ReelConfig = {
  app: string;
  title: string;
  url: string;
  tagline: string;
  fps: number;
  width: number;
  height: number;
  seconds: number;
  /** `name`: one Kokoro voice ("af_heart") or a blend of several ("af_heart:0.7,af_bella:0.3"; weights are scaled to add up to 1). */
  voice: { name: string; compare?: string; speed: number; lines: VoiceLine[] };
  /** `file` is relative to the app folder. `generated`: made by the app's music hook, so bpm/offset are exact. */
  music: { bpm?: number; offset?: number; generated?: boolean; file: string };
  requireRealNote?: boolean;
  /** Chromium's graphics renderer, for reels that draw with WebGL (the box look needs "swangle"). */
  gl?: "swangle" | "angle" | "egl" | "swiftshader";
  /** "doc": export re-encodes small for photo footage (CRF 24, -tune film, AAC 192k) instead of copying the render. */
  encode?: "doc";
  theme: Record<string, string>;
};

export type Shot = {
  name: string;
  /** Path to open before recording starts. */
  path: string;
  /** Run before recording, once the page is open (scroll into place, wait for something). */
  prepare?: (h: import("./capture/record").Helpers) => Promise<void>;
  /** What happens on camera. */
  act: (h: import("./capture/record").Helpers) => Promise<void>;
  /** Run after recording stops (close what the shot opened). */
  after?: (h: import("./capture/record").Helpers) => Promise<void>;
};

export type AppModule = {
  config: ReelConfig;
  /** Fills the app with demo data (optional). Gets the command's extra flags. */
  seed?: (flags: string[]) => Promise<void>;
  /** Brings the app up for capture; resolves with its base URL and a way to stop it. */
  serve: () => Promise<{ url: string; stop: () => Promise<void> }>;
  /** Run once before the shots (log in, set up the viewer's state). */
  beforeCapture?: (h: import("./capture/record").Helpers, base: string) => Promise<void>;
  /** Run after the shots (undo anything they changed). */
  afterCapture?: () => Promise<void>;
  shots: Shot[];
  /** Records at this desktop size instead of the default phone. */
  viewport?: { width: number; height: number; scale: number };
  /** Writes the reel's voice-over itself, instead of Kokoro reading `config.voice.lines` (another engine or language). */
  voice?: (flags: string[]) => Promise<void>;
  /** Writes the reel's music to config.music.file (for generated music). */
  music?: (file: string) => Promise<void>;
};
