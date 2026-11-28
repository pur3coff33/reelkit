// The reconstruction: the club as an architect's clay model, built from plan.ts, lit for what each shot needs to show.
// Matte white everywhere, people as plain grey figures (never faces), fire as heat and light rather than drawn flames,
// smoke as a layer that comes down from the ceiling. One Club is built per render tab and re-posed every frame.
import {
  ACESFilmicToneMapping, AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CapsuleGeometry, Color,
  DirectionalLight, DoubleSide, Fog, Group, HalfFloatType, HemisphereLight, InstancedMesh, Material, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Object3D, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, PointLight, Points, PointsMaterial,
  RepeatWrapping, Scene, SphereGeometry, SpotLight, SRGBColorSpace, Vector2, WebGLRenderer, WebGLRenderTarget, CylinderGeometry,
  ConeGeometry, Vector3,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BAR, BOOTH, CARTONS, D, DANCE, DESK, DOORS, HALL, JAM, MEZZ, MEZZ_Y, STAIRS, STOREY, TABLES, W, WALLS, crowd, doorGroup, type Door } from "../plan";

export type Mode = "study" | "party" | "fire" | "dark" | "street";

/** What a shot shows at one moment. */
export type Pose = {
  mode: Mode;
  cam: { pos: [number, number, number]; look: [number, number, number]; fov: number };
  /** Walls cut at this height (an architect's section model); omit for full height with a ceiling. */
  cut?: number;
  /** How many people (0 … 390) and how far they've pressed towards the inner door (0 … 1). */
  people?: number;
  flow?: number;
  /** Bottom of the smoke layer, m above the floor (omit: no smoke). */
  smoke?: number;
  /** Fire at the DJ booth, 0 … 1. */
  fire?: number;
  /** Doors (by group: "street", "club", "fire") drawn in red with their swing on the floor. */
  red?: string[];
  /** How far each door group stands open, radians (default a little). */
  open?: Record<string, number>;
  /** The refit going in, 0 … 1: the mezzanines lower into place from above (omit: in place). */
  mezz?: number;
  /** Keep people this far (m, across the floor) from a camera standing among them. */
  clear?: number;
  /** Seconds, for flicker, drift and sparks. */
  t: number;
};

const CLAY = 0xe7e3db, FLOOR = 0xd6d0c5, PERSON = 0x8d8983, RED = 0xd8413a;

/** Seeded noise texture, for smoke and embers. */
function noiseTexture(seed: number, size = 256, soft = 3) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const img = g.createImageData(size, size);
  // Value noise in a few octaves, wrapped so the texture tiles.
  const grid = (n: number) => Array.from({ length: n * n }, r);
  const octaves = [4, 8, 16, 32].map((n) => ({ n, v: grid(n) }));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0, a = 0.55;
      for (const { n, v: gv } of octaves) {
        const fx = (x / size) * n, fy = (y / size) * n, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
        const at = (i: number, j: number) => gv[((j + n) % n) * n + ((i + n) % n)];
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        v += a * (at(ix, iy) * (1 - sx) * (1 - sy) + at(ix + 1, iy) * sx * (1 - sy) + at(ix, iy + 1) * (1 - sx) * sy + at(ix + 1, iy + 1) * sx * sy);
        a *= 0.5;
      }
      const k = Math.pow(Math.max(0, Math.min(1, v * 1.15 - 0.12)), soft / 3);
      const o = (y * size + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(k * 255);
    }
  g.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** A person, in one of three poses: arms at the sides, dancing (arms up), or pushing (arms out in front, leaning in). Feet at
 *  y 0, facing +z. Plain and grey on purpose: a body, never a face. */
