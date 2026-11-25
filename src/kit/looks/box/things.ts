// Things to stand in a box world, each modelled about y = 0 in slab units (the slab is 4.2 across). Give each a pose:
// a fixed one, or a function of time. `k` (up to four numbers) drives moving parts; each thing says what its k means.
import type { RGB } from "../core";
import type { Pose, Thing } from "./world";

type Posed = Thing["pose"];
const thing = (pose: Posed, bound: Thing["bound"], mats: Thing["mats"], sdf: string): Thing => ({ pose, bound, mats, sdf });

/** A great balete, 3.3 tall: woven trunk, roots, aerial roots and a leafy crown 3 across. */
export const balete = (pose: Posed, leaf: [RGB, RGB] = [[0.1, 0.27, 0.25], [0.2, 0.4, 0.28]], bark: RGB = [0.33, 0.22, 0.2]) =>
  thing(pose, { at: [0, 1.6, 0], r: 2.05 }, [{ color: bark }, { color: leaf[0], color2: leaf[1], grain: 5 }], `
 float t=cap(q,vec3(0,-.1,0),vec3(-.02,1.35,0),.46,.3);
 t=smin(t,cap(q,vec3(-.05,1.2,0),vec3(-.7,2.1,.1),.22,.12),.18);
 t=smin(t,cap(q,vec3(.05,1.2,0),vec3(.8,1.95,.15),.24,.13),.18);
 t=smin(t,cap(q,vec3(0,1.3,0),vec3(.05,2.4,-.25),.22,.12),.18);
 for(int i=0;i<8;i++){float a=float(i)*.785+.25;vec3 d=vec3(cos(a),0,sin(a));float L=.82+.2*sin(float(i)*2.4);t=smin(t,cap(q,vec3(d.x*.22,.62,d.z*.22),d*L-vec3(0,.02,0),.14,.07),.12);}
 for(int i=0;i<6;i++){float a=float(i)*1.047+.5;vec3 b=vec3(cos(a)*1.02,0,sin(a)*.95);t=min(t,cap(q,b+vec3(0,-.1,0),b*vec3(.86,0,.86)+vec3(0,2.,0),.05,.035));}
 t+=.018*sin(atan(q.z,q.x)*13.+q.y*2.2);
 float c=ell(q-vec3(-.75,2.35,.15),vec3(.72,.5,.66));
 c=smin(c,ell(q-vec3(.8,2.25,.1),vec3(.76,.5,.68)),.12);
 c=smin(c,ell(q-vec3(0,2.75,-.3),vec3(.9,.58,.78)),.12);
 c=smin(c,ell(q-vec3(-.1,2.3,-.85),vec3(.8,.48,.5)),.12);
 c=smin(c,ell(q-vec3(.05,2.5,.62),vec3(.55,.36,.42)),.1);
 if(c<.3)c+=.1*(noise(q*6.5)-.5)+.05*(noise(q*15.)-.5);
 return U(vec2(t*.85,MAT0),vec2(c*.7,MAT1));`);

/** A small round tree, 1 tall. */
export const tree = (pose: Posed, leaf: [RGB, RGB] = [[0.16, 0.36, 0.22], [0.3, 0.5, 0.26]]) =>
  thing(pose, { at: [0, 0.55, 0], r: 0.62 }, [{ color: [0.36, 0.24, 0.18] }, { color: leaf[0], color2: leaf[1], grain: 7 }], `
 float t=cap(q,vec3(0,-.1,0),vec3(.02,.55,0),.06,.04),c=ell(q-vec3(0,.72,0),vec3(.3,.28,.3));
 c=smin(c,ell(q-vec3(.17,.6,.05),vec3(.2,.17,.2)),.08);c=smin(c,ell(q-vec3(-.15,.58,-.04),vec3(.2,.17,.2)),.08);
 if(c<.2)c+=.04*(noise(q*12.)-.5);
 return U(vec2(t,MAT0),vec2(c*.75,MAT1));`);

