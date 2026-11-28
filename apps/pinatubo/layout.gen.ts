// Written by layout.ts from out/voice.json: don't edit.
import type { Placed } from "../../src/kit/doc/film";
export const LAYOUT: { shots: Placed[]; lines: Record<string, number>; spoken: Record<string, number>; lead: Record<string, number>; seconds: number } = {
 "shots": [
  {
   "id": "plume",
   "kind": "still",
   "media": "plume",
   "move": {
    "from": [
     0.45,
     0.5,
     1
    ],
    "to": [
     0.4,
     0.34,
     1.18
    ]
   },
   "date": "Clark Air Base · 12 June 1991",
   "cut": true,
   "from": 0,
   "to": 4.588
  },
  {
   "id": "before",
   "kind": "still",
   "media": "before",
   "print": true,
   "move": {
    "from": [
     0.5,
     0.5,
     1
    ],
    "to": [
     0.5,
     0.5,
     1
    ]
   },
   "date": "Mount Pinatubo · April 1991",
   "from": 4.588,
   "to": 9.992
  },
  {
   "id": "watched",
   "kind": "still",
   "media": "watched",
   "print": true,
   "move": {
    "from": [
     0.5,
     0.5,
     1
    ],
    "to": [
     0.5,
     0.5,
     1
    ]
   },
   "from": 9.992,
   "to": 16.785
  },
  {
   "id": "zones",
   "kind": "map",
   "view": {
    "lon": 120.42,
    "lat": 14.99,
    "spanDeg": 1.45
   },
   "pins": [
    {
     "lon": 120.35,
     "lat": 15.13,
     "label": "Mount Pinatubo",
     "tone": "red"
    },
    {
     "lon": 120.56,
     "lat": 15.18,
     "label": "Clark Air Base"
    },
    {
     "lon": 120.28,
     "lat": 14.8,
     "label": "Subic Bay"
    }
   ],
   "circles": [
    {
     "lon": 120.35,
     "lat": 15.13,
     "km": 10,
     "label": "10 km",
     "at": 0.08
    },
    {
     "lon": 120.35,
     "lat": 15.13,
     "km": 20,
     "label": "20 km · 9 June",
     "at": 0.3
    },
    {
     "lon": 120.35,
     "lat": 15.13,
     "km": 30,
     "label": "30 km · 12 June",
     "at": 0.62
    }
   ],
   "from": 16.785,
   "to": 26.366
  },
  {
   "id": "evac",
   "kind": "still",
   "media": "evac",
   "move": {
    "from": [
     0.5,
     0.2,
     1
    ],
    "to": [
     0.5,
     0.3,
     1.12
    ]
   },
   "date": "Clark Air Base · June 1991",
   "from": 26.366,
   "to": 31.38
  },
  {
   "id": "daybreak",
   "kind": "still",
   "media": "daybreak",
   "move": {
    "from": [
     0.55,
     0.45,
     1
    ],
    "to": [
     0.6,
     0.42,
     1.16
    ]
   },
   "date": "15 June 1991",
   "from": 31.38,
   "to": 33.78
  },
  {
   "id": "height",
   "kind": "height",
   "topKm": 35,
   "maxKm": 40,
   "marks": [
    {
     "km": 10,
     "label": "Stratosphere · 10 km"
    }
   ],
   "columnLabel": "Ash column",
   "base": "Mount Pinatubo",
   "cut": true,
   "from": 33.78,
   "to": 37.58
  },
  {
   "id": "storm",
   "kind": "map",
   "view": {
    "lon": 121,
    "lat": 15.35,
    "spanDeg": 6.2
   },
   "pins": [
    {
     "lon": 120.35,
     "lat": 15.13,
     "label": "Mount Pinatubo",
     "tone": "red"
    }
   ],
   "path": [
    [
     123.5,
     14.4
    ],
    [
     122.7,
     14.7
    ],
    [
     122,
     15
    ],
    [
     121.6,
     15.2
    ],
    [
     121.3,
     15.4
    ],
    [
     120.6,
     16.2
    ],
    [
     120,
     17
    ]
   ],
   "pathLabel": "Typhoon Yunya",
   "storm": true,
   "plume": {
    "lon": 120.35,
    "lat": 15.13,
    "km": 400,
    "label": "Ash cloud · 400 km across",
    "drift": [
     -0.35,
     -0.25
    ]
   },
   "from": 37.58,
   "to": 43.58
  },
  {
   "id": "subic",
   "kind": "still",
   "media": "subic",
   "move": {
    "from": [
     0.55,
     0.5,
     1.05
    ],
    "to": [
     0.6,
     0.55,
     1.25
    ]
   },
   "date": "Subic Bay Naval Station",
   "from": 43.58,
   "to": 46.275
  },
  {
   "id": "dc10",
   "kind": "still",
   "media": "dc10",
   "move": {
    "from": [
     0.45,
     0.55,
     1
    ],
    "to": [
     0.4,
     0.55,
     1.12
    ]
   },
   "from": 46.275,
   "to": 48.97
  },
  {
   "id": "satellite",
   "kind": "still",
   "media": "satellite",
   "print": true,
   "move": {
    "from": [
     0.5,
     0.5,
     1
    ],
    "to": [
     0.5,
     0.5,
     1
    ]
   },
   "from": 48.97,
   "to": 51.899
  },
  {
   "id": "sage",
   "kind": "still",
   "media": "sage",
   "print": true,
   "move": {
    "from": [
     0.5,
     0.5,
     1
    ],
    "to": [
     0.5,
     0.5,
     1
    ]
   },
   "from": 51.899,
   "to": 55.955
  },
  {
   "id": "sapang",
   "kind": "still",
   "media": "sapang",
   "move": {
    "from": [
     0.5,
     0.5,
     1
    ],
    "to": [
     0.5,
     0.45,
     1.14
    ]
   },
   "from": 55.955,
   "to": 58.984
  },
  {
   "id": "home",
   "kind": "still",
   "media": "home",
   "move": {
    "from": [
     0.45,
     0.6,
     1.08
    ],
    "to": [
     0.5,
     0.55,
     1
    ]
   },
   "from": 58.984,
   "to": 62.517
  },
  {
   "id": "title",
   "kind": "title",
   "text": "Pinatubo",
   "sub": "15 June 1991",
   "note": "Sources in the description",
   "cut": true,
   "from": 62.517,
   "to": 66.117
  }
 ],
 "lines": {
  "slept": 0.1,
  "steam": 4.688,
  "watch": 10.092,
  "alert": 16.885,
  "moved": 21.448,
  "clark": 26.466,
  "blast": 31.48,
  "typhoon": 37.68,
  "roofs": 43.68,
  "planet": 49.07,
  "died": 56.055,
  "saved": 58.446
 },
 "spoken": {
  "slept": 4.038,
  "steam": 4.854,
  "watch": 6.243,
  "alert": 4.063,
  "moved": 4.468,
  "clark": 4.464,
  "blast": 5.619,
  "typhoon": 5.245,
  "roofs": 4.84,
  "planet": 6.435,
  "died": 1.891,
  "saved": 3.621
 },
 "lead": {
  "slept": 0.277,
  "steam": 0.339,
  "watch": 0.283,
  "alert": 0.307,
  "moved": 0.291,
  "clark": 0.234,
  "blast": 0.316,
  "typhoon": 0.306,
  "roofs": 0.282,
  "planet": 0.328,
  "died": 0.236,
  "saved": 0.256
 },
 "seconds": 66.117
};
