import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Library as LibraryIcon,
  Database,
  Sparkles,
  Type,
  Music2,
  Gauge,
  Info,
  Mail,
  Trash2,
  RotateCw,
  RefreshCw,
  FolderOpen,
  Hammer,
  Check,
  Heart,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useThemeStore } from "@/lib/theme-store";
import { useSettingsStore } from "@/lib/settings-store";
import { useLibraryStore } from "@/lib/library-store";
import { useAnalysisStore } from "@/lib/analysis-store";
import { usePlayerStore } from "@/lib/audio/player-store";
import {
  readCacheStats,
  clearAllCaches,
  pruneOrphanCache,
  formatBytes,
  formatRelativeDate,
  type CacheStats,
} from "@/lib/cache-admin";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Paramètres — TempoKey" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const library = useLibraryStore((s) => s.library);
  const lastMeta = useLibraryStore((s) => s.lastLibraryMeta);
  const hydrateLibrary = useLibraryStore((s) => s.hydrate);

  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const rename = useSettingsStore((s) => s.rename);
  const player = useSettingsStore((s) => s.player);
  const setRename = useSettingsStore((s) => s.setRename);
  const setPlayer = useSettingsStore((s) => s.setPlayer);

  const analysisRunning = useAnalysisStore((s) => s.running);
  const reanalyzeAll = useAnalysisStore((s) => s.reanalyzeAll);

  const playerVolume = usePlayerStore((s) => s.volume);
  const setPlayerVolume = usePlayerStore((s) => s.setVolume);

  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  async function refreshStats() {
    setLoadingStats(true);
    try {
      const s = await readCacheStats();
      setCacheStats(s);
    } finally {
      setLoadingStats(false);
    }
  }

  useEffect(() => {
    hydrateSettings();
    hydrateLibrary();
    void refreshStats();
  }, [hydrateLibrary, hydrateSettings]);

  const lastAnalysis = useMemo(() => {
    if (!library) return null;
    let max: number | null = null;
    for (const t of library.tracks) {
      const at = t.detected?.detectedAt ?? null;
      if (at && (!max || at > max)) max = at;
    }
    return max;
  }, [library]);

  const waveformsGenerated = cacheStats?.waveformCount ?? 0;
  const indexedCount = library?.tracks.length ?? 0;
  const totalBytes = useMemo(() => {
    if (!library) return 0;
    return library.tracks.reduce((acc, t) => acc + (t.size ?? 0), 0);
  }, [library]);

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-card/90 backdrop-blur-md px-2 py-2.5">
        <Link
          to="/workspace"
          aria-label="Retour"
          className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground hover:bg-accent/40 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-[15px] font-semibold tracking-tight">Paramètres</h1>
          <p className="text-[11px] text-muted-foreground">Centre de contrôle TempoKey</p>
        </div>
      </header>

      <div className="px-4 py-5 pb-32 max-w-2xl mx-auto space-y-7 animate-fade-in">
        {/* APPARENCE */}
        <Section title="Apparence" icon={<Sparkles className="h-3.5 w-3.5" />}>
          <Card>
            <div className="px-4 pt-4 pb-2">
              <div className="text-sm font-medium">Thème de l'application</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Le mode système suit automatiquement les réglages de votre appareil.
              </p>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              <ThemeChoice
                label="Clair"
                icon={<Sun className="h-5 w-5" />}
                active={mode === "light"}
                onClick={() => setMode("light")}
              />
              <ThemeChoice
                label="Sombre"
                icon={<Moon className="h-5 w-5" />}
                active={mode === "dark"}
                onClick={() => setMode("dark")}
              />
              <ThemeChoice
                label="Système"
                icon={<Monitor className="h-5 w-5" />}
                active={mode === "system"}
                onClick={() => setMode("system")}
              />
            </div>
          </Card>
        </Section>

        {/* BIBLIOTHÈQUE */}
        <Section title="Bibliothèque" icon={<LibraryIcon className="h-3.5 w-3.5" />}>
          <Card>
            <InfoRow
              label="Bibliothèque active"
              value={library?.name ?? lastMeta?.name ?? "Aucune"}
            />
            <InfoRow
              label="Morceaux"
              value={indexedCount > 0 ? `${indexedCount.toLocaleString("fr-FR")} titres` : "—"}
            />
            <InfoRow
              label="Dernière analyse"
              value={formatRelativeDate(lastAnalysis)}
            />
          </Card>
          <ActionGroup>
            <ActionRow
              icon={<RotateCw className="h-4 w-4" />}
              label="Réanalyser la bibliothèque"
              hint="Relance l'analyse de tous les morceaux (verrous respectés)."
              disabled={!library || analysisRunning}
              onClick={async () => {
                if (!library) return;
                toast.message("Analyse lancée", { description: `${library.tracks.length} morceaux` });
                await reanalyzeAll();
                await refreshStats();
                toast.success("Analyse terminée");
              }}
            />
            <ActionRow
              icon={<RefreshCw className="h-4 w-4" />}
              label="Actualiser la bibliothèque"
              hint="Recharge la bibliothèque depuis le stockage local."
              onClick={async () => {
                await refreshStats();
                toast.success("Bibliothèque actualisée");
              }}
            />
            <ActionRow
              icon={<FolderOpen className="h-4 w-4" />}
              label="Changer de bibliothèque"
              hint="Importer un nouveau dossier audio."
              onClick={() => navigate({ to: "/" })}
            />
          </ActionGroup>
        </Section>

        {/* CACHE */}
        <Section title="Analyse et Cache" icon={<Database className="h-3.5 w-3.5" />}>
          <Card>
            <InfoRow
              label="Analyses en cache"
              value={loadingStats ? "…" : (cacheStats?.analysisCount ?? 0).toLocaleString("fr-FR")}
            />
            <InfoRow
              label="Waveforms en cache"
              value={loadingStats ? "…" : (cacheStats?.waveformCount ?? 0).toLocaleString("fr-FR")}
            />
            <InfoRow
              label="Taille totale (estimation)"
              value={loadingStats ? "…" : formatBytes(cacheStats?.estimatedBytes ?? null)}
            />
            <InfoRow
              label="Dernière mise à jour"
              value={formatRelativeDate(cacheStats?.lastUpdated ?? null)}
            />
          </Card>
          <ActionGroup>
            <ActionRow
              icon={<Hammer className="h-4 w-4" />}
              label="Reconstruire le cache"
              hint="Vide puis relance l'analyse complète."
              disabled={!library || analysisRunning}
              tone="primary"
              onClick={async () => {
                if (!library) return;
                await clearAllCaches();
                await refreshStats();
                toast.message("Cache reconstruit", { description: "Analyse en cours…" });
                await reanalyzeAll();
                await refreshStats();
                toast.success("Reconstruction terminée");
              }}
            />
            <ActionRow
              icon={<RefreshCw className="h-4 w-4" />}
              label="Nettoyer les données inutilisées"
              hint="Supprime les entrées qui ne correspondent à aucun morceau actif."
              onClick={async () => {
                const { removed } = await pruneOrphanCache();
                await refreshStats();
                toast.success(`${removed} entrée${removed > 1 ? "s" : ""} nettoyée${removed > 1 ? "s" : ""}`);
              }}
            />
            <ActionRow
              icon={<Trash2 className="h-4 w-4" />}
              label="Vider entièrement le cache"
              hint="Supprime toutes les analyses et waveforms en local."
              tone="danger"
              onClick={async () => {
                await clearAllCaches();
                await refreshStats();
                toast.success("Cache vidé");
              }}
            />
          </ActionGroup>
        </Section>

        {/* RENOMMAGE */}
        <Section title="Renommage" icon={<Type className="h-3.5 w-3.5" />}>
          <Card>
            <ToggleRow
              label="Nettoyer automatiquement les préfixes"
              hint="Supprime les anciens numéros, BPM ou Camelot avant renommage."
              checked={rename.cleanPrefixes}
              onChange={(v) => setRename({ cleanPrefixes: v })}
            />
            <ToggleRow
              label="Conserver une sauvegarde pour annulation"
              hint="Enregistre l'historique de renommage pour revenir en arrière."
              checked={rename.keepBackup}
              onChange={(v) => setRename({ keepBackup: v })}
            />
            <ToggleRow
              label="Détecter les conflits avant renommage"
              hint="Vérifie les doublons de noms et d'emplacements en amont."
              checked={rename.detectConflicts}
              onChange={(v) => setRename({ detectConflicts: v })}
            />
          </Card>
        </Section>

        {/* LECTEUR */}
        <Section title="Lecteur" icon={<Music2 className="h-3.5 w-3.5" />}>
          <Card>
            <div className="px-4 py-3.5 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Volume par défaut</div>
                  <div className="text-xs text-muted-foreground">
                    Niveau appliqué à l'ouverture d'un morceau.
                  </div>
                </div>
                <div className="text-sm tabular-nums text-muted-foreground w-10 text-right">
                  {Math.round(player.defaultVolume * 100)}%
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(player.defaultVolume * 100)}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  setPlayer({ defaultVolume: v });
                  // Apply immediately to current playback context.
                  setPlayerVolume(v);
                }}
                className="mt-3 w-full accent-[var(--primary)]"
                aria-label="Volume par défaut"
              />
              <div className="mt-1 text-[11px] text-muted-foreground">
                Volume actif&nbsp;: {Math.round(playerVolume * 100)}%
              </div>
            </div>
            <ToggleRow
              label="Préchargement des waveforms"
              hint="Génère les formes d'onde en arrière-plan pour une pré-écoute instantanée."
              checked={player.preloadWaveforms}
              onChange={(v) => setPlayer({ preloadWaveforms: v })}
            />
            <ToggleRow
              label="Lecture automatique"
              hint="Démarre la lecture dès qu'un morceau est sélectionné."
              checked={player.autoplay}
              onChange={(v) => setPlayer({ autoplay: v })}
            />
          </Card>
        </Section>

        {/* PERFORMANCE */}
        <Section title="Performance" icon={<Gauge className="h-3.5 w-3.5" />}>
          <Card>
            <InfoRow
              label="Morceaux indexés"
              value={indexedCount.toLocaleString("fr-FR")}
            />
            <InfoRow
              label="Taille de la bibliothèque"
              value={formatBytes(totalBytes || null)}
            />
            <InfoRow
              label="Waveforms générées"
              value={waveformsGenerated.toLocaleString("fr-FR")}
            />
          </Card>
          <p className="px-1 pt-2 text-[11px] text-muted-foreground">
            Informations en lecture seule.
          </p>
        </Section>

        {/* À PROPOS */}
        <Section title="À propos" icon={<Info className="h-3.5 w-3.5" />}>
          <Card>
            <div className="p-5 flex items-center gap-4">
              <div
                className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Music2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold tracking-tight">TempoKey</div>
                <div className="text-xs text-muted-foreground leading-snug">
                  Outil d'analyse musicale et d'organisation DJ.
                </div>
              </div>
            </div>
            <div className="px-5 pb-4 grid gap-2 text-sm">
              <Field label="Créé par" value="DJ LAMBO Premier" />
              <Field
                label="Contact"
                value={
                  <a
                    href="mailto:djlambopremierofficiel@gmail.com"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    djlambopremierofficiel@gmail.com
                  </a>
                }
              />
            </div>
          </Card>
          <Card>
            <details className="group">
              <summary className="list-none cursor-pointer flex items-center gap-3 px-4 py-3.5 hover:bg-accent/30 transition-colors">
                <Heart className="h-4 w-4 text-[var(--accent)]" />
                <span className="flex-1 text-sm font-medium">Remerciements</span>
                <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/60 pt-3">
                Merci aux DJs et producteurs qui ont testé TempoKey et partagé leurs retours, ainsi qu'aux mainteneurs des bibliothèques open source qui rendent cet outil possible.
              </div>
            </details>
            <details className="group border-t border-border/60">
              <summary className="list-none cursor-pointer flex items-center gap-3 px-4 py-3.5 hover:bg-accent/30 transition-colors">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">Licences open source</span>
                <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <ul className="px-4 pb-4 pt-3 text-xs text-muted-foreground space-y-1.5 border-t border-border/60">
                <li>React, TanStack Start &amp; Router — MIT</li>
                <li>Tailwind CSS — MIT</li>
                <li>Zustand, idb-keyval — MIT</li>
                <li>Lucide Icons — ISC</li>
                <li>Sonner — MIT</li>
              </ul>
            </details>
          </Card>
        </Section>
      </div>
    </div>
  );
}