/** A coconut palm, 1.5 tall. */
export const palm = (pose: Posed) =>
  thing(pose, { at: [0.1, 0.9, 0], r: 1.05 }, [{ color: [0.42, 0.31, 0.22] }, { color: [0.16, 0.38, 0.2], color2: [0.28, 0.5, 0.22], grain: 6 }], `
 float t=min(cap(q,vec3(0,-.1,0),vec3(.09,.75,0),.06,.045),cap(q,vec3(.09,.75,0),vec3(.2,1.4,0),.045,.035))+.006*sin(q.y*60.);
 vec3 c=q-vec3(.2,1.42,0);float a=atan(c.z,c.x),s=6.2832/8.,f=(floor(a/s)+.5)*s;c.xz=mat2(cos(f),-sin(f),sin(f),cos(f))*c.xz;
 c.x=abs(c.x);float drop=.1*sin(min(c.x,.6)*4.)-.75*c.x*c.x;
 float l=max(length(vec2(max(0.,c.x-.62),(c.y-drop)))-.02-.02*smoothstep(.6,0.,c.x),abs(c.z)-.085*smoothstep(.66,.1,c.x));
 return U(vec2(t,MAT0),vec2(l*.45,MAT1));`);

/** A nipa hut on stilts, 1.35 tall, with a lit window facing +z. k[0]: how bright the window is. */
export const hut = (pose: Posed) =>
  thing(pose, { at: [0, 0.65, 0], r: 0.9 }, [{ color: [0.5, 0.34, 0.22] }, { color: [0.56, 0.43, 0.26] }, { color: [0.2, 0.15, 0.1], glow: [2.2, 1.15, 0.4], glowBy: 0 }], `
 float b=rbox(q-vec3(0,.62,0),vec3(.36,.24,.32),.02),l=1e5;
 for(int i=0;i<4;i++){vec2 s=vec2(i<2?-1.:1.,(i&1)==0?-1.:1.);l=min(l,cap(q,vec3(s.x*.3,-.15,s.y*.26),vec3(s.x*.3,.5,s.y*.26),.04,.04));}
 vec3 f=q-vec3(0,.86,0);float ro=max(max(dot(vec2(abs(f.x),f.y-.5),normalize(vec2(.5,.54))),dot(vec2(abs(f.z),f.y-.5),normalize(vec2(.5,.5)))),-f.y-.04);
 return U(U(vec2(min(b,l),MAT0),vec2((ro-.02+.01*sin(f.y*60.))*.8,MAT1)),vec2(rbox(q-vec3(0,.64,.32),vec3(.11,.11,.06),.01),MAT2));`);

/** A little house with a gable roof, 1 tall, its door and window on +z. k[0]: how bright the window is. With `glass`,
 *  an unlit window shows that colour instead of going dark. */
export const house = (pose: Posed, wall: RGB = [0.78, 0.68, 0.55], roof: RGB = [0.62, 0.24, 0.19], glass?: RGB) =>
  thing(pose, { at: [0, 0.48, 0], r: 0.72 }, [{ color: wall }, { color: roof }, { color: glass ?? [0.2, 0.15, 0.12], glow: [2, 1.2, 0.5], glowBy: 0, glowMix: !!glass }, { color: [0.35, 0.22, 0.16] }], `
 float b=rbox(q-vec3(0,.28,0),vec3(.4,.34,.32),.02);
 float ro=max(max(dot(vec2(abs(q.x),q.y-.98),normalize(vec2(.42,.5))),abs(q.z)-.4),.56-q.y);
 vec2 r=U(vec2(b,MAT0),vec2((ro-.015)*.85,MAT1));
 r=U(r,vec2(rbox(q-vec3(.17,.34,.32),vec3(.1,.1,.03),.01),MAT2));
 return U(r,vec2(rbox(q-vec3(-.16,.2,.32),vec3(.08,.2,.02),.01),MAT3));`);

/** Someone in a wide hat carrying a lantern, 0.7 tall, facing +x. k[0]: stride −1…1, k[1]: the lantern's light 0…1.
 * The lantern hangs at (0.26, 0.34, 0.12) in their own space: put a lamp there (`held`). */
