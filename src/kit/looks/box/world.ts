// World in a box: a soft, toy-like slice of land floating on a plain sky, drawn by marching rays through distance
// functions in a shader. A `BoxWorld` lists things standing on the slab; this writes the shader for exactly those things.
// No graphics card needed (it runs on the CPU renderer), so it's the slowest look: about 2 s a frame at `quality` 0.6.
import { H, W, canvas, type Painter, type RGB, type V3 } from "../core";

/** How a surface looks. Colours are 0…1. */
export type Mat = {
  color: RGB;
  /** Mottled with this colour, in patches about 1 / `grain` across. */
  color2?: RGB;
  grain?: number;
  /** Shines by itself, in this colour (may go over 1). */
  glow?: RGB;
  /** The glow is multiplied by this one of the thing's `k` numbers. */
  glowBy?: 0 | 1 | 2 | 3;
  /** With `glowBy`: below full glow, show the lit colour instead of going dark (a window by day, a lamp switched off). */
  glowMix?: boolean;
  /** Blends towards each of these colours in turn as the thing's `k[by]` goes from `from` to `to` (default 0 → 1):
   *  grey hair with age, leaves through the seasons. */
  steps?: { color: RGB; by: 0 | 1 | 2 | 3; from?: number; to?: number }[];
};

/** Where a thing is now. `turn` is about the upright axis, taking +x towards +z; `k` feeds the thing's own moving parts. */
export type Pose = { at: V3; turn?: number; scale?: number; k?: number[] };

export type Thing = {
  mats: Mat[];
  /** GLSL body of `vec2 f(vec3 q, vec4 k)`: distance and material, as `vec2(d, MAT0)`. Local units, y up, standing at 0. */
  sdf: string;
  /** A ball that holds the whole thing in every pose, in local units. Rays outside it skip the thing. */
  bound: { at: V3; r: number };
  pose: Pose | ((t: number) => Pose);
};

/** Heights are sums of `amp · sin(fx·x + px) · cos(fz·z + pz)`. */
export type Wave = { amp: number; fx: number; fz: number; px?: number; pz?: number };

export type Land = {
  /** Half its width and depth. */
  size?: number;
  depth?: number;
  waves?: Wave[];
  grass?: [RGB, RGB];
  /** Earth on the cut sides, from the top down. */
  earth?: [RGB, RGB, RGB];
  /** A worn path through these [x, z] points. */
  path?: { points: [number, number][]; width?: number; color?: RGB };
  /** Grass tufts: 0 none … 1 thick. */
  tufts?: number;
  /** Their size: 1 suits the whole slab seen from afar; smaller for close shots of small people. */
  tuftSize?: number;
  tuftColor?: RGB;
  /** Fills the land to this height. */
  water?: { level: number; color: RGB };
  /** Grass and tuft colours that change with time (seasons, snow). Replaces `grass` and `tuftColor`. */
  colorsAt?: (t: number) => { grass: [RGB, RGB]; tuft: RGB };
};

/** `stars`: 0 none … 1 a clear night. */
export type Sky = { top: RGB; bottom: RGB; key: RGB; keyFrom: V3; fill: RGB; rim: RGB; stars?: number };
/** A lamp. `haze` is the glow seen in the air round it; `shadow` makes it cast one (slow: one or two at most). */
export type Lamp = { at: V3; color: RGB; power: number; falloff?: number; haze?: number };
export type BoxCamera = { yaw: number; dist?: number; lift?: number; target?: V3; zoom?: number };

export type BoxWorld = {
  land?: Land;
  things: Thing[];
  /** Lamps now. The list must stay the same length. The first `castBy` of them cast shadows. */
  lamps?: (t: number) => Lamp[];
  castBy?: number;
  sky: (t: number) => Sky;
  camera: (t: number) => BoxCamera;
  /** Blurs the top and bottom so it feels like a small model. 0 turns it off. */
  tilt?: number;
  /** Skips, for each ray, the things it can't reach: much quicker with many things (31 at most). Off by default because
   *  it takes away the faint soft shadow things otherwise cast past their own edges. */
  cull?: boolean;
  /** Drawn at this fraction of full size, then enlarged. Time grows with its square. */
  quality?: number;
};

