# Ozone, 1996: progress

The working log for the Ozone Disco fire documentary. **Read this first when picking the film up in a new session**, then
`CLAUDE.md` (section "Ozone, 1996") for how the code works. Update it whenever a part changes state, a decision is made,
or a source is found. Newest entries at the top of each list.

## The film

- Long-form documentary (~25 min, 16:9), TrageDiaries-inspired: reconstructions plus the real record, told in chapters.
- English narration, Kokoro `bm_fable` for now (the user hasn't picked a voice; `bm_george` and `af_heart` were offered).
- Spine: "the door that opened inward". Thread: survivor Jhunie Mallari. Back half: the paper trail. Ends on the
  Crans-Montana bar fire (1 January 2026).
- Built **part by part, joined at the end** (the user's call, 2026-11-27).

## Look, sound, rules (agreed)

- Three kinds of picture: a white clay 3D reconstruction (grey figures, never faces; fire as light and smoke), the drawn
  plan with every door's swing in red, and the real record (2008 PD photo, OSM map, court quotes shown as quotations).
- Every drawn or rebuilt picture carries its mark ("Reconstruction", "Illustration"); the layout is labelled illustrative.
- Score: the club's own 90s house track (written in code) that dies with the power; cello and piano; silence at the door.
- No low-poly, no screams, no bodies, no recreated flames on people.
- Every narration line names its sources (`sources.ts`); digits in captions, words in the voice.

## Parts

| # | Part | Chapter | Status | Length |
|---|---|---|---|---|
| 0 | `00-open` | Cold open + title | rendered (2026-11-27) | 44 s |
| 1 | `01-birdland` | Birdland | v2 rendered with real photos (2026-11-28); awaiting review | 2:03 |
| 2 | `02-paper` | The Paper | rendered (2026-11-28); awaiting review | 1:45 |
| 3 | `03-graduation` | Graduation Night | rendered (2026-11-28); awaiting review | 1:04 |
| 4 | `04-fifteen` | Fifteen Seconds | written in full, re-voiced; render started 2026-11-28 (check it finished) | 2:14 |
| 5 | `05-morning` | Morning on Timog | not started | |
| 6 | `06-eighteen` | Eighteen Years | not started | |
| 7 | `07-empty` | The Empty Building | not started | |
| 8 | `08-same-room` | The Same Room | not started | |

Plan per chapter (from the pitch the user approved):

1. **Birdland**: the jazz club (1978), Birdland (1986), Westwood and the "lucky" name (1990), the refit (1991–92),
   the students, the scout memorial, room for 35.
2. **The Paper**: approved for 35; the blocked fire exit; the inward door "for good feng shui… bring the money in";
   the 1995 inspection certificate; everything that will kill them, set up before the night.
3. **Graduation Night**: Monday 18 March, the 50%-off graduation promo, packed by 8–9 pm; Jhunie with her cousin and
   friends; Sherilyn Bruan (18) at the semi-circular bar; the room as a map.
4. **Fifteen Seconds**: the spark, the smoke taken for an effect, the dead mic, the dark, the crush at the door, the
   guards, the backdraft, Jhunie pulls. Science: smoke layer, CO, cyanide.
5. **Morning on Timog**: two hours to put out; firefighters and gin; hospitals full (Bruan first treated at De los
   Santos); the mother who found only shoes; the door guard whose son died; Ramos orders inspections.
6. **Eighteen Years**: "we had a certificate"; 2001 four years; bankruptcy, P20,000 at most per family, P2,000 for an
   ear; 2007 acquittal; the 2014 verdict ("slapdash"); 2015 affirmed; "Walang nakulong".
7. **The Empty Building**: 19 years standing; memorial taken down; ghost-story TV; demolished a week before the 2015
   anniversary; a 25-hour eatery now; candles on the pavement.
8. **The Same Room**: what changed in law; Crans-Montana 2026; end on the door.

## How to continue

```
npx tsx apps/ozone/part.ts <id> layout --estimate   # before any voice, so the composition can load
npx tsx apps/ozone/part.ts <id> voice layout music render
npx tsx apps/ozone/join.ts                         # all parts in ORDER → out/ozone-16x9.mp4
```

A new part needs: `parts/<id>/script.ts`, `shots.tsx`, `music.ts` (copy the nearest part), an entry in `ORDER`
(`parts.ts`) and in `films.ts`. Check names with `npx tsx apps/ozone/say.ts "Name"`; write them as `[Name](/ipa/)`.
Review: render `ozone-boards` (one still per look) or tile frames from `out/parts/<id>.mp4`.

## Sources

Read (ids in `sources.ts`): AP 19 Mar 1996; Wikipedia; FlipScience 2021/2026; GMA (Jhunie Mallari) 2026; Urban Roamer
2014 and 2025; Philstar 2009, 2010, 2014; Inquirer 2014 (feng shui door, where's the money, what went before);
Esquire 2017 (Sherilyn Bruan); Court of Appeals, Chua v. Pua, 2005 (Internet Archive PDF); Commons 2008 photo; OSM;
scout memorial (Wikipedia, Inquirer).

Blocked or not found yet:
- The Sandiganbayan 2014 decision and any Supreme Court appeal (decides whether anyone served time).
- ABS-CBN "Last Look: Ozone Disco" (2015): the page is gone; the Internet Archive copy needs a fetch permission.
- Rappler knowledge base (redirect loop). NYT and LA Times 1996 (not tried in Chrome yet).
- Claude in Chrome works for sites that block automated fetches (Inquirer, Esquire): the user allowed it; close its
  tabs when done.

## Real images

The user wants more real images (2026-11-28). In `assets/` (credit on screen and in post notes):
- `ozone-2008.jpg`: the building, May 2008 (Anyo Niminus, public domain): the only free photo of the club itself.
- `scout-circle-2009.jpg`: the memorial roundabout from above (Richmond Chi, CC BY-SA 4.0).
- `scout-monument.jpg`: the monument, bronze scouts round its base (Anonymous742621, CC BY-SA 4.0).
- `scout-plaque-2016.jpg`: the dedication plaque, the 1963 crash line ringed (Judgefloro, public domain).

Found, not used yet (Commons, CC BY-SA 4.0 unless noted): `Timog Avenue, Q.C., Nov 2026.jpg` (night, portrait);
`Tomas Morato - 11th World Scout Jamboree Memorial Rotonda, Q.C., Oct 2026 (1–3)`; `Tomas Morato Avenue, Q.C.,
Oct 2026 (1)`; `Tomas Morato Avenue.jpg` (2015, CC BY-SA 3.0); 25 more Judgefloro photos of the memorial (public domain).
Commons geosearch within 250 m of the site finds nothing else. 1996 press photos and TV footage (AP, Inquirer, ABS-CBN,
GMA) are copyrighted. **The user approved fair use (2026-11-28, "yes")**: sparingly, short, muted, credited, each tied to
what the line says. Also in assets: `qc-hall-2021.jpg` (Quezon City Hall, patrickroque01, CC BY-SA 4.0, chapter 2).

Fair-use candidates found (not downloaded yet; downloading needs the user's OK per file):
- AP, March 1996, via BBC News 2014 (976 px): the gutted building from a rooftop (`_79144659_ap96032003023.jpg`);
  President Ramos at the scene (`_79144658_ap9603200933.jpg`); a candlelight vigil (`_79144657_ap9603260531.jpg`).
  For chapter 5.
- AFP, March 1996, via INQUIRER.net 2019 (660×506, `pop.inquirer.net/files/2019/03/Ozone-disco-660x506.jpg`):
  investigators at the club's doorway sorting what was left. For chapter 5 (the shoes).
- Philstar's "On this day" posts carry an AP interior photo but with title cards burned in: unusable as is.
- Rappler 2015: candles on the pavement, survivors (for chapter 7). News5/ABS-CBN/GMA video on YouTube (not used:
  downloading from YouTube is against its terms). Photo shots use
`Photo` (Boards.tsx): a slow move over the real picture, `box` to ring the evidence.

## Open questions

- Did anyone actually serve prison time? (Jhunie, 2026: "Walang nakulong".) Needs the court record.
- Start time: 11:35 (Wikipedia), 11:45 (FlipScience), "shortly after midnight" (AP), "about 11:30" (Urban Roamer).
- Death toll: 162 (trial court) vs 161 (Court of Appeals 2005) vs 160. The film says 162.
- Doors: two (FlipScience, Bruan) vs three (Jhunie Mallari, Nelson Tomenio). The plan draws two plus the reception desk.
- Birds opened 1978 (Philstar) or 1979 (Ocampo's testimony). Wikipedia names another owner of Birdland.
- Was Serafin Pua ever charged? The 2014 convictions name Ocampo and Ng; the acquitted include Alfredo Chua.
- 50 m² floor area (FlipScience) doesn't fit 390 people; not used.

## Next session: start here

1. Check the background render of all five parts and the join finished (`out/parts/*.mp4` dated 2026-11-28 after 06:30,
   `out/ozone-16x9.mp4` about 8:40). If not, run `part.ts <id> render` for each, then `join.ts`.
2. Tile frames of each part and look for: repeated shots, unreadable 3D, text over captions. Then show the user.
3. Then chapter 5 (Morning on Timog): the AP rooftop, Ramos and vigil photos and the AFP doorway are in `assets/`.

## Log

- 2026-11-28: The user: "review each chapter and apply improvements for people, its ok to show a picture of them …
  avoid repetitive scenes … it shows were lazy". Done across 00–04 (render running when the user paused):
  - Faces: Birdland's players as a portrait wall (Commons: Velasquez, Alcasid, Valenciano, Rivera, Padilla, Ritenour,
    Benoit, Lewis; Janno Gibbs has no free photo); Sherilyn Bruan (2015 'SCARvivors' portrait, fair use) in ch 3 and,
    cropped to her face with her words, in ch 4; Jhunie Mallari at the site (Rappler 2015) in ch 3 and in the GMA
    'i-Listen' interview (2026) in ch 4. No photo found of Pua, Ocampo, Ng or Chua. All in `assets/people/`.
  - **Jhunie Mallari is a man** (photos, "Kuya Jhunie"); the script had "she". Lines now name Jhunie, no pronouns.
  - Repeats removed: the street shot now only opens ch 0 (ch 2 ends on the traced front titled "Ozone"; ch 3 opens on a
    March 1996 calendar; ch 4's guards are a close shot of the shut doors, `R.shut`); the dance floor has four angles
    (ch 0 the white model, ch 1 from the mezzanine `R.mezz`, ch 3 from the DJ booth back to the door `R.reverse`, ch 4
    the original); the 35→390 count is only in ch 3 (ch 0 shows `Numbers`, 390 against 35); the plan's crowd-flow
    only in ch 0 (ch 4 has `DoorDiagram`); `R.arc` only in ch 0 (ch 2 has `R.door`, the inner door alone); ch 4 uses
    the section once (the gases are `GasCard`, the backdraft is `R.rush` down the corridor); news quotes are
    `NewsClip` (UPI, Inquirer), court quotes stay `QuoteBoard`, survivors speak beside their photo (`Portrait`);
    the materials shot is lit by the first fire (`R.materials`), cartons visible.
  - Chapter 4 finished: f1–f21 (2:14): the inward door ("even ten people pushing"), Jhunie pulls, the guards held the
    doors (some reports), the backdraft, Bruan's words, the crawl, Jhunie through three doors (46%), foam and egg
    cartons, CO and HCN (FlipScience), the corridor "piled waist-deep" over the AFP doorway photo. DJ not named
    (Marvin/Mervyn Reyes disagree).
- 2026-11-28: The user approved fair use for 1996 press images. Chapters 2 and 3 written, voiced, scored, rendered:
  02-paper (1:45: City Hall photo, the papers stamped as they're named, the plan's size, the exit built over and where
  it may have led, the doors in 3D, the waiter's words, the court's checklist, the 1995 certificate and the charge's
  words, the owner's certificate "claimed", every paper stamped); 03-graduation (1:04: the date on Timog, UPI's words
  on the 50% promotion, Bruan's walk in drawn on the plan with the track opening up as she passes the inner door, the
  floor, Jhunie's knot of friends with seventeen dimming, the count from 35 to 390). New boards: `PaperStack`,
  `Checklist`, `PlanStudy`; `QuoteBoard` takes a `kicker`; the plan's title block moved to the top right (off the
  captions) and the fire exit's label is now "to the building next door" (sources differ on kitchen vs restroom).
  **Chapter 4 must change:** f7 introduces Jhunie again ("had just finished high school… cousin… friends"); chapter 3
  now does that.
  Research (2014–15 verdict, GMA/SunStar/Philstar/UPI/AP): seven QC engineering officials + Ocampo and Ng convicted of
  graft 20 Nov 2014, 6–10 years, affirmed April 2015; Macapugay acquitted 2007 of reckless imprudence (a different case);
  DJ Marvin Reyes (AP); Ramos called it a "terrible tragedy" and ordered inspections; Erlinda Mandap found only her
  daughter's shoes (AP). Still unknown: whether anyone served time.
- 2026-11-28: v2 joined: the film so far is 3:36, −14.3 LUFS, peak −1.3. The user: "chapter 1 needs further improvement as well. we can start with 2 and 3 after". Self-review found
  a date list over 36 s of one static drawing. v2: new opening line b0 over the real 2008 photo ("Shuttered… with no
  name on it", which sets up the chapter's theme of names); the elevation is now traced from the photo, its lines drawn
  over it before the photo fades (`NamesBoard` photo/draw); Birdland's lit sign with the performers going up on it and a
  150 turned-away counter, its bulbs dying circuit by circuit on "the jazz stopped" with clicks and a mains hum that
  cuts (`MarqueeBoard`, `marquee.ts` shared by picture and sound); Westwood as a board table from above, a chair per name,
  Chua's chair empty and red, Pua off the table at the end of a dashed line (`BoardTable`, replaces `CompanyBoard`).
  Then the user: "i think we need more real images". The memorial line is now real photos (the roundabout from above,
  the bronze scouts, the plaque with its 1963 line ringed) before the lit map. See "Real images".
- 2026-11-28: 01-birdland rendered (1:55) and joined: the film so far is 3:28 (00 + 01 + 04 opening), −14.3 LUFS.
  Polish waiting for the next render of 01: the court reference on the company board moved off the captions.
- 2026-11-28: Claude in Chrome connected: read the Inquirer and Esquire pieces. Court of Appeals 2005 decision found
  (ownership, the "good luck" name). Chapter 1 scripted around it. Reception desk added to the plan. PROGRESS.md started.
- 2026-11-27: Mock (look, voice, score) approved for fixes; fixed figures, street shot, last shot, sourced layout, name
  pronunciation (`[Name](/ipa/)` in the voice step). Restructured into parts; 00-open and 04-fifteen rendered and
  joined (1:33, −14.5 LUFS).
- 2026-11-27: Research, three story angles; the user chose long-form, TrageDiaries-inspired, all angles as chapters.