export const walker = (pose: Posed, coat: RGB = [0.72, 0.25, 0.2]) =>
  thing(pose, { at: [0.05, 0.36, 0.05], r: 0.5 }, [{ color: coat }, { color: [0.5, 0.31, 0.22] }, { color: [0.75, 0.6, 0.36] }, { color: [0.3, 0.22, 0.12], glow: [3, 2, 0.9], glowBy: 1 }], `
 vec3 h=q-vec3(0,.02*abs(k.x),0);float s=k.x*.08;
 float b=cap(h,vec3(0,.2,0),vec3(0,.36,0),.11,.085);
 b=min(b,min(cap(h,vec3(-.04,.2,0),vec3(-.05+s,.02,.02),.045,.04),cap(h,vec3(.04,.2,0),vec3(.05-s,.02,-.02),.045,.04)));
 b=smin(b,cap(h,vec3(.06,.36,.05),vec3(.25,.42,.12),.035,.03),.03);
 float hat=max(dot(vec2(length(h.xz),h.y-.68),normalize(vec2(.55,1.))),-(h.y-.55));
 vec2 r=U(vec2(b,MAT0),vec2(length(h-vec3(0,.52,0))-.085,MAT1));
 r=U(r,vec2((hat-.015)*.9,MAT2));
 return U(r,vec2(rbox(q-vec3(.26,.34,.12),vec3(.035,.055,.035),.02),MAT3));`);

/** A point in a thing's own space, in the world, for a pose: where to put the lamp it holds. */
export function held(p: Pose, local: [number, number, number]): [number, number, number] {
  const c = Math.cos(p.turn ?? 0), s = Math.sin(p.turn ?? 0), k = p.scale ?? 1;
  return [p.at[0] + (local[0] * c - local[2] * s) * k, p.at[1] + local[1] * k, p.at[2] + (local[0] * s + local[2] * c) * k];
}

/** The kapre, crouched on a limb: 0.95 tall, sitting about y = 0, facing +z. k[0]: how open its eyes are 0…1. */
export const kapre = (pose: Posed, hair: RGB = [0.06, 0.045, 0.07]) =>
  thing(pose, { at: [0, 0.02, 0.05], r: 0.68 }, [{ color: hair }, { color: [0.1, 0.06, 0.03], glow: [3.4, 1.9, 0.35], glowBy: 0 }], `
 float b=ell(q-vec3(0,-.02,0),vec3(.25,.3,.22));b=smin(b,ell(q-vec3(-.04,.3,.1),vec3(.17,.18,.17)),.08);
 b=smin(b,cap(q,vec3(-.18,.08,.05),vec3(-.3,-.3,.2),.085,.07),.05);b=smin(b,cap(q,vec3(.2,.08,.05),vec3(.28,-.32,.18),.085,.07),.05);
 b=smin(b,cap(q,vec3(-.1,-.2,.1),vec3(-.12,-.42,.22),.1,.08),.05);b=smin(b,cap(q,vec3(.1,-.2,.1),vec3(.12,-.42,.22),.1,.08),.05);
 if(b<.2)b+=.012*sin(atan(q.z,q.x)*24.+3.*sin(q.y*9.)+q.y*6.)*smoothstep(.02,.12,length(q.xz));
 float e=min(length(q-vec3(-.115,.33,.245)),length(q-vec3(.035,.33,.25)))-.036*k.x;
 vec2 r=vec2(b*.8,MAT0);return k.x>.05?U(r,vec2(e,MAT1)):r;`);

export const rock = (pose: Posed, color: RGB = [0.4, 0.4, 0.45]) =>
  thing(pose, { at: [0, 0, 0], r: 0.2 }, [{ color }], `return vec2(ell(q,vec3(.14,.09,.12))+.012*sin(q.x*23.+q.z*17.),MAT0);`);

/** An outrigger boat (banca), 1.1 long, pointing along x, floating at y = 0. */
export const banca = (pose: Posed, color: RGB = [0.2, 0.42, 0.56]) =>
  thing(pose, { at: [0, 0.03, 0], r: 0.68 }, [{ color }, { color: [0.6, 0.47, 0.3] }], `
 vec3 h=q;h.y-=.3*h.x*h.x;float b=ell(h,vec3(.56,.13,.11));b=smax(b,-ell(h-vec3(0,.07,0),vec3(.47,.12,.08)),.02);
 vec3 o=vec3(q.x,q.y,abs(q.z));float w=cap(o,vec3(-.36,-.01,.27),vec3(.36,-.01,.27),.018,.018);
 vec3 a=vec3(abs(q.x),q.y,abs(q.z));w=min(w,cap(a,vec3(.2,.07,0),vec3(.2,0,.27),.013,.013));
 return U(vec2(b*.8,MAT0),vec2(w,MAT1));`);

