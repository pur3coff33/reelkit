// The film beat by beat: which lines are told over which shots. Lengths come from the voice (timing.ts → layout.gen.ts).
import { RINGS } from "../../src/kit/doc/geo";
import type { Beat } from "../../src/kit/doc/timing";
import { T } from "./script";

const PINATUBO = { lon: 120.35, lat: 15.13 }; // GVP
const CLARK = { lon: 120.56, lat: 15.18 }; // east of the volcano, within 25 km of the summit (Wolfe)
const SUBIC = { lon: 120.28, lat: 14.8 }; // about 40 km southwest (Wolfe)

/** Central Luzon's coast, finer than the shared ring (which cuts straight across Manila Bay), traced through coastal
 *  towns from Cavite round Manila Bay and Bataan to Subic Bay and up the Zambales coast. Approximate: a backdrop, not data. */
const LUZON_FINE = RINGS.LUZON.flatMap(([lon, lat]) => {
  if (lon === 120.5 && lat === 14.4) return [];
  if (lon === 119.95 && lat === 15.5) return [];
  if (lon === 120.95 && lat === 14.6)
    return [
      [120.9, 14.45], [120.97, 14.6], [120.85, 14.76], [120.65, 14.8], [120.55, 14.7], [120.6, 14.55], [120.5, 14.42],
      [120.38, 14.6], [120.27, 14.68], [120.22, 14.77], [120.3, 14.82], [120.2, 14.84], [120.08, 14.95], [120.06, 15.06],
      [119.96, 15.3], [119.93, 15.55],
    ];
  return [[lon, lat]];
});
export const MAP_RINGS = [LUZON_FINE, ...Object.entries(RINGS).filter(([k]) => k !== "LUZON").map(([, r]) => r)];

/** Yunya's track, JMA best track, 14 June 06Z to 15 June 18Z (1991). */
const YUNYA: [number, number][] = [[123.5, 14.4], [122.7, 14.7], [122.0, 15.0], [121.6, 15.2], [121.3, 15.4], [120.6, 16.2], [120.0, 17.0]];

export const BEATS: Beat[] = [
  { lines: ["slept"], shots: [{ id: "plume", kind: "still", media: "plume", move: { from: [0.45, 0.5, 1], to: [0.4, 0.34, 1.18] }, date: T.plumeDate.text, min: 3.5, cut: true }] },
  { lines: ["steam"], shots: [{ id: "before", kind: "still", media: "before", print: true, move: { from: [0.5, 0.5, 1], to: [0.5, 0.5, 1] }, date: T.aprilDate.text, min: 3 }] },
  { lines: ["watch"], shots: [{ id: "watched", kind: "still", media: "watched", print: true, move: { from: [0.5, 0.5, 1], to: [0.5, 0.5, 1] }, min: 3 }] },
  {
    lines: ["alert", "moved"],
    shots: [{
      id: "zones", kind: "map", view: { lon: 120.42, lat: 14.99, spanDeg: 1.45 }, min: 6,
      pins: [{ ...PINATUBO, label: T.pinatubo.text, tone: "red" }, { ...CLARK, label: T.clarkPin.text }, { ...SUBIC, label: T.subicPin.text }],
      circles: [
        { ...PINATUBO, km: 10, label: T.r10.text, at: 0.08 },
        { ...PINATUBO, km: 20, label: T.r20.text, at: 0.3 },
        { ...PINATUBO, km: 30, label: T.r30.text, at: 0.62 },
      ],
    }],
  },
  { lines: ["clark"], shots: [{ id: "evac", kind: "still", media: "evac", move: { from: [0.5, 0.2, 1], to: [0.5, 0.3, 1.12] }, date: T.evacDate.text, min: 3 }] },
  {
    lines: ["blast"],
    shots: [
      { id: "daybreak", kind: "still", media: "daybreak", move: { from: [0.55, 0.45, 1], to: [0.6, 0.42, 1.16] }, date: T.blastDate.text, min: 2.4 },
      { id: "height", kind: "height", topKm: 35, maxKm: 40, marks: [{ km: 10, label: T.strat.text }], columnLabel: T.col35.text, base: T.pinatubo.text, min: 3.8, cut: true },
    ],
  },
  {
    lines: ["typhoon"],
    shots: [{
      id: "storm", kind: "map", view: { lon: 121.0, lat: 15.35, spanDeg: 6.2 }, min: 6,
      pins: [{ ...PINATUBO, label: T.pinatubo.text, tone: "red" }], path: YUNYA, pathLabel: T.yunyaPin.text, storm: true,
      plume: { ...PINATUBO, km: 400, label: T.ashLabel.text, drift: [-0.35, -0.25] },
    }],
  },
  {
    lines: ["roofs"],
    shots: [
      { id: "subic", kind: "still", media: "subic", move: { from: [0.55, 0.5, 1.05], to: [0.6, 0.55, 1.25] }, date: T.subicDate.text, min: 2.6 },
      { id: "dc10", kind: "still", media: "dc10", move: { from: [0.45, 0.55, 1], to: [0.4, 0.55, 1.12] }, min: 2.6 },
    ],
  },
  {
    lines: ["planet"],
    shots: [
      { id: "satellite", kind: "still", media: "satellite", print: true, move: { from: [0.5, 0.5, 1], to: [0.5, 0.5, 1] }, min: 2.6 },
      { id: "sage", kind: "still", media: "sage", print: true, move: { from: [0.5, 0.5, 1], to: [0.5, 0.5, 1] }, min: 3.6 },
    ],
  },
  {
    lines: ["died", "saved"],
    shots: [
      { id: "sapang", kind: "still", media: "sapang", move: { from: [0.5, 0.5, 1], to: [0.5, 0.45, 1.14] }, min: 2.4 },
      { id: "home", kind: "still", media: "home", move: { from: [0.45, 0.6, 1.08], to: [0.5, 0.55, 1] }, min: 2.8 },
    ],
  },
  { lines: [], shots: [{ id: "title", kind: "title", text: T.title.text, sub: T.titleSub.text, note: "Sources in the description", min: 3.6, cut: true }] },
];