/* ---------------- UI primitives ---------------- */

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2 animate-fade-in">
      <h2 className="px-1 flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-muted-foreground">
        {icon}
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-border bg-card"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}

function ActionGroup({ children }: { children: React.ReactNode }) {
  return <Card>{children}</Card>;
}

function ThemeChoice({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all press min-h-[88px] ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-foreground"
          : "border-border bg-[var(--surface)]/40 hover:bg-accent/30 text-muted-foreground"
      }`}
    >
      <span className={active ? "text-[var(--primary-glow)]" : ""}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
      {active && (
        <span className="absolute top-1.5 right-1.5 grid h-4 w-4 place-items-center rounded-full bg-[var(--primary)] text-primary-foreground">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-border/60 last:border-b-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground text-right truncate tabular-nums">
        {value}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  onClick,
  disabled,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  tone?: "default" | "primary" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--destructive)]"
      : tone === "primary"
        ? "text-[var(--primary-glow)]"
        : "text-foreground";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-start gap-3 px-4 py-3.5 text-left border-b border-border/60 last:border-b-0 hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors press"
    >
      <span
        className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-elevated)] ${toneClass}`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-medium ${toneClass}`}>{label}</span>
        {hint && (
          <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>
        )}
      </span>
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border/60 last:border-b-0 hover:bg-accent/30 transition-colors"
    >
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint && (
          <span className="block text-xs text-muted-foreground mt-0.5">{hint}</span>
        )}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[var(--primary)]" : "bg-[var(--surface-elevated)] border border-border"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

// Suppress unused-import lints in case helpers are not used in every build.
void ThemeMode;