/** A volcano 1.7 tall and 2.6 across, its crater lit. k[0]: how bright the lava is. */
export const volcano = (pose: Posed, rockColor: [RGB, RGB] = [[0.27, 0.21, 0.22], [0.36, 0.29, 0.27]]) =>
  thing(pose, { at: [0, 0.6, 0], r: 1.65 }, [{ color: rockColor[0], color2: rockColor[1], grain: 5 }, { color: [0.16, 0.08, 0.06], glow: [3.2, 1, 0.2], glowBy: 0 }], `
 float r=length(q.xz),y=1.75*exp(-r*1.75)+.04*sin(atan(q.z,q.x)*7.+r*4.)*smoothstep(.1,.5,r);
 float d=smax((q.y-y)*.5,r-1.45,.1);d=smax(d,-(length(q-vec3(0,1.78,0))-.34),.06);
 return U(vec2(d,MAT0),vec2(ell(q-vec3(0,1.42,0),vec3(.2,.06,.2)),MAT1));`);

/** A puffy cloud, 1 across. */
export const cloud = (pose: Posed, color: RGB = [0.85, 0.85, 0.92]) =>
  thing(pose, { at: [0, 0, 0], r: 0.65 }, [{ color }], `
 float c=ell(q,vec3(.34,.2,.22));c=smin(c,ell(q-vec3(.28,-.04,.02),vec3(.22,.14,.17)),.08);c=smin(c,ell(q-vec3(-.28,-.05,0),vec3(.22,.13,.17)),.08);
 return vec2(smax(c,-q.y-.13,.05),MAT0);`);

/** A fish, 0.6 long, swimming along +x. k[0]: the angle of its tail, in radians. */
export const fish = (pose: Posed, color: RGB = [0.85, 0.42, 0.16], belly: RGB = [0.9, 0.7, 0.42]) =>
  thing(pose, { at: [-0.03, 0, 0], r: 0.45 }, [{ color, color2: belly, grain: 4 }, { color: [0.03, 0.03, 0.05] }], `
 vec3 h=q;float bend=smoothstep(.05,-.4,h.x)*sin(k.x)*.5;h.z-=bend*(.05-h.x)*.6;
 float b=ell(h,vec3(.26,.13,.075));
 vec3 t=h-vec3(-.3,0,0);float tail=max(max(abs(t.z)-.012,abs(t.y)-.04-.9*max(0.,.06-t.x)*.7),abs(t.x)-.09);
 float fin=max(max(abs(h.z)-.01,abs(h.x+.02)-.12),abs(h.y-.11)-.07+.3*abs(h.x+.02));
 b=smin(b,min(tail,fin),.03);
 return U(vec2(b*.75,MAT0),vec2(length(vec3(h.x-.17,h.y-.03,abs(h.z)-.052))-.018,MAT1));`);

/** A wooden peg-doll person, 0.5 tall at scale 1, facing +x. k[0]: stride −1…1, k[1]: age 0 child … 1 old (a big head
 *  when young; stooped, grey and thinning when old, with glasses and, when standing, a cane), k[2]: sitting 0…1 (on a
 *  seat 0.13 high), k[3]: right arm raised 0…1. The face (k[4]…k[6], use pegK): smile −1 sad … 1, eyes closed 0…1,
 *  head turned −1 right … 1 left. `long` gives hair down the back; `oldCoat` is what the coat fades to with age.
 *  Mats: coat, skin, hair, legs, ink (eyes, brows, mouth, glasses), cheeks, shoes and cane. */