function figure(pose: "stand" | "dance" | "push") {
  const parts: BufferGeometry[] = [];
  const add = (g: BufferGeometry) => parts.push(g.index ? g.toNonIndexed() : g);
  for (const sx of [-1, 1]) add(new CapsuleGeometry(0.07, 0.72, 3, 8).translate(sx * 0.09, 0.43, 0));
  // Shoulders broad, a short neck and a head sized to them, so a crowd seen from above doesn't read as pins.
  add(new CylinderGeometry(0.215, 0.16, 0.62, 12).scale(1, 1, 0.6).translate(0, 1.1, 0));
  add(new SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.08, 0.38, 0.62).translate(0, 1.4, 0));
  add(new CylinderGeometry(0.06, 0.065, 0.08, 8).translate(0, 1.47, 0));
  add(new SphereGeometry(0.098, 14, 12).scale(1, 1.15, 1.05).translate(0, 1.58, 0));
  // Arms hang from the shoulders and swing about them.
  const arm = (sx: number, aboutX: number, aboutZ: number) => {
    const g = new CapsuleGeometry(0.055, 0.5, 3, 8).translate(0, -0.29, 0);
    g.rotateX(aboutX);
    g.rotateZ(aboutZ * sx);
    g.translate(sx * 0.215, 1.36, 0);
    add(g);
  };
  if (pose === "stand") for (const sx of [-1, 1]) arm(sx, 0.05, 0.1);
  if (pose === "dance") {
    arm(-1, 0.2, -2.7);
    arm(1, -0.3, 0.5);
  }
  if (pose === "push") for (const sx of [-1, 1]) arm(sx, -1.35, -0.12);
  const g = mergeGeometries(parts)!;
  if (pose === "push") g.rotateX(0.13);
  return g;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

export class Club {
  renderer: WebGLRenderer;
  scene = new Scene();
  camera: PerspectiveCamera;
  private composer: EffectComposer;
  private ao: GTAOPass;
  private bloom: UnrealBloomPass;
  private clay = new MeshStandardMaterial({ color: CLAY, roughness: 0.93 });
  private floorMat = new MeshStandardMaterial({ color: FLOOR, roughness: 0.95 });
  private foam = new MeshStandardMaterial({ color: 0xc9c2b6, roughness: 1, emissive: new Color(0xff4d0d), emissiveIntensity: 0 });
  private redMat = new MeshStandardMaterial({ color: RED, roughness: 0.6, emissive: new Color(RED), emissiveIntensity: 0.35 });
  private walls: { mesh: Mesh; h: number; y0: number }[] = [];
  private ceiling!: Mesh;
  private outside = new Group();
  private leaves = new Map<string, { pivot: Object3D; leaf: Mesh; door: Door }>();
  private arcs = new Map<string, Mesh[]>();
  private people: Record<"stand" | "dance" | "push", InstancedMesh> = {} as never;
  private cartons!: InstancedMesh;
  private mezz = new Group();
  private smoke: Mesh[] = [];
  private smokeTex = noiseTexture(7);
  private sparks!: Points;
  private fireLights: PointLight[] = [];
  private partyLights: SpotLight[] = [];
  private hemi = new HemisphereLight(0xffffff, 0xa9a196, 1);
  private sun = new DirectionalLight(0xffffff, 2);
  private streetLights: PointLight[] = [];
  private foyerLight = new PointLight(0xffc27a, 0, 9, 1.6);
  /** In the dark: the fire's light thrown back off the smoke, and the street's light down the corridor. */
  private smokeGlow = new PointLight(0xff6a2a, 0, 16, 1.6);
  private hallLight = new PointLight(0xa9bcd6, 0, 10, 1.4);

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.renderer = new WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFSoftShadowMap;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.camera = new PerspectiveCamera(40, width / height, 0.05, 400);

    this.build();

