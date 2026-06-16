#!/usr/bin/env bash
# Prepares the Android Capacitor project.
#
# Pipeline:
#   1. Install Capacitor toolchain (idempotent)
#   2. Build a dedicated SPA bundle into dist/android/ via vite.android.config.mjs
#      (this is what fixes the previous "splash then black screen" bug — the old
#       pipeline staged TanStack Start's SSR output, which can't run in a WebView).
#   3. Fetch logo + generate Android icons / splash via @capacitor/assets
#   4. Add Android platform (if missing) + cap sync
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

LOGO_URL="${TEMPOKEY_LOGO_URL:-https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/11ea2fe2-f750-4207-924d-713a57d9fe69}"
WEB_DIR="dist/android"
RES_DIR="resources"

echo "▶ Installing Capacitor toolchain (idempotent)…"
npm install --no-audit --no-fund --save-dev \
  @capacitor/cli@^6 \
  @capacitor/assets@^3 >/dev/null
npm install --no-audit --no-fund --save \
  @capacitor/core@^6 \
  @capacitor/android@^6 \
  @capacitor/splash-screen@^6 \
  @capacitor/status-bar@^6 \
  @capacitor/filesystem@^6 >/dev/null

echo "▶ Building dedicated Android SPA bundle → ${WEB_DIR}…"
rm -rf "$WEB_DIR"
npm run build:android

if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "❌ Android SPA build did not produce ${WEB_DIR}/index.html" >&2
  ls -la "$WEB_DIR" || true
  exit 1
fi
echo "  ✓ index.html present"
echo "  ✓ asset count: $(find "$WEB_DIR" -type f | wc -l)"

echo "▶ Preparing icon & splash sources…"
mkdir -p "$RES_DIR"
if [ ! -f "$RES_DIR/icon.png" ]; then
  curl -L --silent --fail "$LOGO_URL" -o "$RES_DIR/icon.png"
fi
cp -f "$RES_DIR/icon.png" "$RES_DIR/splash.png"
mkdir -p android-resources
cp -f "$RES_DIR/icon.png" "android-resources/logo.png" || true

echo "▶ Adding Android platform (if missing)…"
if [ ! -d "android" ]; then
  npx cap add android
fi

echo "▶ Generating launcher icons, adaptive icon & splash…"
npx @capacitor/assets generate --android \
  --iconBackgroundColor "#0A0D14" \
  --iconBackgroundColorDark "#0A0D14" \
  --splashBackgroundColor "#0A0D14" \
  --splashBackgroundColorDark "#0A0D14" || {
    echo "⚠ @capacitor/assets failed; continuing with platform defaults." >&2
  }

echo "▶ Syncing Capacitor…"
npx cap sync android

echo "✅ Android project prepared at ./android"