export const peg = (pose: Posed, coat: RGB, hair: RGB, opts: { legs?: RGB; skin?: RGB; long?: boolean; oldCoat?: RGB } = {}) =>
  thing(pose, { at: [0.04, 0.27, 0], r: 0.37 }, [
    { color: coat, steps: opts.oldCoat ? [{ color: opts.oldCoat, by: 1, from: 0.45, to: 0.9 }] : [] },
    { color: opts.skin ?? [0.88, 0.68, 0.52] },
    { color: hair, steps: [{ color: [0.86, 0.85, 0.83], by: 1, from: 0.68, to: 0.92 }] },
    { color: opts.legs ?? [0.22, 0.2, 0.26] },
    { color: [0.07, 0.05, 0.06] },
    { color: [0.94, 0.5, 0.48] },
    { color: [0.3, 0.19, 0.13] },
  ], `
 float age=k.y,sit=k.z,st=smoothstep(.65,1.,age)*.07,s=k.x*.075*(1.-sit),smile=k2.x,shut=k2.y,old=smoothstep(.84,.92,age);
 vec3 h=q-vec3(0,.012*abs(k.x)*(1.-sit),0);
 float hip=mix(.2,.135,sit),lg=1e5,sh2=1e5;
 for(int i=0;i<2;i++){float sd=i==0?-1.:1.,sw=s*sd;
  vec3 a=vec3(0,hip,.04*sd),kn=mix(vec3(sw*.5,.11,.04*sd),vec3(.12,.14,.045*sd),sit),f=mix(vec3(sw,.03,.04*sd),vec3(.13,.03,.05*sd),sit);
  lg=min(lg,min(cap(h,a,kn,.036,.032),cap(h,kn,f,.032,.03)));
  sh2=min(sh2,ell(h-f-vec3(.016,-.012,0),vec3(.04,.02,.027)));}
 vec3 top=vec3(st,.37-st*.4,0);
 float b=cap(h,vec3(0,hip+.01,0),top,.078,.064);
 b=smin(b,ell(h-vec3(0,hip+.02,0),vec3(.085,.06,.08)),.03);
 vec3 sh=top-vec3(0,.02,0),hand=mix(sh+vec3(s*.6+.02,-.15+.03*sit,-.085),sh+vec3(.1,.17,-.06),k.w),left=sh+vec3(-s*.6+.02,-.15+.03*sit,.085);
 float ar=min(cap(h,sh+vec3(0,0,.07),left,.026,.022),cap(h,sh+vec3(0,0,-.07),hand,.026,.022));
 b=smin(b,ar,.02);
 float cane=old*(1.-sit)>.5?cap(h,left+vec3(.02,0,.012),vec3(left.x+.05,0.,left.z+.02),.007,.007):1e5;
 float hr=mix(.085,.064,smoothstep(0.,.45,age));
 vec3 hc=top+vec3(st*.6+.005,.035+hr,0),hq=h-hc;
 hq.xz=rot(-k2.z*.6)*hq.xz;
 float hd=length(hq)-hr;
 hd=smin(hd,length(hq-vec3(hr*.98,-.008,0))-.009,.006);
 vec3 ez=vec3(hq.x,hq.y,abs(hq.z));
 hd=min(hd,length(ez-vec3(-.004,-.006,hr*.97))-.014);
 float hair=max(length(hq-vec3(-.012,.012,0))-hr*1.07,-(hq.y-.5*hq.x+.03));
 hair=smin(hair,length(hq-vec3(.03,hr*.8,.012))-hr*.32,.02);
 ${opts.long ? "hair=smin(hair,cap(hq,vec3(-.045,0,0),vec3(-.05,-.1,0),.05,.042),.02);hair=old>.5?smin(hair,length(hq-vec3(-.06,.045,0))-.03,.01):hair;" : "hair=max(hair,max(hq.y-.03+.35*hq.x,hq.y-.006+.15*hq.x)-(1.-old));"}
 float eye=ell(ez-vec3(hr*.9,.008,.026),vec3(.0085,.0085*(1.-.85*shut)+.0012,.0085));
 vec3 bw=ez-vec3(sqrt(max(hr*hr-.0017,0.))-.0005,.031+.004*smile,.026);
 float brow=cap(bw,vec3(0,-.003*smile-.006*min(smile,0.),-.011),vec3(0,.003*smile,.011),.003,.003);
 vec3 mq=hq-vec3(0,-.03,0);float mz=clamp(mq.z,-.017,.017);
 float mouth=length(mq-vec3(sqrt(max(hr*hr-.0009-mz*mz,0.))-.0012,smile*(mz*mz*38.-.004),mz))-.003;
 float glass=old>.5?min(length(vec2(length(ez.yz-vec2(.008,.026))-.018,ez.x-hr*1.02))-.0022,cap(hq,vec3(hr*1.02,.012,-.01),vec3(hr*1.02,.012,.01),.002,.002)):1e5;
 float ink=min(min(eye,brow),min(mouth,glass));
 float cheek=max(hd-.0014,length(ez-vec3(hr*.8,-.016,hr*.56))-.013);
 vec2 r=U(vec2(b,MAT0),vec2(lg,MAT3));
 r=U(r,vec2(hd,MAT1));r=U(r,vec2(hair,MAT2));r=U(r,vec2(cheek,MAT5));
 r=U(r,vec2(min(sh2,cane),MAT6));
 return U(r,vec2(ink,MAT4));`);