export const DUSK: Sky = { top: [0.4, 0.28, 0.47], bottom: [0.1, 0.11, 0.27], key: [1.47, 1.41, 1.83], keyFrom: [-0.55, 0.85, 0.5], fill: [0.21, 0.22, 0.48], rim: [0.34, 0.16, 0.2] };
export const NIGHT: Sky = { top: [0.11, 0.13, 0.3], bottom: [0.035, 0.04, 0.12], key: [0.48, 0.46, 0.59], keyFrom: [-0.55, 0.85, 0.5], fill: [0.14, 0.15, 0.33], rim: [0.09, 0.11, 0.27] };
export const DAY: Sky = { top: [0.55, 0.78, 0.92], bottom: [0.9, 0.93, 0.88], key: [2.5, 2.2, 1.7], keyFrom: [-0.5, 0.9, 0.6], fill: [0.5, 0.6, 0.75], rim: [0.2, 0.2, 0.15] };

export function mixSky(a: Sky, b: Sky, k: number): Sky {
  const m = (p: V3, q: V3): V3 => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
  const stars = (a.stars ?? 0) + ((b.stars ?? 0) - (a.stars ?? 0)) * k;
  return { top: m(a.top, b.top), bottom: m(a.bottom, b.bottom), key: m(a.key, b.key), keyFrom: m(a.keyFrom, b.keyFrom), fill: m(a.fill, b.fill), rim: m(a.rim, b.rim), ...(stars ? { stars } : {}) };
}

// ── Land ───────────────────────────────────────────────────────────────────────────────────────────────

const WAVES: Wave[] = [
  { amp: 0.1, fx: 1.1, fz: 1.3, px: 0.6 },
  { amp: 0.04, fx: 3.1, fz: 2 },
];

/** The land's height at (x, z), for standing things on it. */
export const landAt = (land: Land, x: number, z: number) => (land.waves ?? WAVES).reduce((y, w) => y + w.amp * Math.sin(w.fx * x + (w.px ?? 0)) * Math.cos(w.fz * z + (w.pz ?? 0)), 0);

// ── Writing the shader ─────────────────────────────────────────────────────────────────────────────────

/** A number as GLSL wants it. */
const n = (x: number) => {
  if (!Number.isFinite(x)) throw new Error(`box: ${x} in the world`);
  const s = String(+x.toFixed(5));
  const f = /[.e]/.test(s) ? s : `${s}.`;
  return x < 0 ? `(${f})` : f; // so that a minus before it never makes `--`
};
const v = (a: readonly number[]) => `vec${a.length}(${a.map(n).join(",")})`;

/** Distance helpers the things' GLSL can use. */
const TOOLS = `
mat2 rot(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
float cap(vec3 p,vec3 a,vec3 b,float r0,float r1){vec3 q=p-a,d=b-a;float h=clamp(dot(q,d)/dot(d,d),0.,1.);return length(q-d*h)-mix(r0,r1,h);}
float rbox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float ell(vec3 p,vec3 r){float k=length(p/r);return k<.0001?-min(r.x,min(r.y,r.z)):(k-1.)*min(r.x,min(r.y,r.z));}
float cone(vec3 p,float r,float h){return max(dot(vec2(length(p.xz),p.y-h),normalize(vec2(h,r))),-p.y);}
float hash(vec3 p){p=fract(p*.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec2 U(vec2 a,vec2 b){return a.x<b.x?a:b;}`;

