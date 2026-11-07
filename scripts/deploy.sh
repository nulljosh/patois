#!/usr/bin/env bash
# Publish Patois to Cloudflare Pages (project `lexly-heyitsmejosh`).
#
# The Pages project is NOT git-connected, so `git push` deploys nothing —
# the site silently went 2 weeks stale that way. Run this instead.
#
# We stage into a temp dir rather than deploying the repo root because
# `ios/build*` blows past the Pages file-count limit.
set -euo pipefail
# Regenerate the Fieldbook course when the sibling repo is present (skipped in CI).
[ -f "$(dirname "$0")/../../fieldbook/fields.json" ] && python3 "$(dirname "$0")/fieldbook-course.py"

cd "$(dirname "$0")/.."

PUBLISH=(app css js content assets school functions
         index.html privacy.html support.html manifest.json onboarding.js _headers robots.txt sitemap.xml)

STAGE="$(mktemp -d)"
VERIFY_TMP="$(mktemp)"
trap 'rm -rf "$STAGE" "$VERIFY_TMP"' EXIT

# macOS ships BSD `md5 -q`; Linux (and the GitHub Actions runner) ships `md5sum`.
# Same digest either way — this only exists so CI can run this exact script.
md5file() {
  if command -v md5 >/dev/null 2>&1; then md5 -q "$1"; else md5sum "$1" | cut -d" " -f1; fi
}

for path in "${PUBLISH[@]}"; do
  rsync -aL --exclude '.DS_Store' "$path" "$STAGE/"
done

npx wrangler pages deploy "$STAGE" --project-name lexly-heyitsmejosh --branch main

# Confirm the deploy actually landed. A silent no-op here is how the site went
# 2 weeks stale, which made three already-fixed bugs look unfixed for weeks.
# Check one file per asset class — a content-only canary would pass while a
# CSS or JS change sat stale, which is the same failure wearing a new hat.
# Edge propagation lags a few seconds, so retry rather than failing instantly.
# Images are their own asset class: the marketing screenshots went stale on
# 2026-08-19 and passed verify because only json/css/js were checked.
for asset in content/catalog.json css/lingo.css js/lingo-app.js assets/marketing/catalog.png assets/marketing/course.png assets/og-image.jpg; do
  LOCAL="$(md5file "$asset")"
  for attempt in 1 2 3 4 5 6; do
    # Cache-bust: /assets/* carries a 300s edge TTL (see _headers), far longer
    # than this retry window, so an uncached URL would compare against the edge's
    # stale copy — a false failure now, and a false pass before images were checked.
    if curl -fsS "https://patois.jaybulb.com/$asset?deployverify=$$-$attempt" -o "$VERIFY_TMP"; then
      LIVE="$(md5file "$VERIFY_TMP")"
    else
      LIVE=""
    fi
    [ "$LIVE" = "$LOCAL" ] && break
    sleep 5
  done
  if [ "$LIVE" != "$LOCAL" ]; then
    echo "DEPLOY VERIFY FAILED: live $asset ($LIVE) != local ($LOCAL)" >&2
    exit 1
  fi
done
echo "deploy verified: live catalog.json, lingo.css, lingo-app.js, marketing screenshots all match local"
