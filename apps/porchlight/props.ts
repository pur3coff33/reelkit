// The film's own set pieces for the box world (slab units, y up, standing at 0). People and the dog are in the kit
// (box/things.ts: peg, dog); these are the things only this story needs.
import type { RGB } from "../../src/kit/looks/core";
import type { Thing } from "../../src/kit/looks/box/world";

type Posed = Thing["pose"];
const thing = (pose: Posed, bound: Thing["bound"], mats: Thing["mats"], sdf: string): Thing => ({ pose, bound, mats, sdf });

/** The lantern on a post by the gate, its glass at y `GLASS` (0.37). k[0]: how bright 0…1. */
export const GLASS = 0.37;
export const postLamp = (pose: Posed) =>
  thing(pose, { at: [0, 0.2, 0], r: 0.25 }, [{ color: [0.16, 0.13, 0.12] }, { color: [0.62, 0.6, 0.55], glow: [2.7, 1.3, 0.42], glowBy: 0, glowMix: true }], `
 vec3 p=q-vec3(0,.37,0);
 float g=rbox(p,vec3(.026,.036,.026),.008);
 float f=min(rbox(p-vec3(0,.044,0),vec3(.036,.008,.036),.004),rbox(p+vec3(0,.042,0),vec3(.03,.006,.03),.003));
 f=min(f,cap(q,vec3(0,-.05,0),vec3(0,.33,0),.012,.01));
 f=min(f,length(vec2(length(p.xy-vec2(0,.06))-.012,p.z))-.003);
 return U(vec2(f,MAT0),vec2(g,MAT1));`);

/** A garden bench 0.34 long along x, its seat 0.13 high. */
export const bench = (pose: Posed, wood: RGB = [0.5, 0.33, 0.2]) =>
  thing(pose, { at: [0, 0.1, 0], r: 0.24 }, [{ color: wood, color2: [0.42, 0.27, 0.17], grain: 30 }], `
 float s=rbox(q-vec3(0,.12,0),vec3(.17,.012,.05),.006);
 s=min(s,rbox(q-vec3(0,.2,-.048),vec3(.17,.04,.008),.006));
 vec3 l=vec3(abs(q.x)-.14,q.y,abs(q.z)-.035);
 s=min(s,rbox(l-vec3(0,.06,0),vec3(.012,.06,.012),.004));
 return vec2(s,MAT0);`);

/** A picket fence along x from −`half` to +`half`, 0.2 high, with a gate across x −0.13…0.13 hinged at x = −0.13.
 *  k[0]: how far the gate is open (radians), k[1]: how many lost-dog posters are pinned up right of the gate (0…3). */
export const fence = (pose: Posed, half: number, wood: RGB = [0.88, 0.84, 0.76]) =>
  thing(pose, { at: [0, 0.1, 0], r: half + 0.1 }, [{ color: wood }, { color: [0.97, 0.96, 0.92] }, { color: [0.2, 0.15, 0.12] }], `
 float H=${half.toFixed(3)};
 vec3 p=q;float cell=.09,id=floor(p.x/cell+.5);
 vec3 c=vec3(p.x-id*cell,p.y,p.z);
 float post=rbox(c-vec3(0,.09,0),vec3(.013,.09,.008),.004);
 post=abs(p.x)<.15||abs(p.x)>H?1e5:post;
 float rail=min(rbox(p-vec3(0,.06,-.012),vec3(H,.008,.005),.003),rbox(p-vec3(0,.14,-.012),vec3(H,.008,.005),.003));
 rail=max(rail,.15-abs(p.x));
 float big=rbox(vec3(abs(p.x)-.15,p.y-.11,p.z),vec3(.018,.11,.018),.005);
 vec3 g=p-vec3(-.13,0,0);g.xz=rot(-k.x)*g.xz;
 vec3 gc=vec3(g.x-.13,g.y,g.z);
 float gate=max(rbox(gc-vec3(0,.1,0),vec3(.12,.08,.006),.004),-rbox(gc-vec3(0,.1,0),vec3(.1,.06,.1),.002));
 gate=min(gate,rbox(gc-vec3(0,.1,0),vec3(.12,.008,.006),.003));
 float wood=min(min(post,rail),min(big,gate));
 float pa=1e5;
 for(int i=0;i<3;i++){float x=.22+float(i)*.13;if(float(i)<k.y-.01)pa=min(pa,rbox(p-vec3(x,.11,.013),vec3(.035,.045,.002),.002));}
 float ink=1e5;
 for(int i=0;i<3;i++){float x=.22+float(i)*.13;if(float(i)<k.y-.01)ink=min(ink,length(vec2(length(p.xy-vec2(x,.12))-.016,p.z-.016))-.003);}
 return U(U(vec2(wood,MAT0),vec2(pa,MAT1)),vec2(ink,MAT2));`);