/** The fragment shader for a world. `lamps`: how many it has. */
export function shader(world: BoxWorld, lamps: number) {
  const land = world.land ?? {}, size = land.size ?? 2.1, depth = land.depth ?? 2, casts = Math.min(lamps, world.castBy ?? 1);
  const waves = land.waves ?? WAVES, path = land.path, pw = path?.width ?? 0.2;
  const cull = !!world.cull;
  if (cull && world.things.length > 31) fail("cull takes 31 things at most");
  // Materials 0 land, 1 tufts, 2 water; the things' own follow.
  let next = 3;
  const ids = world.things.map((th) => th.mats.map(() => next++));
  const ground = waves.map((w) => `${n(w.amp)}*sin(${n(w.fx)}*p.x+${n(w.px ?? 0)})*cos(${n(w.fz)}*p.y+${n(w.pz ?? 0)})`).join("+") || "0.";
  const pathDist = path ? path.points.slice(1).map((b, i) => `d=min(d,seg(p,${v(path.points[i])},${v(b)}));`).join("") : "";
  const tufts = land.tufts ?? 0.55, tall = Math.max(...world.things.map((t) => t.bound.at[1] + t.bound.r), 1);
  const things = world.things.map((th, i) => `vec2 f${i}(vec3 q,vec4 k){${th.sdf.replace(/MAT(\d+)/g, (_, m) => n(ids[i][+m] ?? fail(`thing ${i} has no MAT${m}`)))}}`).join("\n");
  const calls = world.things
    .map((th, i) => `${cull ? `if((seen&${1 << i})!=0)` : ""}{vec3 q=p-PO[${i}].xyz;q.xz=rot(PO[${i}].w)*q.xz;q/=PS[${i}];float b=length(q-${v(th.bound.at)})-${n(th.bound.r)};if(b<.12){vec2 h=f${i}(q,PK[${i}]);h.x*=PS[${i}];r=U(r,h);}else r.x=min(r.x,(b+.03)*PS[${i}]);}`)
    .join("\n ");
  const colors = world.things
    .flatMap((th, i) =>
      th.mats.map((m, j) => {
        const base = m.color2 ? `mix(${v(m.color)},${v(m.color2)},noise(p*${n(m.grain ?? 5)}))` : v(m.color);
        const c = (m.steps ?? []).reduce((c, st) => `mix(${c},${v(st.color)},smoothstep(${n(st.from ?? 0)},${n(st.to ?? 1)},PK[${i}].${"xyzw"[st.by]}))`, base);
        return `if(m<${n(ids[i][j] + 0.5)})return ${c};`;
      }),
    )
    .join("\n ");
  const glows = world.things
    .flatMap((th, i) => th.mats.map((m, j) => (m.glow ? `if(m==${n(ids[i][j])})col=${m.glowBy !== undefined && m.glowMix ? `mix(col,${v(m.glow)},clamp(PK[${i}].${"xyzw"[m.glowBy]},0.,1.))` : `${v(m.glow)}${m.glowBy === undefined ? "" : `*PK[${i}].${"xyzw"[m.glowBy]}`}`};` : "")))
    .join("");
  const seasons = !!land.colorsAt;
  const [g0, g1] = land.grass ?? [[0.2, 0.33, 0.23], [0.3, 0.42, 0.25]];
  const grassA = seasons ? "gA" : v(g0), grassB = seasons ? "gB" : v(g1), tuftC = seasons ? "tC" : v(land.tuftColor ?? [0.3, 0.47, 0.28]);
  const [e0, e1, e2] = land.earth ?? [[0.36, 0.2, 0.15], [0.22, 0.12, 0.13], [0.13, 0.09, 0.15]];
  const N = Math.max(1, world.things.length), L = Math.max(1, lamps);
  return `#version 300 es
precision highp float;out vec4 O;
uniform vec2 res;uniform vec3 eye,target;uniform float zoom;
uniform vec3 skyTop,skyBottom,keyC,keyFrom,fillC,rimC;uniform float stars;${seasons ? "uniform vec3 gA,gB,tC;" : ""}
uniform vec4 PO[${N}],PK[${N}];uniform float PS[${N}];
uniform vec3 LP[${L}],LC[${L}];uniform vec2 LK[${L}];
${TOOLS}
float seg(vec2 p,vec2 a,vec2 b){vec2 q=p-a,d=b-a;return length(q-d*clamp(dot(q,d)/dot(d,d),0.,1.));}
float gh(vec2 p){return ${ground};}
float pathD(vec2 p){float d=1e3;${pathDist}return d;}
${things}
${cull ? `int seen=-1;
int canReach(vec3 o,vec3 d,float pad){int m=0;${world.things.map((th, i) => `{vec3 c=${v(th.bound.at)}*PS[${i}];c.xz=c.xz*rot(PO[${i}].w);c+=PO[${i}].xyz-o;float b=dot(c,d),R=(${n(th.bound.r)}+pad)*PS[${i}],l=dot(c,c);if(l-b*b<R*R&&(b>0.||l<R*R))m|=${1 << i};}`).join("")}return m;}` : ""}
vec2 map(vec3 p){
 float g=gh(p.xz);
 float slab=smax(rbox(p-vec3(0,${n(0.35 - depth / 2 - 0.1)},0),vec3(${n(size)},${n(depth / 2 + 0.25)},${n(size)}),.14),p.y-g,.06);
 vec2 r=vec2(slab*.9,0.);
 ${land.water ? `r=U(r,vec2(smax(rbox(p-vec3(0,${n(land.water.level - depth / 2)},0),vec3(${n(size - 0.015)},${n(depth / 2)},${n(size - 0.015)}),.1),p.y-${n(land.water.level)}-.012*sin(p.x*7.+p.z*3.)*sin(p.z*6.),.03),2.));` : ""}
 ${calls}
 ${tufts > 0 ? `if(p.y<.5&&p.y>-.3&&max(abs(p.x),abs(p.z))<${n(size - 0.05)}){vec2 id=floor(p.xz*${n(3.2 / (land.tuftSize ?? 1))}),o=vec2(hash(vec3(id,1.)),hash(vec3(id,2.))),c=(id+.3+.4*o)/${n(3.2 / (land.tuftSize ?? 1))};float gc=gh(c);if(o.x<${n(tufts)}&&max(abs(c.x),abs(c.y))<${n(size - 0.2)}&&pathD(c)>${n(pw + 0.06)}${land.water ? `&&gc>${n(land.water.level + 0.04)}` : ""}){vec3 h=(p-vec3(c.x,gc,c.y))/${n(land.tuftSize ?? 1)};float d=${n(land.tuftSize ?? 1)}*min(cap(h,vec3(0),vec3(.03,.13+.08*o.y,0),.03,.006),min(cap(h,vec3(0),vec3(-.06,.1,.03),.026,.005),cap(h,vec3(0),vec3(.02,.09,-.06),.026,.005)));r=U(r,vec2(d*.7,1.));}}` : ""}
 return r;}
vec3 nor(vec3 p){vec2 e=vec2(.0015,-.0015);return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);}
float shadow(vec3 o,vec3 d,float far,float k){${cull ? "seen=canReach(o,d,.25);" : ""}float r=1.,t=.03;for(int i=0;i<40;i++){float h=map(o+d*t).x;r=min(r,k*h/t);t+=clamp(h,.02,.16);if(r<.01||t>far)break;}${cull ? "seen=-1;" : ""}return clamp(r,0.,1.);}
float ao(vec3 p,vec3 n){float s=0.,w=1.;for(int i=1;i<5;i++){float h=.07*float(i);s+=(h-map(p+n*h).x)*w;w*=.7;}return clamp(1.-1.5*s,0.,1.);}
vec3 color(float m,vec3 p){
 if(m<.5){float below=gh(p.xz)-p.y;vec3 g=mix(${grassA},${grassB},noise(p*4.));g=mix(g,${v(path?.color ?? [0.5, 0.38, 0.27])},smoothstep(${n(pw)},${n(pw * 0.5)},pathD(p.xz)));
  vec3 s=mix(${v(e0)},${v(e1)},smoothstep(.1,.9,below+.08*sin(p.x*4.+p.z*3.)));s=mix(s,${v(e2)},smoothstep(1.1,1.3,below+.1*sin(p.x*3.-p.z*4.)));s=mix(s,s*1.7,step(.82,noise(p*7.))*.7);
  return mix(g,s,smoothstep(.05,.11,below));}
 if(m<1.5)return ${tuftC};
 if(m<2.5)return ${v(land.water?.color ?? [0.1, 0.25, 0.36])};
 ${colors}
 return vec3(1,0,1);}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*res)/res.x;
 vec3 f=normalize(target-eye),rt=normalize(cross(f,vec3(0,1,0))),up=cross(rt,f),rd=normalize(f*zoom+rt*uv.x+up*uv.y);
 vec3 col=mix(skyBottom,skyTop,smoothstep(.05,.85,gl_FragCoord.y/res.y))+vec3(.16,.1,.06)*exp(-6.*dot(uv-vec2(0,.1),uv-vec2(0,.1)));
 float dist=length(eye-target),reach=${n(Math.hypot(size, size) + Math.max(tall, depth) + 0.6)},t=max(.1,dist-reach),m=-1.;
 ${cull ? "seen=canReach(eye,rd,.14);" : ""}
 for(int i=0;i<120;i++){vec2 h=map(eye+rd*t);if(h.x<.00015*t){m=h.y;break;}t+=h.x;if(t>dist+reach)break;}
 ${cull ? "seen=-1;" : ""}
 vec3 key=normalize(keyFrom);
 if(m>=0.){vec3 p=eye+rd*t,n=nor(p),a=color(m,p);a*=a*1.35;float A=ao(p,n);
  vec3 lin=keyC*max(dot(n,key),0.)*shadow(p+n*.01,key,6.,9.);
  lin+=fillC*(.6+.4*n.y)*A+rimC*max(dot(n,normalize(vec3(.6,-.1,-.7))),0.)*A;
  ${lamps ? `for(int i=0;i<${lamps};i++){vec3 l=LP[i]-p;float d=length(l);l/=d;float s=i<${casts}?shadow(p+n*.02,l,d-.14,6.):1.;lin+=LC[i]*max(dot(n,l)*.8+.2,0.)/(1.+LK[i].x*d*d)*s;}` : ""}
  col=a*lin;float fr=pow(1.-max(dot(n,-rd),0.),3.);col+=fr*fillC*.5*A;
  if(m==2.)col+=keyC*.25*pow(max(dot(reflect(rd,n),key),0.),30.)+fr*skyTop*.4;
  ${glows}
  col=pow(col*1.15,vec3(.4545));col=col/(1.+.18*col)*1.12;
 }else{float s=(target.y-${n(depth + 0.9)}-eye.y)/rd.y;if(s>0.){vec3 p=eye+rd*s;col*=1.-.42*smoothstep(1.6,-.8,max(abs(p.x),abs(p.z))-${n(size * 0.8)});}
  if(stars>0.&&rd.y>-.2){vec3 c=floor(rd*260.);float h=hash(c+vec3(3,7,11));col+=stars*smoothstep(.9965,1.,h)*(.6+.4*sin(h*900.))*vec3(1,.94,.82);}}
 ${lamps ? `for(int i=0;i<${lamps};i++){vec3 c=LP[i]-eye;float tl=dot(c,rd);if(tl<t+.3||m<0.)col+=LC[i]*.085*LK[i].y*exp(-11.*dot(c-rd*tl,c-rd*tl));}` : ""}
 O=vec4(col,1);}`;
}

