import { Capacitor, registerPlugin } from "@capacitor/core";

export interface SafFileMeta {
  uri: string;
  name: string;
  relativePath: string;
  size: number;
  mime: string;
}

export interface FolderPickerPlugin {
  pickFolder(): Promise<{ treeUri: string; name: string }>;
  listAudioFiles(opts: { treeUri: string }): Promise<{
    rootName: string;
    files: SafFileMeta[];
  }>;
  readFile(opts: { uri: string; offset?: number; length?: number }): Promise<{
    data: string;
  }>;
  hasPersistedAccess(opts: { treeUri: string }): Promise<{ granted: boolean }>;
}

export const FolderPicker = registerPlugin<FolderPickerPlugin>("FolderPicker");

export function isCapacitorAndroid(): boolean {
  try {
    return Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

const ACTIVE_TREE_KEY = "tempokey.activeTreeUri";
const ACTIVE_TREE_NAME_KEY = "tempokey.activeTreeName";

export function getActiveTreeUri(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_TREE_KEY);
}

export function setActiveTreeUri(uri: string, name?: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_TREE_KEY, uri);
  if (name) window.localStorage.setItem(ACTIVE_TREE_NAME_KEY, name);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Wrap a SAF document descriptor as a `File` that lazily reads its bytes
 * through the native plugin only when the analyzer actually needs them.
 * `arrayBuffer()` and `slice(start, end).arrayBuffer()` are both supported
 * so the existing audio pipeline keeps working unchanged.
 */
export function safFileFromMeta(meta: SafFileMeta): File {
  const file = new File([new Uint8Array(0)], meta.name, {
    type: meta.mime || "",
    lastModified: Date.now(),
  });
  try {
    Object.defineProperty(file, "size", {
      value: meta.size,
      configurable: true,
    });
  } catch {
    /* ignore */
  }
  try {
    Object.defineProperty(file, "webkitRelativePath", {
      value: meta.relativePath,
      configurable: true,
    });
  } catch {
    /* ignore */
  }

  let cached: ArrayBuffer | null = null;

  const fullArrayBuffer = async (): Promise<ArrayBuffer> => {
    if (cached) return cached;
    const { data } = await FolderPicker.readFile({ uri: meta.uri });
    cached = base64ToArrayBuffer(data);
    return cached;
  };

  const sliceArrayBuffer = async (
    start: number,
    end: number,
  ): Promise<ArrayBuffer> => {
    const length = Math.max(0, end - start);
    if (length === 0) return new ArrayBuffer(0);
    const { data } = await FolderPicker.readFile({
      uri: meta.uri,
      offset: start,
      length,
    });
    return base64ToArrayBuffer(data);
  };

  (file as unknown as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer =
    fullArrayBuffer;

  (file as unknown as { slice: (s?: number, e?: number) => Blob }).slice = (
    start = 0,
    end = meta.size,
  ) => {
    const s = Math.max(0, Math.min(start, meta.size));
    const e = Math.max(s, Math.min(end, meta.size));
    const blob = new Blob([]) as Blob & {
      arrayBuffer: () => Promise<ArrayBuffer>;
      size: number;
    };
    try {
      Object.defineProperty(blob, "size", { value: e - s, configurable: true });
    } catch {
      /* ignore */
    }
    blob.arrayBuffer = () => sliceArrayBuffer(s, e);
    return blob;
  };

  return file;
}

export async function pickAndroidFolder(): Promise<{
  rootName: string;
  treeUri: string;
  files: File[];
} | null> {
  // eslint-disable-next-line no-console
  console.log("ANDROID_PICKER_START");
  try {
    const { treeUri, name } = await FolderPicker.pickFolder();
    if (!treeUri) {
      console.warn("ANDROID_PICKER_FAIL no treeUri");
      return null;
    }
    setActiveTreeUri(treeUri, name);
    const { rootName, files: metas } = await FolderPicker.listAudioFiles({
      treeUri,
    });
    // eslint-disable-next-line no-console
    console.log("ANDROID_PICKER_SUCCESS", { treeUri, count: metas.length });
    return {
      rootName: rootName || name || "Bibliothèque",
      treeUri,
      files: metas.map(safFileFromMeta),
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("ANDROID_PICKER_FAIL", err);
    return null;
  }
}