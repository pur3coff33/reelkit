#!/bin/bash
# Renders porchlight in 24 pieces of 150 frames (skipping finished ones), joins them, adds the music and exports.
#   bash apps/porchlight/render.sh              uses the graphics card (GL=angle)
#   GL=swangle bash apps/porchlight/render.sh   software, on the CPU: ~14 s a frame on a Ryzen 5 3500X, ~14 h in all
# Needs apps/porchlight/out/music.wav first: npm run music -- porchlight
# Pieces land in .state/porchlight/parts/; delete that folder (and .state/porchlight/bundle) after changing the film.
cd "$(dirname "$0")/../.." || exit 1
GL=${GL:-angle}; CONC=${CONC:-2}
S=.state/porchlight; FF=$(node -e "console.log(require('ffmpeg-static'))")
mkdir -p $S/parts
[ -f apps/porchlight/out/music.wav ] || { echo "no music.wav: run npm run music -- porchlight"; exit 5; }
[ -f $S/bundle/index.html ] || npx remotion bundle src/index.ts --out-dir $S/bundle --public-dir apps/porchlight > $S/bundle.log 2>&1 || exit 2
for i in $(seq 0 23); do
  n=$(printf %02d $i); out=$S/parts/$n.mp4
  [ -f $out ] && continue
  for try in 1 2 3; do
    npx remotion render $S/bundle porchlight $S/parts/$n.part.mp4 --gl=$GL --concurrency=$CONC --timeout=240000 --codec h264 --crf 16 --muted --frames=$((i*150))-$((i*150+149)) > $S/parts/$n.log 2>&1 && mv $S/parts/$n.part.mp4 $out && break
    echo "piece $n failed, try $try (see $S/parts/$n.log)"
  done
  [ -f $out ] || { echo "piece $n gave up"; exit 3; }
  echo "$(date +%H:%M) piece $((i+1))/24 done"
done
for i in $(seq 0 23); do echo "file 'parts/$(printf %02d $i).mp4'"; done > $S/list.txt
"$FF" -y -loglevel error -f concat -safe 0 -i $S/list.txt -i apps/porchlight/out/music.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k apps/porchlight/out/porchlight-9x16-raw.mp4 || exit 4
"$FF" -hide_banner -i apps/porchlight/out/porchlight-9x16-raw.mp4 -map 0:v -c copy -f null - 2>&1 | tr '\r' '\n' | grep frame= | tail -1
npm run export -- porchlight 2>&1 | tail -15
