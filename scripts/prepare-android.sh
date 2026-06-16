#!/usr/bin/env bash
# Prepares the Android Capacitor project from the current web build.
# Designed to run both locally (developer machine with Android SDK) and inside
# the GitHub Actions runner. It does NOT modify the existing TanStack Start
# pipeline; it only stages the client output for Capacitor and runs `cap sync`.
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

echo "▶ Building web bundle…"
npm run build

echo "▶ Staging static client into ${WEB_DIR}…"
rm -rf "$WEB_DIR"
mkdir -p "$WEB_DIR"

# TanStack Start (nitro) emits the client bundle under one of these paths
# depending on version. Pick whichever exists.
CANDIDATES=(
  ".output/public"
  ".vinxi/build/client"
  "dist/client"
  ".nitro/output/public"
)
SRC=""
for c in "${CANDIDATES[@]}"; do
  if [ -d "$c" ]; then SRC="$c"; break; fi
done

if [ -z "$SRC" ]; then
  echo "❌ Could not locate the built client assets." >&2
  echo "   Expected one of: ${CANDIDATES[*]}" >&2
  exit 1
fi
echo "  using $SRC"
cp -R "$SRC"/. "$WEB_DIR"/

# Ensure an index.html exists at the root for Capacitor's WebView entry.
if [ ! -f "$WEB_DIR/index.html" ]; then
  echo "⚠ No index.html in client output — Capacitor needs one. Creating a"
  echo "   minimal shim that boots the TanStack client entry."
  cat > "$WEB_DIR/index.html" <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>TempoKey</title>
    <link rel="manifest" href="/manifest.webmanifest" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/_build/entry-client.js"></script>
  </body>
</html>
HTML
fi

echo "▶ Preparing icon & splash sources…"
mkdir -p "$RES_DIR"
if [ ! -f "$RES_DIR/icon.png" ]; then
  curl -L --silent --fail "$LOGO_URL" -o "$RES_DIR/icon.png"
fi
cp -f "$RES_DIR/icon.png" "$RES_DIR/splash.png"
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