function fail(message: string): never {
  throw new Error(`box: ${message}`);
}

// ── Drawing ────────────────────────────────────────────────────────────────────────────────────────────

type Gpu = { gl: WebGL2RenderingContext; canvas: HTMLCanvasElement; at: (name: string) => WebGLUniformLocation | null };
const gpus = new WeakMap<BoxWorld, Gpu>();

function setUp(world: BoxWorld, lamps: number): Gpu {
  const q = world.quality ?? 0.6, c = canvas(Math.round(W * q), Math.round(H * q));
  const gl = c.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('The box look needs WebGL: set gl: "swangle" in the app\'s reel.config.ts (or pass --gl=swangle to remotion)');
  const prog = gl.createProgram()!;
  const add = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`box: ${gl.getShaderInfoLog(s)}`);
    gl.attachShader(prog, s);
  };
  add(gl.VERTEX_SHADER, "#version 300 es\nvoid main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}");
  add(gl.FRAGMENT_SHADER, shader(world, lamps));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`box: ${gl.getProgramInfoLog(prog)}`);
  gl.useProgram(prog);
  gl.viewport(0, 0, c.width, c.height);
  gl.enable(gl.SCISSOR_TEST);
  return { gl, canvas: c, at: (name) => gl.getUniformLocation(prog, name) };
}