/** A washing line on two posts along x (0.7 apart, 0.45 high) with three sheets. k[0]: 1 while the middle one hangs. */
export const laundry = (pose: Posed) =>
  thing(pose, { at: [0, 0.25, 0], r: 0.5 }, [{ color: [0.45, 0.32, 0.22] }, { color: [0.96, 0.95, 0.9] }, { color: [0.6, 0.75, 0.9] }], `
 vec3 p=vec3(abs(q.x),q.y,q.z);
 float po=min(cap(p,vec3(.35,0,0),vec3(.35,.46,0),.012,.01),cap(p,vec3(.35,.45,-.05),vec3(.35,.45,.05),.008,.008));
 po=min(po,cap(q,vec3(-.35,.44,0),vec3(.35,.44,0),.003,.003));
 float w=.004*sin(q.x*40.+q.y*9.);
 float s1=rbox(q-vec3(-.22,.35,w),vec3(.08,.085,.004),.003),s3=rbox(q-vec3(.22,.355,w),vec3(.07,.08,.004),.003);
 float s2=k.x>.5?rbox(q-vec3(0,.345,w),vec3(.085,.09,.004),.003):1e5;
 return U(U(vec2(po,MAT0),vec2(min(s1,s2),MAT1)),vec2(s3,MAT2));`);

/** A sheet snatched off the line, carried and flapping. k[0]: flap phase. Its middle is at y 0. */
export const sheet = (pose: Posed) =>
  thing(pose, { at: [0, 0, 0], r: 0.16 }, [{ color: [0.96, 0.95, 0.9] }], `
 vec3 p=q;p.y+=.03*sin(p.x*18.+k.x)+.02*cos(p.z*16.+k.x*1.3)-.6*dot(p.xz,p.xz);
 return vec2(ell(p,vec3(.1,.012,.085))*.7,MAT0);`);

/** A wooden crate, 0.18 wide, its lid hinged at the back (−x). k[0]: how open the lid is 0…1. Has a red bow. */
export const crate = (pose: Posed) =>
  thing(pose, { at: [0, 0.1, 0], r: 0.2 }, [{ color: [0.62, 0.45, 0.28], color2: [0.52, 0.36, 0.22], grain: 25 }, { color: [0.82, 0.14, 0.14] }], `
 float b=max(rbox(q-vec3(0,.07,0),vec3(.09,.07,.08),.006),-rbox(q-vec3(0,.09,0),vec3(.078,.07,.068),.004));
 vec3 l=q-vec3(-.09,.145,0);l.xy=rot(k.x*1.9)*l.xy;
 float lid=rbox(l-vec3(.09,0,0),vec3(.094,.008,.084),.004);
 float bow=k.x<.2?min(ell(q-vec3(0,.16,0),vec3(.03,.016,.018)),rbox(q-vec3(0,.075,0),vec3(.094,.077,.012),.003)):1e5;
 return U(vec2(min(b,lid),MAT0),vec2(bow,MAT1));`);

/** A round oak 1.3 tall with a rope swing on its +z side. k[0]: autumn 0…1, k[1]: snow, k[2]: blossom,
 *  k[3]: the swing's angle (radians). */
