import { create } from "zustand";
import { analyzeFile, formatDuration } from "./audio/analyzer";
import { useLibraryStore } from "./library-store";

const CONCURRENCY = 2;
const MAX_LOG = 200;

export interface AnalysisLogEntry {
  id: string;
  title: string;
  ok: boolean;
  bpm: number | null;
  camelot: string | null;
  message?: string;
  at: number;
}

interface AnalysisState {
  running: boolean;
  total: number;
  done: number;
  errors: number;
  startedAt: number | null;
  currentIds: Set<string>;
  log: AnalysisLogEntry[];
  abort: boolean;

  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  running: false,
  total: 0,
  done: 0,
  errors: 0,
  startedAt: null,
  currentIds: new Set(),
  log: [],
  abort: false,

  start: async () => {
    if (get().running) return;
    const lib = useLibraryStore.getState().library;
    if (!lib) return;

    const queue = lib.tracks.filter(
      (t) => t.status === "pending" && !!useLibraryStore.getState().getFile(t.id),
    );
    if (queue.length === 0) return;

    set({
      running: true,
      total: queue.length,
      done: 0,
      errors: 0,
      startedAt: Date.now(),
      currentIds: new Set(),
      abort: false,
    });

    let cursor = 0;
    const next = (): (typeof queue)[number] | null => {
      if (get().abort) return null;
      if (cursor >= queue.length) return null;
      return queue[cursor++];
    };

    const worker = async () => {
      for (;;) {
        const track = next();
        if (!track) return;
        const file = useLibraryStore.getState().getFile(track.id);
        if (!file) continue;

        useLibraryStore.getState().updateTrack(track.id, { status: "analyzing" });
        set({ currentIds: new Set([...get().currentIds, track.id]) });

        try {
          const res = await analyzeFile(file);
          useLibraryStore.getState().updateTrack(track.id, {
            fileHash: res.fileHash,
            bpm: res.bpm,
            key: res.key,
            camelot: res.camelot,
            durationSec: res.durationSec,
            duration: formatDuration(res.durationSec),
            analyzed: true,
            status: "done",
            error: null,
          });
          pushLog({
            id: track.id,
            title: track.title,
            ok: true,
            bpm: res.bpm,
            camelot: res.camelot,
            at: Date.now(),
          });
          set({ done: get().done + 1 });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Erreur d'analyse";
          useLibraryStore.getState().updateTrack(track.id, {
            status: "error",
            error: message,
            analyzed: false,
          });
          pushLog({
            id: track.id,
            title: track.title,
            ok: false,
            bpm: null,
            camelot: null,
            message,
            at: Date.now(),
          });
          set({ done: get().done + 1, errors: get().errors + 1 });
        } finally {
          const cur = new Set(get().currentIds);
          cur.delete(track.id);
          set({ currentIds: cur });
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker());
    await Promise.all(workers);
    await useLibraryStore.getState().flush();
    set({ running: false, currentIds: new Set() });
  },

  stop: () => {
    set({ abort: true });
  },

  reset: () => {
    set({
      running: false,
      total: 0,
      done: 0,
      errors: 0,
      startedAt: null,
      currentIds: new Set(),
      log: [],
      abort: false,
    });
  },
}));

function pushLog(entry: AnalysisLogEntry) {
  const log = [entry, ...useAnalysisStore.getState().log];
  if (log.length > MAX_LOG) log.length = MAX_LOG;
  useAnalysisStore.setState({ log });
}

export function formatETA(state: AnalysisState): string {
  if (!state.running || state.done === 0 || !state.startedAt) return "—";
  const elapsed = (Date.now() - state.startedAt) / 1000;
  const perTrack = elapsed / state.done;
  const remaining = Math.max(0, state.total - state.done) * perTrack;
  if (!isFinite(remaining)) return "—";
  if (remaining < 60) return `${Math.ceil(remaining)} s`;
  const m = Math.floor(remaining / 60);
  const s = Math.ceil(remaining % 60);
  return `${m} min ${s.toString().padStart(2, "0")} s`;
}