export function boxLook(world: BoxWorld): Painter {
  let soft: HTMLCanvasElement | undefined;
  return (g, t) => {
    const lamps = world.lamps?.(t) ?? [];
    let gpu = gpus.get(world);
    if (!gpu) gpus.set(world, (gpu = setUp(world, lamps.length)));
    const { gl, at } = gpu;
    const cam = world.camera(t), sky = world.sky(t), dist = cam.dist ?? 13.2, target = cam.target ?? [0, 1, 0], lift = cam.lift ?? 0.4;
    gl.uniform2f(at("res"), gpu.canvas.width, gpu.canvas.height);
    gl.uniform3f(at("eye"), target[0] + dist * 0.9 * Math.sin(cam.yaw), target[1] + dist * lift, target[2] + dist * 0.9 * Math.cos(cam.yaw));
    gl.uniform3f(at("target"), ...target);
    gl.uniform1f(at("zoom"), cam.zoom ?? 2.2);
    gl.uniform3f(at("skyTop"), ...sky.top);
    gl.uniform3f(at("skyBottom"), ...sky.bottom);
    gl.uniform3f(at("keyC"), ...sky.key);
    gl.uniform3f(at("keyFrom"), ...sky.keyFrom);
    gl.uniform3f(at("fillC"), ...sky.fill);
    gl.uniform3f(at("rimC"), ...sky.rim);
    gl.uniform1f(at("stars"), sky.stars ?? 0);
    const colors = world.land?.colorsAt?.(t);
    if (colors) {
      gl.uniform3f(at("gA"), ...colors.grass[0]);
      gl.uniform3f(at("gB"), ...colors.grass[1]);
      gl.uniform3f(at("tC"), ...colors.tuft);
    }
    const poses = world.things.map((th) => (typeof th.pose === "function" ? th.pose(t) : th.pose));
    if (poses.length) {
      gl.uniform4fv(at("PO"), poses.flatMap((p) => [...p.at, p.turn ?? 0]));
      gl.uniform4fv(at("PK"), poses.flatMap((p) => [0, 1, 2, 3].map((i) => p.k?.[i] ?? 0)));
      gl.uniform1fv(at("PS"), poses.map((p) => p.scale ?? 1));
    }
    if (lamps.length) {
      gl.uniform3fv(at("LP"), lamps.flatMap((l) => l.at));
      gl.uniform3fv(at("LC"), lamps.flatMap((l) => l.color.map((c) => c * l.power)));
      gl.uniform2fv(at("LK"), lamps.flatMap((l) => [l.falloff ?? 5, l.haze ?? 1]));
    }
    // In strips, read back one by one: a whole frame in one draw takes long enough for the browser to give up on it.
    const px = new Uint8Array(4);
    for (let y = 0; y < gpu.canvas.height; y += 64) {
      gl.scissor(0, y, gpu.canvas.width, 64);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.readPixels(0, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    }
    if (gl.isContextLost()) {
      gpus.delete(world);
      throw new Error("box: the browser dropped the graphics context; render with --concurrency=2");
    }
    g.save();
    g.imageSmoothingQuality = "high";
    g.drawImage(gpu.canvas, 0, 0, W, H);
    soft ??= canvas();
    const s = soft.getContext("2d")!, tilt = world.tilt ?? 7;
    const blurred = (px: number) => {
      s.globalCompositeOperation = "copy";
      s.filter = `blur(${px}px)`;
      s.drawImage(gpu!.canvas, 0, 0, W, H);
      s.filter = "none";
    };
    if (tilt) {
      blurred(tilt);
      s.globalCompositeOperation = "destination-in";
      const m = s.createLinearGradient(0, 0, 0, H);
      for (const [k, a] of [[0, 1], [0.3, 1], [0.42, 0], [0.62, 0], [0.74, 1], [1, 1]]) m.addColorStop(k, `rgba(0,0,0,${a})`);
      s.fillStyle = m;
      s.fillRect(0, 0, W, H);
      g.drawImage(soft, 0, 0);
    }
    blurred(26);
    g.globalCompositeOperation = "screen";
    g.globalAlpha = 0.2;
    g.drawImage(soft, 0, 0);
    g.restore();
  };
}