export const oak = (pose: Posed) =>
  thing(pose, { at: [0, 0.75, 0.05], r: 0.85 }, [
    { color: [0.36, 0.25, 0.18] },
    { color: [0.2, 0.4, 0.22], color2: [0.32, 0.5, 0.25], grain: 6, steps: [{ color: [0.78, 0.42, 0.14], by: 0 }, { color: [0.93, 0.94, 0.97], by: 1 }, { color: [0.95, 0.68, 0.78], by: 2 }] },
    { color: [0.8, 0.7, 0.5] },
  ], `
 float t=cap(q,vec3(0,-.1,0),vec3(.02,.7,0),.09,.06);
 t=smin(t,cap(q,vec3(0,.55,0),vec3(.3,.86,.25),.05,.03),.05);
 t=smin(t,cap(q,vec3(0,.6,0),vec3(-.3,.9,-.1),.05,.03),.05);
 float c=ell(q-vec3(0,1.,0),vec3(.5,.36,.46));
 c=smin(c,ell(q-vec3(.32,.88,.12),vec3(.3,.25,.3)),.1);
 c=smin(c,ell(q-vec3(-.3,.9,-.08),vec3(.32,.26,.3)),.1);
 c=smin(c,ell(q-vec3(.02,1.18,-.12),vec3(.34,.24,.3)),.1);
 if(c<.2)c+=.06*(noise(q*9.)-.5);
 vec3 s=q-vec3(.28,.84,.3);s.yz=rot(k.w)*s.yz;
 float rope=min(cap(s,vec3(-.07,0,0),vec3(-.07,-.62,0),.005,.005),cap(s,vec3(.07,0,0),vec3(.07,-.62,0),.005,.005));
 float seat=rbox(s-vec3(0,-.63,0),vec3(.09,.008,.035),.004);
 return U(U(vec2(t,MAT0),vec2(c*.75,MAT1)),vec2(min(rope,seat),MAT2));`);

/** Where the swing's seat is, in the oak's own space, for its angle. */
export const swingSeat = (angle: number): [number, number, number] => [0.28, 0.84 - 0.63 * Math.cos(angle), 0.3 - 0.63 * Math.sin(angle)];

/** A small grave: a mound, a stick, a red bandana tied to it, and a few flowers. */
export const grave = (pose: Posed) =>
  thing(pose, { at: [0, 0.08, 0], r: 0.2 }, [{ color: [0.36, 0.25, 0.18] }, { color: [0.8, 0.13, 0.1] }, { color: [0.95, 0.85, 0.45] }], `
 float m=ell(q-vec3(0,0,0),vec3(.14,.05,.09));
 float st=cap(q,vec3(-.11,0,0),vec3(-.11,.2,0),.008,.007);
 float b=ell(q-vec3(-.11,.165,0),vec3(.02,.018,.022));
 b=min(b,cap(q,vec3(-.11,.165,0),vec3(-.08,.11,.012),.011,.004));
 float f=1e5;
 for(int i=0;i<4;i++){float a=float(i)*1.7;f=min(f,length(q-vec3(.03*cos(a)+.02,.05+.01*float(i&1),.05*sin(a)))-.013);}
 return U(U(vec2(min(m,st),MAT0),vec2(b,MAT1)),vec2(f,MAT2));`);

/** A hand lantern, its glass at y 0. k[0]: how bright. */
export const lantern = (pose: Posed) =>
  thing(pose, { at: [0, 0, 0], r: 0.07 }, [{ color: [0.15, 0.12, 0.1] }, { color: [0.35, 0.25, 0.12], glow: [3.4, 2.1, 0.8], glowBy: 0 }], `
 float g=rbox(q,vec3(.018,.024,.018),.006);
 float f=min(rbox(q-vec3(0,.03,0),vec3(.022,.005,.022),.003),length(vec2(length(q.xy-vec2(0,.04))-.012,q.z))-.002);
 return U(vec2(f,MAT0),vec2(g,MAT1));`);

/** A cottage 1 tall at scale 1, its door and window on +z (laid out like the kit's house): shingles, window panes, a
 *  chimney, a flower box and a step. k[0]: window light 0…1, k[1]: ivy grown 0…1, k[2]: weathering 0…1.
 *  The chimney's top is at CHIMNEY in its own space. */