    this.composer = new EffectComposer(this.renderer, new WebGLRenderTarget(width, height, { type: HalfFloatType, samples: 4 }));
    this.composer.setPixelRatio(1);
    this.composer.setSize(width, height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new GTAOPass(this.scene, this.camera, width, height);
    this.ao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16 });
    this.ao.blendIntensity = 0.85;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new Vector2(width, height), 0.5, 0.6, 0.82);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  private box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, mat: Material = this.clay, parent: Object3D = this.scene) {
    const m = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  private build() {
    const s = this.scene;
    // Floor, dance floor, and the ground outside.
    this.box(-0.1, W + 0.1, -0.12, 0, -0.1, D + 0.1, this.floorMat);
    this.box(DANCE.x0, DANCE.x1, 0, 0.035, DANCE.z0, DANCE.z1, new MeshStandardMaterial({ color: 0xebe7df, roughness: 0.7 }));
    // Walls (each kept with its full height so a cut can lower it).
    for (const w of WALLS) {
      const h = w.height ?? STOREY, t = 0.1;
      const m = w.along === "x" ? this.box(w.from, w.to, 0, h, w.at - t, w.at + t) : this.box(w.at - t, w.at + t, 0, h, w.from, w.to);
      this.walls.push({ mesh: m, h, y0: 0 });
    }
    // Lintels over every door gap, up to the storey.
    for (const d of DOORS) {
      const m = d.along === "x" ? this.box(d.from, d.to, 2.2, STOREY, d.at - 0.1, d.at + 0.1) : this.box(d.at - 0.1, d.at + 0.1, 2.2, STOREY, d.from, d.to);
      this.walls.push({ mesh: m, h: STOREY - 2.2, y0: 2.2 });
    }
    this.ceiling = this.box(-0.1, W + 0.1, STOREY, STOREY + 0.25, -0.1, D + 0.1);

    // DJ booth on its riser, a foam-lined backdrop behind it, foam on the storage wall beside it.
    this.box(BOOTH.x0, BOOTH.x1, 0, 0.45, BOOTH.z0, BOOTH.z1);
    this.box(BOOTH.x0, BOOTH.x1, 0.45, 1.45, BOOTH.z0, BOOTH.z0 + 0.35);
    this.box(BOOTH.x0 - 0.2, BOOTH.x1 + 0.2, 0, MEZZ_Y, BOOTH.z1 + 0.35, BOOTH.z1 + 0.5);
    for (let i = 0; i < 10; i++)
      for (let j = 0; j < 8; j++) this.box(BOOTH.x0 - 0.1 + i * 0.26, BOOTH.x0 + 0.1 + i * 0.26, 0.5 + j * 0.27, 0.72 + j * 0.27, BOOTH.z1 + 0.25, BOOTH.z1 + 0.35, this.foam);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 8; j++) this.box(5.28, 5.38, 0.5 + j * 0.27, 0.72 + j * 0.27, 16.5 + i * 0.33, 16.78 + i * 0.33, this.foam);
    // Egg cartons on the ceiling: little cups hanging in a grid (they glow when the fire takes them).
    const cups: [number, number, number][] = [];
    for (const c of CARTONS) for (let x = c.r.x0; x < c.r.x1; x += 0.3) for (let z = c.r.z0; z < c.r.z1; z += 0.3) cups.push([x, c.y, z]);
    this.cartons = new InstancedMesh(new ConeGeometry(0.13, 0.1, 4).rotateX(Math.PI).translate(0, -0.05, 0), this.foam, cups.length);
    cups.forEach(([x, y, z], i) => {
      const m = new Object3D();
      m.position.set(x, y, z);
      m.rotation.y = Math.PI / 4;
      m.updateMatrix();
      this.cartons.setMatrixAt(i, m.matrix);
    });
    this.cartons.castShadow = true;
    s.add(this.cartons);
    // The semi-circular bar against the right wall, in short straight runs.
    const runs = 16;
    for (let i = 0; i < runs; i++) {
      const a = Math.PI / 2 + (Math.PI * (i + 0.5)) / runs, len = (Math.PI * BAR.r) / runs + 0.02;
      const m = new Mesh(new BoxGeometry(BAR.w, 1.1, len), this.clay);
      m.position.set(BAR.cx + BAR.r * Math.cos(a), 0.55, BAR.cz + BAR.r * Math.sin(a));
      m.rotation.y = -a;
      m.castShadow = m.receiveShadow = true;
      s.add(m);
    }
    // Round tables and their chairs down the left wall.
    for (const [x, z] of TABLES) {
      const top = new Mesh(new CylinderGeometry(0.36, 0.36, 0.04, 20), this.clay);
      top.position.set(x, 0.74, z);
      const leg = new Mesh(new CylinderGeometry(0.04, 0.12, 0.72, 10), this.clay);
      leg.position.set(x, 0.36, z);
      for (const m of [top, leg]) {
        m.castShadow = m.receiveShadow = true;
        s.add(m);
      }
      for (const dz of [-0.55, 0.55]) {
        this.box(x - 0.2, x + 0.2, 0, 0.45, z + dz - 0.2, z + dz + 0.2);
        this.box(x - 0.2, x + 0.2, 0.45, 0.9, z + dz + (dz > 0 ? 0.16 : -0.2), z + dz + (dz > 0 ? 0.2 : -0.16));
      }
    }
    // The reception desk just inside the main doors.
    this.box(DESK.x0, DESK.x1, 0, 1.05, DESK.z0, DESK.z1);
    // Mezzanine decks, their rail and posts, the stairs up (in their own group, so a shot can show them going in).
    const mz = this.mezz;
    for (const m of MEZZ) this.box(m.x0, m.x1, MEZZ_Y, MEZZ_Y + 0.22, m.z0, m.z1, this.clay, mz);
    const rail = (x0: number, x1: number, z0: number, z1: number) => {
      this.box(x0, x1 + 0.04, MEZZ_Y + 1.0, MEZZ_Y + 1.06, z0, z1 + 0.04, this.clay, mz);
      const len = Math.max(x1 - x0, z1 - z0), n = Math.ceil(len / 1.2);
      for (let i = 0; i <= n; i++) {
        const k = i / n, x = x0 + (x1 - x0) * k, z = z0 + (z1 - z0) * k;
        this.box(x - 0.025, x + 0.025, MEZZ_Y + 0.22, MEZZ_Y + 1.0, z - 0.025, z + 0.025, this.clay, mz);
      }
    };
    const edge = MEZZ[1].x1, back = MEZZ[0].z0;
    rail(edge, STAIRS.x0, back, back);
    rail(edge, edge, HALL.z1, back);
    for (const [x, z] of [[edge, HALL.z1 + 0.3], [edge, 10.3], [edge, 13.3], [edge, back], [4.2, back], [STAIRS.x0, back]]) this.box(x - 0.11, x + 0.11, 0, MEZZ_Y, z - 0.11, z + 0.11, this.clay, mz);
    const steps = 13;
    for (let i = 0; i < steps; i++) this.box(STAIRS.x0, STAIRS.x1, 0, ((i + 1) / steps) * MEZZ_Y, STAIRS.z0 + (i / steps) * (STAIRS.z1 - STAIRS.z0), STAIRS.z1, this.clay, mz);
    s.add(mz);

    // Doors: a leaf on a hinge, and its swing drawn on the floor (shown when the shot asks for it).
    for (const d of DOORS) {
      const width = d.to - d.from, pivot = new Object3D();
      const hingeAt = d.hinge === "from" ? d.from : d.to;
      if (d.along === "x") pivot.position.set(hingeAt, 0, d.at);
      else pivot.position.set(d.at, 0, hingeAt);
      const leaf = new Mesh(new BoxGeometry(width - 0.02, 2.1, 0.05), this.clay);
      leaf.castShadow = leaf.receiveShadow = true;
      leaf.position.set(width / 2, 1.05, 0);
      pivot.add(leaf);
      s.add(pivot);
      this.leaves.set(d.id, { pivot, leaf, door: d });
      // The swing, worked out in the room's own terms: from the shut leaf round a quarter turn into the room. Drawn over
      // everything: the point is that people stand in the space the door needs.
      const { u, v } = doorAxes(d), c = pivot.position.clone().setY(0.045);
      const at = (rad: number, a: number) => c.clone().addScaledVector(u, rad * Math.cos(a)).addScaledVector(v, rad * Math.sin(a));
      const band: number[] = [], fan: number[] = [];
      for (let k = 0; k < 32; k++) {
        const a0 = (k / 32) * (Math.PI / 2), a1 = ((k + 1) / 32) * (Math.PI / 2);
        const [p, q, r, t] = [at(width - 0.035, a0), at(width + 0.035, a0), at(width - 0.035, a1), at(width + 0.035, a1)];
        band.push(...p.toArray(), ...q.toArray(), ...r.toArray(), ...q.toArray(), ...t.toArray(), ...r.toArray());
        fan.push(...c.toArray(), ...at(width, a0).toArray(), ...at(width, a1).toArray());
      }
      const mk = (pts: number[], opacity: number) => {
        const m = new Mesh(new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(pts), 3)), new MeshBasicMaterial({ color: RED, side: DoubleSide, transparent: true, opacity, depthTest: false, depthWrite: false }));
        m.renderOrder = 10;
        m.visible = false;
        m.frustumCulled = false;
        s.add(m);
        return m;
      };
      this.arcs.set(d.id, [mk(band, 1), mk(fan, 0.22)]);
    }

    // People: three poses, each instanced.
    const personMat = new MeshStandardMaterial({ color: PERSON, roughness: 0.9 });
    for (const pose of ["stand", "dance", "push"] as const) {
      const m = new InstancedMesh(figure(pose), personMat, 400);
      m.castShadow = m.receiveShadow = true;
      // Instanced bounds go stale as the crowd moves: never cull it.
      m.frustumCulled = false;
      s.add(m);
      this.people[pose] = m;
    }

    // Smoke: stacked sheets under the ceiling, each a little darker towards the top.
    for (let i = 0; i < 14; i++) {
      const m = new Mesh(new PlaneGeometry(W - 0.25, D - 0.25), new MeshStandardMaterial({ color: 0x3a3632, roughness: 1, transparent: true, opacity: 0, depthWrite: false, alphaMap: this.smokeTex, side: DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(W / 2, 3, D / 2);
      m.visible = false;
      s.add(m);
      this.smoke.push(m);
    }
    // Sparks and embers rising from the booth.
    const n = 260, pos = new Float32Array(n * 3);
    this.sparks = new Points(new BufferGeometry().setAttribute("position", new BufferAttribute(pos, 3)), new PointsMaterial({ color: 0xffa040, size: 0.07, map: glowTexture(), transparent: true, blending: AdditiveBlending, depthWrite: false }));
    this.sparks.frustumCulled = false;
    s.add(this.sparks);

    // Lights.
    this.sun.position.set(-14, 26, -10);
    this.sun.target.position.set(W / 2, 0, D / 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    Object.assign(this.sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 });
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.radius = 4;
    s.add(this.hemi, this.sun, this.sun.target);
    for (const [x, y, z] of [[4.0, 1.6, 17.4], [3.1, 1.2, 17.0], [4.9, 2.2, 17.7]]) {
      const l = new PointLight(0xff7a2c, 0, 16, 1.7);
      l.position.set(x, y, z);
      // Every fire light casts shadows, so walls and the door keep the glow in the room.
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.002;
      s.add(l);
      this.fireLights.push(l);
    }
    for (const [c, x, z] of [[0xb85cc4, 1.6, 12], [0x4d8fc4, 6.2, 12.5], [0xe0b070, 4, 15.5]] as const) {
      const l = new SpotLight(c, 0, 18, 0.42, 0.6, 1.4);
      l.position.set(x, STOREY - 0.3, z);
      l.target.position.set(4, 0, 13.5);
      s.add(l, l.target);
      this.partyLights.push(l);
    }
    this.foyerLight.position.set(3.3, 2.2, 1.5);
    this.smokeGlow.position.set(4.2, 2.5, 12.5);
    this.hallLight.position.set(3.3, 2.0, 2.2);
    this.hallLight.castShadow = true;
    this.hallLight.shadow.mapSize.set(1024, 1024);
    this.hallLight.shadow.bias = -0.002;
    s.add(this.foyerLight, this.smokeGlow, this.hallLight);

    // Outside: pavement, kerb, the road, the building's upper floor and its neighbours, street lamps.
    const o = this.outside;
    const asphalt = new MeshStandardMaterial({ color: 0x5c5a57, roughness: 1 });
    this.box(-40, 48, -0.14, -0.02, -3.2, -0.1, this.floorMat, o);
    this.box(-40, 48, -0.3, -0.16, -18, -3.2, asphalt, o);
    for (let i = -10; i < 12; i++) this.box(i * 4, i * 4 + 2, -0.15, -0.14, -10.7, -10.55, new MeshStandardMaterial({ color: 0xdedbd4 }), o);
    // The upper floor of the club: a wide window band over an awning (the 2008 photo).
    this.box(-0.1, W + 0.1, STOREY, 7.9, -0.1, 0.12, this.clay, o);
    this.box(1.0, 7.0, 5.95, 7.35, -0.14, 0.0, new MeshStandardMaterial({ color: 0x1a1c1f, roughness: 0.3, metalness: 0.2 }), o);
    this.box(0.4, W - 0.4, 3.35, 3.45, -1.2, 0, this.clay, o);
    this.box(-0.1, W + 0.1, 7.9, 8.2, -0.1, D, this.clay, o);
    // Neighbours: the restaurant on the left, offices on the right, others down the street.
    this.box(-9.5, -0.15, 0, 9.5, 0, D, this.clay, o);
    this.box(W + 0.15, W + 9, 0, 6.6, 0, D, this.clay, o);
    this.box(-22, -9.8, 0, 13, 0, D, this.clay, o);
    this.box(W + 9.3, W + 21, 0, 11, 0, D, this.clay, o);
    for (const x of [-6, 14]) {
      this.box(x - 0.07, x + 0.07, 0, 6.4, -2.9, -2.76, this.clay, o);
      this.box(x - 0.07, x + 1.3, 6.3, 6.42, -2.9, -2.76, this.clay, o);
      const l = new PointLight(0xffa64d, 0, 26, 1.5);
      l.position.set(x + 1.2, 6.1, -2.9);
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      o.add(l);
      this.streetLights.push(l);
      const bulb = new Mesh(new SphereGeometry(0.12, 10, 8), new MeshBasicMaterial({ color: 0xffd9a0 }));
      bulb.position.copy(l.position);
      o.add(bulb);
    }
    s.add(o);
  }

  /** Re-poses the model for one frame and draws it. */
  draw(p: Pose) {
    const { mode, t } = p;
    const night = mode !== "study";
    const cut = p.cut;
    // Background and fog: a museum model on black for the study; a dark room otherwise.
    this.scene.background = new Color(mode === "study" ? 0x0e1013 : mode === "street" ? 0x06080b : 0x050506);
    this.scene.fog = mode === "fire" || mode === "dark" ? new Fog(0x120c08, 3, mode === "dark" ? 14 : 22) : mode === "party" ? new Fog(0x0b0a10, 6, 30) : null;

    for (const w of this.walls) {
      const top = cut === undefined ? w.y0 + w.h : Math.min(w.y0 + w.h, cut);
      w.mesh.visible = top > w.y0 + 0.01;
      if (!w.mesh.visible) continue;
      const h = top - w.y0;
      w.mesh.scale.y = h / w.h;
      w.mesh.position.y = w.y0 + h / 2;
    }
    this.ceiling.visible = cut === undefined && mode !== "street";
    // Outside: the street always shows under a cutaway; the upper floor, the neighbours and the lamps only in the street shot.
    this.outside.visible = mode === "street" || cut !== undefined;
    for (const c of this.outside.children) {
      const tall = c instanceof Mesh && c.geometry instanceof BoxGeometry && (c.geometry.parameters.height > 0.5 || c.position.y > STOREY - 0.5);
      c.visible = mode === "street" || !(tall || c instanceof PointLight || (c instanceof Mesh && c.geometry instanceof SphereGeometry));
    }

    // Doors: each leaf turned from shut towards the room by its group's opening.
    for (const [id, { pivot, leaf, door }] of this.leaves) {
      const g = doorGroup(door), open = p.open?.[g] ?? 0.35;
      const { u, v } = doorAxes(door), dir = u.clone().multiplyScalar(Math.cos(open)).addScaledVector(v, Math.sin(open));
      pivot.rotation.y = Math.atan2(-dir.z, dir.x);
      const red = p.red?.includes(g) ?? false;
      leaf.material = red ? this.redMat : this.clay;
      for (const a of this.arcs.get(id)!) a.visible = red;
    }

    // People: who dances and who pushes is fixed per person; in the jam everyone faces the door.
    const n = Math.round(p.people ?? 0), flow = p.flow ?? 0, spots = crowd(n, 4242, flow), m = new Object3D();
    let rs = 99;
    const r = () => ((rs = (rs * 16807) % 2147483647) / 2147483647);
    const [cx, , cz] = p.cam.pos, clear = p.clear ?? 0;
    const used = { stand: 0, dance: 0, push: 0 };
    for (let i = 0; i < n; i++) {
      const k = 0.92 + r() * 0.14, tall = 0.95 + r() * 0.1, turn = r(), mood = r(), lean = (r() - 0.5) * 0.9;
      const [x, z] = spots[i];
      if (clear > 0 && Math.hypot(x - cx, z - cz) < clear) continue;
      const pose = flow > 0.4 ? (mood < 0.75 ? "push" : "stand") : mode === "party" && mood < 0.3 ? "dance" : "stand";
      m.position.set(x, 0.035, z);
      m.rotation.set(0, flow > 0.3 ? Math.atan2(JAM[0] - x, JAM[1] - z) + lean * 0.4 : turn * Math.PI * 2, 0);
      m.scale.set(k, k * tall, k);
      m.updateMatrix();
      this.people[pose].setMatrixAt(used[pose]++, m.matrix);
    }
    for (const pose of ["stand", "dance", "push"] as const) {
      this.people[pose].count = used[pose];
      this.people[pose].instanceMatrix.needsUpdate = true;
    }

    // Smoke.
    const smokeOn = p.smoke !== undefined;
    this.smoke.forEach((sheet, i) => {
      sheet.visible = smokeOn;
      if (!smokeOn) return;
      const k = i / (this.smoke.length - 1);
      sheet.position.y = p.smoke! + (STOREY - 0.1 - p.smoke!) * k;
      const mat = sheet.material as MeshStandardMaterial;
      mat.opacity = 0.1 + 0.16 * k;
      mat.alphaMap!.offset.set(0.013 * t + i * 0.17, 0.007 * t + i * 0.31);
      mat.alphaMap!.repeat.set(1.6, 4);
    });

    // Fire: patchy glow on the foam, flickering light, sparks.
    const fire = p.fire ?? 0;
    const flick = (f: number, ph: number) => 0.75 + 0.25 * Math.sin(t * f + ph) * Math.sin(t * f * 0.37 + ph * 2.1);
    this.foam.emissiveIntensity = fire * 1.1 * flick(9, 0.4);
    this.foam.emissiveMap = this.smokeTex;
    const mk = p.mezz ?? 1;
    this.mezz.visible = mk > 0.01;
    this.mezz.position.y = (1 - mk) ** 2 * 6;
    // The cartons hang from ceilings: hidden with the ceiling when the walls are cut away.
    this.cartons.visible = p.cut === undefined;
    this.fireLights.forEach((l, i) => (l.intensity = fire * [34, 16, 14][i] * flick(7 + i * 3, i)));
    const pos = this.sparks.geometry.getAttribute("position") as BufferAttribute;
    let ss = 7;
    const sr = () => ((ss = (ss * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < pos.count; i++) {
      const life = 2.2 + sr() * 1.6, ph = sr() * life, x0 = BOOTH.x0 + sr() * (BOOTH.x1 - BOOTH.x0), z0 = BOOTH.z0 + sr() * 1.2, k = ((t + ph) % life) / life;
      pos.setXYZ(i, x0 + Math.sin(k * 5 + i) * 0.3 * k, 1.2 + k * (STOREY - 1.4), z0 - k * 0.6);
    }
    pos.needsUpdate = true;
    this.sparks.visible = fire > 0.02;
    (this.sparks.material as PointsMaterial).opacity = Math.min(1, fire * 2);

    // The light of each mode.
    const party = mode === "party";
    this.partyLights.forEach((l, i) => {
      l.intensity = party ? 30 : 0;
      l.target.position.set(4 + Math.sin(t * 0.6 + i * 2.1) * 2.4, 0, 13.5 + Math.cos(t * 0.5 + i) * 2.2);
    });
    this.hemi.intensity = { study: 1.05, party: 0.22, fire: 0.06, dark: 0.015, street: 0.32 }[mode];
    this.hemi.color.set(mode === "street" ? 0x8fa2c8 : 0xffffff);
    this.sun.intensity = mode === "study" ? 2.3 : 0;
    this.sun.castShadow = mode === "study";
    this.streetLights.forEach((l) => (l.intensity = mode === "street" ? 26 : 0));
    this.foyerLight.intensity = mode === "street" ? 6 : 0;
    this.smokeGlow.intensity = mode === "dark" ? 9 * (0.85 + 0.15 * flick(3, 1)) : 0;
    this.hallLight.intensity = mode === "dark" ? 5 : 0;
    this.ao.enabled = mode === "study" || mode === "street";
    this.bloom.strength = mode === "study" ? 0.0 : mode === "street" ? 0.3 : 0.6;
    this.renderer.toneMappingExposure = { study: 1.0, party: 1.25, fire: 1.2, dark: 1.75, street: 0.95 }[mode];
    void night;

    // Camera.
    this.camera.position.set(...p.cam.pos);
    this.camera.fov = p.cam.fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(...p.cam.look);
    this.composer.render();
  }
}

/** A door's closed direction (from the hinge along the shut leaf) and the direction it opens into. */
function doorAxes(d: Door) {
  const u = d.along === "x" ? new Vector3(d.hinge === "from" ? 1 : -1, 0, 0) : new Vector3(0, 0, d.hinge === "from" ? 1 : -1);
  const v = d.along === "x" ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0);
  return { u, v };
}
