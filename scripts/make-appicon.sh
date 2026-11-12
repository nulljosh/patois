#!/bin/sh
# Regenerate all Patois app icon PNGs from assets/icon.svg. ALWAYS use this — never hand-export.
# Renders at 1024 full-bleed, flattens onto the icon's own bg (no alpha, App Store rejects
# alpha in app icons), then scales down for the macOS set. Mirrors sparkjar/scripts/make-appicon.sh.
set -e
cd "$(dirname "$0")/.."
BG="#2e86de"
MASTER="/tmp/patois-icon-1024.png"
rsvg-convert -w 1024 -h 1024 assets/icon.svg | magick - -background "$BG" -alpha remove -alpha off "$MASTER"
sips -g pixelWidth -g pixelHeight -g hasAlpha "$MASTER" | grep -q 'hasAlpha: no'
sips -g pixelWidth "$MASTER" | grep -q 'pixelWidth: 1024'

# iOS: single-size asset
cp "$MASTER" ios/Sources/iOS/Assets.xcassets/AppIcon.appiconset/icon-1024.png

# macOS: scaled set
MAC=ios/Sources/macOS/Assets.xcassets/AppIcon.appiconset
for sz in 16 32 64 128 256 512 1024; do
  sips -z "$sz" "$sz" "$MASTER" --out "$MAC/icon-$sz.png" >/dev/null
done

echo "OK: regenerated iOS/macOS icons from assets/icon.svg"