export const CHIMNEY: [number, number, number] = [0.22, 1.04, -0.12];
export const cottage = (pose: Posed, wall: RGB, roof: RGB) =>
  thing(pose, { at: [0, 0.48, 0], r: 0.74 }, [
    { color: wall, color2: [wall[0] * 0.93, wall[1] * 0.92, wall[2] * 0.9], grain: 9, steps: [{ color: [0.66, 0.62, 0.55], by: 2 }] },
    { color: roof, color2: [roof[0] * 0.85, roof[1] * 0.82, roof[2] * 0.82], grain: 14, steps: [{ color: [roof[0] * 0.6, roof[1] * 0.6, roof[2] * 0.62], by: 2 }] },
    { color: [0.42, 0.5, 0.58], glow: [2.2, 1.3, 0.55], glowBy: 0, glowMix: true },
    { color: [0.42, 0.25, 0.17] },
    { color: [0.95, 0.93, 0.88] },
    { color: [0.55, 0.32, 0.26], color2: [0.45, 0.25, 0.2], grain: 30 },
    { color: [0.5, 0.33, 0.2] },
    { color: [0.93, 0.42, 0.5] },
    { color: [0.24, 0.42, 0.22] },
    { color: [0.2, 0.36, 0.18], color2: [0.3, 0.46, 0.22], grain: 22 },
    { color: [0.62, 0.6, 0.57] },
  ], `
 float b=rbox(q-vec3(0,.28,0),vec3(.4,.34,.32),.02);
 float ro=max(max(dot(vec2(abs(q.x),q.y-.98),normalize(vec2(.42,.5))),abs(q.z)-.4),.56-q.y);
 ro-=.007*smoothstep(.25,.85,fract((1.-q.y)*30.));
 float ch=min(rbox(q-vec3(.22,.86,-.12),vec3(.05,.17,.05),.008),rbox(q-vec3(.22,1.03,-.12),vec3(.062,.012,.062),.004));
 vec3 w=q-vec3(.17,.34,.32);
 float fr=max(rbox(w,vec3(.118,.118,.03),.008),-rbox(w-vec3(0,0,.02),vec3(.1,.1,.04),.004));
 fr=min(fr,min(rbox(w-vec3(0,0,.012),vec3(.1,.008,.012),.002),rbox(w-vec3(0,0,.012),vec3(.008,.1,.012),.002)));
 float gl=rbox(w,vec3(.1,.1,.012),.002);
 float bx=rbox(q-vec3(.17,.19,.37),vec3(.12,.022,.04),.006);
 float fl=1e5,lf=1e5;
 for(int i=0;i<6;i++){vec3 c=vec3(.075+float(i)*.038,.225,.36+.02*float(i&1));fl=min(fl,length(q-c-vec3(0,.012,0))-.017);lf=min(lf,ell(q-c,vec3(.03,.014,.024)));}
 float dr=rbox(q-vec3(-.16,.2,.325),vec3(.08,.2,.02),.01);
 float kn=length(q-vec3(-.105,.2,.35))-.011;
 float stp=rbox(q-vec3(-.16,.015,.39),vec3(.11,.02,.06),.006);
 float grow=noise(q*9.)*.45+length(q.xy-vec2(-.42,-.05))*.9;
 float ivy=k.y>.01?max(b-.012*(.5+.5*noise(q*40.)),grow-k.y*1.3)*.6:1e5;
 vec2 r=U(vec2(b,MAT0),vec2(ro*.85,MAT1));
 r=U(r,vec2(gl,MAT2));r=U(r,vec2(dr,MAT3));r=U(r,vec2(min(fr,kn),MAT4));r=U(r,vec2(ch,MAT5));
 r=U(r,vec2(bx,MAT6));r=U(r,vec2(fl,MAT7));r=U(r,vec2(lf,MAT8));r=U(r,vec2(ivy,MAT9));
 return U(r,vec2(stp,MAT10));`);
