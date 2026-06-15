import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  useLibraryStore,
  buildLibraryFromFiles,
  type ImportProgress,
} from "@/lib/library-store";
import { useAnalysisStore } from "@/lib/analysis-store";
import { ImportProgressModal } from "@/components/ImportProgressModal";
import { FolderPlus, Clock } from "lucide-react";
import logoAsset from "@/assets/tempokey-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TempoKey — Analysez et organisez vos bibliothèques audio" },
      { name: "description", content: "Outil professionnel pour DJs et producteurs : importez un dossier audio, analysez BPM et tonalité." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const setLibrary = useLibraryStore((s) => s.setLibrary);
  const setFiles = useLibraryStore((s) => s.setFiles);
  const lastMeta = useLibraryStore((s) => s.lastLibraryMeta);
  const hydrated = useLibraryStore((s) => s.hydrated);
  const hydrate = useLibraryStore((s) => s.hydrate);
  const restoreLast = useLibraryStore((s) => s.restoreLast);
  const resetAnalysis = useAnalysisStore((s) => s.reset);
  const startAnalysis = useAnalysisStore((s) => s.start);
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  function pickFolder() {
    inputRef.current?.click();
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (files.length === 0) return;
    setProgress({ phase: "scan", scanned: 0, total: files.length });
    try {
      const { library: lib, files: fileEntries } = await buildLibraryFromFiles(
        files,
        (p) => setProgress(p),
      );
      if (lib.tracks.length === 0) {
        setProgress(null);
        alert("Aucun fichier audio compatible (mp3, wav, flac, aac) dans ce dossier.");
        return;
      }
      resetAnalysis();
      await setLibrary(lib);
      setFiles(fileEntries);
      setProgress({ phase: "done", scanned: lib.tracks.length, total: lib.tracks.length });
      setTimeout(() => {
        setProgress(null);
        navigate({ to: "/workspace" });
        void startAnalysis();
      }, 500);
    } catch (err) {
      console.error(err);
      setProgress(null);
    }
  }

  async function openLast() {
    if (await restoreLast()) navigate({ to: "/workspace" });
  }

  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-between px-6 py-12 bg-background">
      <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm w-full">
        <div
          className="grid h-28 w-28 place-items-center rounded-3xl mb-6"
          style={{ background: "var(--gradient-surface)", boxShadow: "var(--shadow-elegant)" }}
        >
          <img src={logoAsset.url} alt="TempoKey" className="h-20 w-20" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">TempoKey</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Analysez et organisez vos bibliothèques audio.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.flac,.aac,audio/*"
          multiple
          /* @ts-expect-error non-standard but widely supported attributes */
          webkitdirectory=""
          directory=""
          onChange={handleFiles}
          className="hidden"
        />
        <button
          onClick={pickFolder}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold text-[var(--primary-foreground)] transition-transform active:scale-[0.98]"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <FolderPlus className="h-5 w-5" />
          Importer un dossier audio
        </button>
        <button
          onClick={openLast}
          disabled={!hydrated || !lastMeta}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-[var(--surface-elevated)] text-[15px] font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Clock className="h-5 w-5 text-muted-foreground" />
          {hydrated && lastMeta ? `Ouvrir « ${lastMeta.name} »` : "Ouvrir la dernière bibliothèque"}
        </button>
      </div>
      <ImportProgressModal progress={progress} />
    </main>
  );
}