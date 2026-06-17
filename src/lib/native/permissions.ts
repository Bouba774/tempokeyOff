/**
 * Native Android permission helper for TempoKey.
 *
 * On the web (and on iOS/desktop) all calls resolve to `"granted"` — the
 * browser-side flow already uses `<input type="file" webkitdirectory>` /
 * Storage Access Framework, which doesn't require runtime permissions.
 *
 * On Android (via Capacitor), this wraps the custom `TempoKeyPermissions`
 * plugin defined in android-resources/native/TempoKeyPermissions.java.
 */

export type PermissionState = "granted" | "denied" | "prompt" | "unavailable";

interface NativePermissionsPlugin {
  checkAudio(): Promise<{ audio: PermissionState; sdk?: number }>;
  requestAudio(): Promise<{ audio: PermissionState }>;
}

async function getPlugin(): Promise<NativePermissionsPlugin | null> {
  if (typeof window === "undefined") return null;
  try {
    const cap = await import("@capacitor/core").catch(() => null);
    if (!cap?.Capacitor?.isNativePlatform?.()) return null;
    if (cap.Capacitor.getPlatform?.() !== "android") return null;
    const plugin = (cap.registerPlugin as <T>(name: string) => T)<NativePermissionsPlugin>(
      "TempoKeyPermissions",
    );
    return plugin ?? null;
  } catch {
    return null;
  }
}

export async function isAndroidNative(): Promise<boolean> {
  return (await getPlugin()) !== null;
}

export async function checkAudioPermission(): Promise<PermissionState> {
  const plugin = await getPlugin();
  if (!plugin) return "granted";
  try {
    const { audio } = await plugin.checkAudio();
    return audio;
  } catch {
    return "unavailable";
  }
}

export async function requestAudioPermission(): Promise<PermissionState> {
  const plugin = await getPlugin();
  if (!plugin) return "granted";
  try {
    const { audio } = await plugin.requestAudio();
    return audio;
  } catch {
    return "unavailable";
  }
}

/**
 * Convenience flow used by import buttons: returns true if the caller can
 * proceed with the file picker. Pure permission check — the explanation
 * modal is rendered by the caller before this is invoked.
 */
export async function ensureAudioAccess(): Promise<{
  ok: boolean;
  state: PermissionState;
}> {
  const current = await checkAudioPermission();
  if (current === "granted") return { ok: true, state: "granted" };
  const next = await requestAudioPermission();
  return { ok: next === "granted", state: next };
}
