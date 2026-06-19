#!/usr/bin/env bash
# Prepares the Android Capacitor project from a dedicated SPA build.
#
# The web app uses TanStack Start (SSR). A WebView cannot run SSR, so we
# produce a parallel, static SPA build via vite.config.capacitor.ts and
# package THAT into Android. The main web pipeline is untouched.
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

echo "▶ Building static SPA for WebView (vite.config.capacitor.ts)…"
rm -rf "$WEB_DIR"
npx vite build --config vite.config.capacitor.ts

# vite emits capacitor/index.html into a nested folder by default.
# Promote it to the WebView root so Capacitor can serve it as `/index.html`.
if [ -f "$WEB_DIR/capacitor/index.html" ]; then
  echo "▶ Hoisting index.html to WebView root…"
  mv "$WEB_DIR/capacitor/index.html" "$WEB_DIR/index.html"
  rmdir "$WEB_DIR/capacitor" 2>/dev/null || true
fi

if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "❌ Build did not produce $WEB_DIR/index.html" >&2
  ls -R "$WEB_DIR" || true
  exit 1
fi

# Sanity check: the built index.html must reference a real JS asset.
echo "▶ Verifying built assets…"
grep -q 'src="\./assets/' "$WEB_DIR/index.html" || {
  echo "❌ index.html does not reference any bundled asset — black screen guaranteed." >&2
  cat "$WEB_DIR/index.html" >&2
  exit 1
}
echo "  ✓ index.html links bundled assets"

echo "▶ Preparing icon & splash sources…"
mkdir -p "$RES_DIR"
if [ ! -f "$RES_DIR/icon.png" ]; then
  curl -L --silent --fail "$LOGO_URL" -o "$RES_DIR/icon.png"
fi
cp -f "$RES_DIR/icon.png" "$RES_DIR/splash.png"
cp -f "$RES_DIR/icon.png" "android-resources/logo.png" 2>/dev/null || true

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

echo "✅ Android project prepared at ./android (webDir=$WEB_DIR)"
