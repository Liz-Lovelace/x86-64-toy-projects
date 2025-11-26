#!/bin/bash
set -euo pipefail

# Run ./tmp/main, capture raw PCM, and encode to MP3
./tmp/main | ffmpeg -f s16le -ar 44100 -ac 1 -i - track.mp3