/** Packs a person's pose numbers: the body's four, then the face's. */
export const pegK = (stride: number, age: number, sit = 0, arm = 0, face: { smile?: number; shut?: number; look?: number } = {}) => [stride, age, sit, arm, face.smile ?? 0.3, face.shut ?? 0, face.look ?? 0];

/** Packs a dog's pose numbers. */
export const dogK = (legs: number, tail: number, age: number, lie = 0, bandana = false) => [legs, tail, age, lie + (bandana ? 2 : 0)];

/** A dog, 0.34 long and 0.25 tall, facing +x. k (use dogK): legs −1…1, tail wag −1…1, age 0…1 (grey muzzle, lower
 *  head), lying 0…1 plus 2 when it wears a red bandana. */
export const dog = (pose: Posed, coat: RGB = [0.78, 0.55, 0.3], muzzle: RGB = [0.93, 0.83, 0.66], ears: RGB = [0.52, 0.33, 0.19]) =>
  thing(pose, { at: [0.01, 0.14, 0], r: 0.3 }, [
    { color: coat },
    { color: muzzle, steps: [{ color: [0.82, 0.82, 0.8], by: 2, from: 0.55, to: 0.95 }] },
    { color: [0.05, 0.035, 0.04] },
    { color: [0.78, 0.12, 0.1] },
    { color: ears },
  ], `
 float band=step(1.5,k.w),lie=clamp(k.w-2.*band,0.,1.),age=k.z,dn=lie*.075;
 vec3 h=q;
 float b=ell(h-vec3(0,.135-dn,0),vec3(.125,.06,.058));
 b=smin(b,ell(h-vec3(.07,.15-dn,0),vec3(.06,.065,.055)),.04);
 vec3 hc=vec3(.135,.205-dn*.8-age*.025,0);
 b=smin(b,cap(h,vec3(.08,.16-dn,0),hc,.035,.032),.02);
 b=smin(b,length(h-hc)-.048,.02);
 float lg=1e5;
 for(int i=0;i<4;i++){float fx=i<2?.08:-.08,sz=(i&1)==0?.035:-.035,sw=k.x*.05*((i==0||i==3)?1.:-1.)*(1.-lie);
  vec3 a=vec3(fx,.12-dn,sz),f=mix(vec3(fx+sw,.015,sz),vec3(fx+.07,.015,sz*1.3),lie);
  lg=min(lg,cap(h,a,f,.022,.017));}
 vec3 tb=vec3(-.115,.15-dn,0);
 b=smin(b,min(lg,cap(h,tb,tb+vec3(-.07,.07-lie*.06,k.y*.045),.017,.01)),.015);
 float sn=ell(h-hc-vec3(.045,-.015,0),vec3(.04,.025,.026));
 vec3 eq=h-hc;eq.z=abs(eq.z);
 float ear=ell(eq-vec3(-.012,-.005,.045),vec3(.022,.04,.012));
 float dk=min(length(h-hc-vec3(.085,-.008,0))-.012,length(eq-vec3(.034,.016,.026))-.008);
 vec2 r=U(vec2(b,MAT0),vec2(sn,MAT1));
 r=U(r,vec2(ear,MAT4));r=U(r,vec2(dk,MAT2));
 return band>.5?U(r,vec2(ell(h-vec3(.095,.165-dn,0),vec3(.032,.028,.062)),MAT3)):r;`);
